import { type MarkdownPostProcessorContext, TFile, parseYaml, MarkdownRenderer, MarkdownRenderChild } from 'obsidian';
import ObsidianHandlebars, { hbIDKey, hbParentTplKey, type WatcherItem } from 'main';
import { HbRenderChild } from 'markdownRenderChild';
import { quoteattr } from '../util';
import { getHandlebars } from './instance';
import { failureCalloutBox, parseHBFrontmatter } from './util';
import { importParams } from './importParams';
import { i18n } from 'i18n';
import { debugLog } from 'logger';

const handlebars = getHandlebars();


export type TemplateParams = {
    tpl: string;
    option?: TemplateOption;
    [key: string]: unknown;
}

type TemplateOption = {
    noExportContext?: boolean;
    useFrontmatterParams?: boolean;
    showSource?: boolean | number;
}

export type tplFrontmatter = {
    importParams?: Record<string, string>;
    prefix?: string;
    [key: string]: unknown;
}

export function joinPath(...parts: string[]): string {
    const path = [];
    for (const part of parts) {
        for (const dir of part.split('/')) {
            if (dir == '.') {
                continue;
            }

            if (dir == '..') {
                path.pop();
                continue;
            }

            path.push(dir);
        }
    }
    return path.join('/');
}

export function resolveTFile(plugin: ObsidianHandlebars, path: string, isTpl: boolean, sourcePath?: string): TFile | null {
    const vault = plugin.app.vault;
    if (!path.endsWith('.md')) {
        path += '.md';
    }
    let tplFile = vault.getAbstractFileByPath(path);

    if (!tplFile && sourcePath) {
        const basePath = sourcePath.split('/');
        basePath.pop();
        while (basePath.length > 0) {
            const nextPath = joinPath(basePath.join('/'), path);
            tplFile = vault.getAbstractFileByPath(nextPath);
            if (tplFile && tplFile instanceof TFile) {
                return tplFile;
            }
            basePath.pop();
        }
    }
    if (!tplFile) {
        path = joinPath(isTpl ? plugin.settings.templateFolder : plugin.settings.constantFolder, path);
        tplFile = vault.getAbstractFileByPath(path);
    }

    if (!tplFile) {
        console.error('Template file not found', path);
        return null;
    }

    if (!(tplFile instanceof TFile)) {
        console.error('Template file is not a file', path);
        return null;
    }

    return tplFile;
}

export function resolveCandidatePaths(plugin: ObsidianHandlebars, path: string, isTpl: boolean, sourcePath?: string): string[] {
    const candidates: string[] = [];
    let targetPath = path;
    if (!targetPath.endsWith('.md')) {
        targetPath += '.md';
    }

    candidates.push(targetPath);

    if (sourcePath) {
        const basePath = sourcePath.split('/');
        basePath.pop();
        while (basePath.length > 0) {
            const nextPath = joinPath(basePath.join('/'), targetPath);
            candidates.push(nextPath);
            basePath.pop();
        }
    }

    const folder = isTpl ? plugin.settings.templateFolder : plugin.settings.constantFolder;
    candidates.push(joinPath(folder, targetPath));

    return Array.from(new Set(candidates));
}

export async function codeBlockProcessor(
    this: ObsidianHandlebars,
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
): Promise<void> {
    const renderError = (markdown: string, missingTplPaths?: string[]) => {
        const errorChild = new HbRenderChild(this, el, ctx.sourcePath);
        if (missingTplPaths) {
            for (const missingPath of missingTplPaths) {
                errorChild.addMissingTplPath(missingPath);
            }
        }
        ctx.addChild(errorChild);
        return MarkdownRenderer.render(this.app, markdown, el, ctx.sourcePath, errorChild);
    };

    let rawParams: TemplateParams;
    try {
        rawParams = parseYaml(source.replace(/\t/g, '    '));
    }
    catch (_e: unknown) {
        const e = _e as Error;
        console.error('YAML parse error', e);
        return renderError(failureCalloutBox(i18n('yamlParseError'), quoteattr(e.message)));
    }

    const params = {
        ...rawParams
    };

    if (!params.tpl) {
        return renderError(failureCalloutBox(i18n('noTplValue')));
    }

    const tplPath = params.tpl;
    const parentEl = el.parentElement?.closest(`[${hbParentTplKey}]`) as HTMLElement | null;
    const parentTplPath = parentEl?.getAttr?.(hbParentTplKey) ?? parentEl?.getAttribute(hbParentTplKey) ?? null;
    const tplFile = resolveTFile(this, tplPath, true, ctx.sourcePath);

    if (!tplFile) {
        console.error('Template file not found', params.tpl);
        const missingTplPaths = resolveCandidatePaths(this, tplPath, true, ctx.sourcePath);
        if (parentTplPath) {
            for (const missingPath of missingTplPaths) {
                this.addTplDependency(parentTplPath, missingPath);
            }
        }
        return renderError(failureCalloutBox(i18n('noTplExists'), quoteattr(params.tpl)), missingTplPaths);
    }

    if (!(tplFile instanceof TFile)) {
        return renderError(failureCalloutBox(i18n('invalidTplFileType'), quoteattr(params.tpl)));
    }

    if (parentTplPath) {
        this.addTplDependency(parentTplPath, tplFile.path);
    }

    let randomString = el.getAttr(hbIDKey);
    if (!randomString) {
        randomString = Math.random().toString(36).substring(7);
        el.setAttr(hbIDKey, randomString);
    }

    const renderChild = new HbRenderChild(this, el, ctx.sourcePath, tplFile.path, randomString);
    ctx.addChild(renderChild);
    const renderContext = renderChild.addChild(new MarkdownRenderChild(el));
    debugLog('codeblock:render', { tplPath: tplFile.path, sourcePath: ctx.sourcePath, parentTplPath, targetId: randomString });

    let docCache = this.docCache.get(ctx.sourcePath);
    if (docCache && docCache.until < Date.now()) {
        this.docCache.delete(ctx.sourcePath);
        docCache = undefined;
    }

    if (!docCache) {
        docCache = {
            until: Date.now() + 1000,
            sourcePath: ctx.sourcePath,
            tplCache: new Map(),
            constCache: new Map(),
        };
        this.docCache.set(ctx.sourcePath, docCache);
    }

    const rawContent = await (async () => {
        const cachedResult = docCache!.tplCache.get(tplFile.path);
        if (cachedResult) {
            return cachedResult;
        }
        const waiter = this.app.vault.cachedRead(tplFile);
        docCache!.tplCache.set(tplFile.path, waiter);
        return await waiter;
    })();

    const { content, frontmatter } = parseHBFrontmatter(rawContent);

    if (frontmatter.importParams) {
        try {
            const moreParams = await importParams(frontmatter.importParams, this, docCache.constCache);

            if (Array.isArray(moreParams) || typeof moreParams !== 'object') {
                throw new Error(i18n('importParamsResultIsNotObject'));
            }

            for (const [key, value] of Object.entries(moreParams)) {
                params[key] = value;
            }
        }
        catch (e) {
            console.error('Import params error', e);
            if (e instanceof Error) {
                MarkdownRenderer.render(this.app, failureCalloutBox(i18n('invalidImportParamsValue'), quoteattr(e.message)), el, ctx.sourcePath, renderChild);
            }
            else {
                MarkdownRenderer.render(this.app, failureCalloutBox(i18n('invalidImportParamsValue'), quoteattr(String(e))), el, ctx.sourcePath, renderChild);
            }
            return;
        }
    }

    let errString: [string, string] | [string] | undefined;

    let result: string = '';

    let paramCnt = Object.keys(params).length - 1;
    if ('option' in params) {
        paramCnt--;
    }


    if (paramCnt < 1) {
        errString = [i18n('noData')];
    }
    else {
        const mergedParams: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(frontmatter)) {
            mergedParams[key] = value;
        }

        for (const [key, value] of Object.entries(params)) {
            mergedParams[key] = value;
        }

        try {
            result = handlebars.compile(content)(mergedParams);

            if (frontmatter.prefix) {
                const prefix = frontmatter.prefix;
                result = result.split('\n').map(text => prefix + text).join('\n');
            }

            if (params.option?.showSource) {
                const fenceLevel = typeof params.option.showSource === 'number' ? Math.max(4, params.option.showSource) : 5;
                const fenceText = '`'.repeat(fenceLevel);
                result = `${fenceText}\n${result}\n${fenceText}`;
            }
        }
        catch (_e: unknown) {
            const e = _e as Error;
            console.error('Handlebars compile error', e);
            errString = [i18n('templateCompileError'), quoteattr(e.message)];
        }
    }


    // Mark the container so nested templates can find their parent without blocking Markdown parsing.
    el.setAttr(hbParentTplKey, tplFile.path);

    let renderP: Promise<void>;
    if (errString) {
        MarkdownRenderer.render(this.app, failureCalloutBox(errString[0], errString[1]), el, ctx.sourcePath, renderContext);
        renderP = Promise.resolve();
    }
    else {
        renderP = MarkdownRenderer.render(this.app, result, el, ctx.sourcePath, renderContext);
    }

    const watcherItem = (() => {
        const existing = this.watcher.get(tplFile.path);
        if (existing) {
            existing.rawContent = rawContent;
            existing.content = content;
            existing.frontmatter = frontmatter;
            return existing;
        }
        const item: WatcherItem = {
            rawContent,
            content,
            frontmatter,
            targets: new Map(),
        };
        this.watcher.set(tplFile.path, item);
        return item;
    })();

    watcherItem.targets.set(randomString, {
        el,
        tplData: rawParams,
        sourcePath: ctx.sourcePath,
        renderChild,
        renderContext,
    });

    return renderP;
}
