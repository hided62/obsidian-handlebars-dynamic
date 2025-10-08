import type ObsidianHandlebars from "main";
import type { TFile } from "obsidian";
import { parseHBFrontmatter } from "./util";
import { resolveTFile } from "./codeBlockProcessor";
import { i18n } from "i18n";

type importParamValue = string | importParamArray | importParamMap;
interface importParamMap {
    [key: string]: importParamValue;
}

interface importParamArray extends Array<importParamValue> { }

export type importParamType = importParamValue;

export async function importParams(params: importParamType, plugin: ObsidianHandlebars, buildCache: Map<string, Promise<Record<string, unknown>>>): Promise<Record<string, unknown>> {
    if (typeof params === 'string') {
        const cacheResult = buildCache.get(params);
        if (cacheResult) {
            return cacheResult;
        }

        const waiter = (async () => {
            const importFile = resolveTFile(plugin, params, false);
            if (!importFile) {
                throw new Error(`${i18n('importParamsFileNotFound')}: ${params}`);
            }

            const result = await loadOnlyYaml(importFile, plugin);
            const subImportParams = result.importParams;
            if (subImportParams && (typeof subImportParams === 'string' || Array.isArray(subImportParams) || typeof subImportParams == 'object')) {
                const subResult = await importParams(subImportParams as importParamType, plugin, buildCache);
                Object.assign(result, subResult);
                delete result.importParams;
            }
            return result;
        })();

        buildCache.set(params, waiter);
        return waiter;
    }

    if (Array.isArray(params)) {
        const result: Record<string, unknown> = {};
        const waiter = params.map(p => importParams(p, plugin, buildCache));
        for (const p of waiter.values()) {
            Object.assign(result, await p);
        }
        return result;
    }

    //object
    const result: Record<string, unknown> = {};
    const waiter = Object.entries(params).map(
        ([key, p]) => [key, importParams(p, plugin, buildCache)] as [string, Promise<Record<string, unknown>>]
    );
    for (const [key, itemP] of waiter.values()) {
        result[key] = await itemP;
    }

    return result;
}

export async function loadOnlyYaml(target: TFile, plugin: ObsidianHandlebars): Promise<Record<string, unknown>> {
    if (target.extension !== 'md') {
        throw new Error(`Invalid file extension: ${target.extension}`);
    }

    const rawContent = await plugin.app.vault.cachedRead(target);
    const { frontmatter } = parseHBFrontmatter(rawContent);
    return frontmatter;
}