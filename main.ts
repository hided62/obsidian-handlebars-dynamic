import { AbstractInputSuggest, App, Editor, MarkdownRenderer, MarkdownView, Plugin, PluginSettingTab, Setting, TFile, TFolder, type PluginManifest, Notice, getLanguage, normalizePath } from 'obsidian';
import { codeBlockProcessor, type TemplateParams } from 'handlebars/codeBlockProcessor';
import { getHandlebars, resetHbEnv } from 'handlebars/instance';
import { parseHBFrontmatter } from 'handlebars/util';
import { importParams, type importParamType } from 'handlebars/importParams';
import { i18n, langMap, setLanguage } from 'i18n';
import type { HbRenderChild } from 'markdownRenderChild';

const handlebars = getHandlebars();

interface HandlebarSettings {
	templateFolder: string;
	constantFolder: string;
	hbEnv: string;
}

const DEFAULT_SETTINGS: HandlebarSettings = {
	templateFolder: 'Templates',
	constantFolder: 'Constants',
	hbEnv: '{}',
}

export type WatcherItem = {
	targets: Map<string, WatcherTarget>;
	rawContent: string;
	content: string;
	frontmatter: Record<string, unknown>;
}

export type WatcherTarget = {
	tplData: TemplateParams;
	el: HTMLElement;
	sourcePath: string;
	renderChild: HbRenderChild;
}

export const hbIDKey = 'data-hb-id';

type CacheCtxInfo = {
	until: number,
	sourcePath: string,
	tplCache: Map<string, Promise<string>>,
	constCache: Map<string, Promise<Record<string, unknown>>>,
}

export default class ObsidianHandlebars extends Plugin {
	settings!: HandlebarSettings;
	watcher: Map<string, WatcherItem> = new Map();

	docCache: Map<string, CacheCtxInfo> = new Map();

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		const lang = getLanguage();
		setLanguage(lang as keyof typeof langMap);
	}

	resetHbEnv() {
		if (this.settings.hbEnv) {
			try {
				const env = JSON.parse(this.settings.hbEnv);
				if (typeof env !== 'object') {
					throw new Error('env is not object');
				}
				const newEnv: Record<string, string | number> = {};
				for (const [key, _value] of Object.entries(env)) {
					let value: string | number;
					if (_value === null || _value === undefined || _value === false) {
						value = 0;
					}
					else if (_value === true) {
						value = 1;
					}
					else if (typeof _value === 'string' || typeof _value === 'number') {
						value = _value;
					}
					else {
						throw new Error(`Invalid hbEnvKeyValue[${key}]: ${_value}`);
					}

					newEnv[key] = value;
					resetHbEnv(newEnv);
				}
			}
			catch (e) {
				console.error('Invalid hbEnv', e);
			}
		}
	}

	override async onload() {
		await this.loadSettings();
		this.watcher = new Map();
		this.resetHbEnv();


		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'add-template',
			name: i18n('addHandlebarsTemplate'),
			editorCallback: (editor: Editor, view) => {
				editor.replaceSelection(i18n('defaultTemplate'));
			}
		});

		this.addCommand({
			id: 'rebuild-page',
			name: i18n('rebuildPage'),
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) {
					return false;
				}

				if (checking) {
					return true;
				}

				view.previewMode.rerender(true);
				this.app.workspace.updateOptions();

				new Notice(i18n('rebuildPage'));
				return true;
			},
		});
		this.addCommand({
			id: 'rebuild-template',
			name: i18n('rebuildTemplate'),
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) {
					return false;
				}

				if (checking) {
					return true;
				}

				void (async () => {
					for (const [key, value] of this.watcher.entries()) {
						await this.onTplChanged(key, value, true);
					}

					view.previewMode.rerender(true);
					this.app.workspace.updateOptions();
				})();
				return true;
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor(
			'hb',
			codeBlockProcessor.bind(this)
		);

	}

	async onTplChanged(tplPath: string, item?: WatcherItem, force?: boolean, targetId?: string) {
		const watcherItem = item ?? this.watcher.get(tplPath);
		if (!watcherItem) {
			return;
		}

		const tplFile = this.app.vault.getAbstractFileByPath(tplPath);
		if (!tplFile || !(tplFile instanceof TFile)) {
			this.watcher.delete(tplPath);
			return;
		}

		const rawContent = await this.app.vault.cachedRead(tplFile);
		const shouldRefresh = rawContent !== watcherItem.rawContent || force;

		if (shouldRefresh) {
			const { content, frontmatter } = parseHBFrontmatter(rawContent);
			watcherItem.content = content;
			watcherItem.rawContent = rawContent;
			watcherItem.frontmatter = frontmatter;
		}

		const content = watcherItem.content;
		const frontmatter = watcherItem.frontmatter;

		if (frontmatter.importParams && shouldRefresh) {
			try {
				const cache = new Map<string, Promise<Record<string, unknown>>>();
				const moreParams = await importParams(frontmatter.importParams as importParamType, this, cache);
				if (Array.isArray(moreParams) || typeof moreParams !== 'object') {
					throw new Error(i18n('importParamsResultIsNotObject'));
				}
				for (const [key, value] of Object.entries(moreParams)) {
					frontmatter[key] = value;
				}
			}
			catch (e) {
				console.error('Import params error', e);
				return;
			}
		}

		let tpl: HandlebarsTemplateDelegate;
		try {
			tpl = handlebars.compile(content);
		}
		catch (e) {
			console.error('Template compile error', tplPath, e);
			return;
		}

		const waiters: Promise<void>[] = [];
		const targetEntries = targetId
			? (() => {
				const target = watcherItem.targets.get(targetId);
				return target ? [[targetId, target]] as Array<[string, WatcherTarget]> : [];
			})()
			: Array.from(watcherItem.targets.entries());

		if (targetEntries.length === 0) {
			return;
		}

		for (const [key, target] of targetEntries) {
			const hbID = target.el.getAttr(hbIDKey);
			if (hbID != key) {
				watcherItem.targets.delete(key);
				return;
			}

			const mergedParams: Record<string, unknown> = {};

			for (const [key, value] of Object.entries(frontmatter)) {
				mergedParams[key] = value;
			}

			for (const [key, value] of Object.entries(target.tplData)) {
				mergedParams[key] = value;
			}

			let markdown = tpl(mergedParams);

			if (frontmatter.prefix) {
				const prefix = frontmatter.prefix;
				markdown = markdown.split('\n').map(text => prefix + text).join('\n');
			}

			if (target.tplData.option?.showSource) {
				const fenceLevel = typeof target.tplData.option.showSource === 'number' ? Math.max(4, target.tplData.option.showSource) : 5;
				const fenceText = '`'.repeat(fenceLevel);
				markdown = `${fenceText}\n${markdown}\n${fenceText}`;
			}

			target.el.setText('');
			waiters.push(MarkdownRenderer.render(this.app, markdown, target.el, target.sourcePath, target.renderChild));
		}
		await Promise.all(waiters);
	}

	override onunload() {
		this.watcher.clear();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.resetHbEnv();
	}
}

/*
When "Add Template" is clicked, selecting a template from the template folder could insert a sample input for that template.
class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
*/

class FolderSuggest extends AbstractInputSuggest<TFolder> {
	private inputEl: HTMLInputElement;

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
		this.inputEl = inputEl;
	}

	override getSuggestions(query: string): TFolder[] {
		const lower = query.toLowerCase();
		return this.app.vault
			.getAllLoadedFiles()
			.filter((file): file is TFolder => file instanceof TFolder)
			.filter((folder) => folder.path.toLowerCase().includes(lower));
	}

	override renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}

	override selectSuggestion(folder: TFolder): void {
		this.inputEl.value = folder.path;
		this.inputEl.dispatchEvent(new Event('input'));
		this.close();
	}
}

class SettingTab extends PluginSettingTab {
	plugin: ObsidianHandlebars;

	constructor(app: App, plugin: ObsidianHandlebars) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName(i18n('templateFolder'))
			.setDesc(i18n('templateFolderDesc'))
			.addText(text => {
				new FolderSuggest(this.app, text.inputEl);
				return text
					.setPlaceholder(i18n('templateFolderPlaceholder'))
					.setValue(this.plugin.settings.templateFolder)
					.onChange(async (value) => {
						this.plugin.settings.templateFolder = normalizePath(value);
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName(i18n('constantFolder'))
			.setDesc(i18n('constantFolderDesc'))
			.addText(text => {
				new FolderSuggest(this.app, text.inputEl);
				return text
					.setPlaceholder(i18n('constantFolderPlaceholder'))
					.setValue(this.plugin.settings.constantFolder)
					.onChange(async (value) => {
						this.plugin.settings.constantFolder = normalizePath(value);
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName(i18n('hbEnv'))
			.setDesc(i18n('hbEnvDesc'))
			.addTextArea(text => text
				.setValue(this.plugin.settings.hbEnv)
				.onChange(async (value) => {
					const rawJson = JSON.parse(value);
					if (typeof rawJson !== 'object') {
						throw new Error('Invalid JSON: Not object type');
					}
					this.plugin.settings.hbEnv = value;
					await this.plugin.saveSettings();
				}));
	}
}
