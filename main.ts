import { App, Editor, FileView, MarkdownRenderer, MarkdownView, Plugin, PluginSettingTab, Setting, TFile, type PluginManifest, Notice } from 'obsidian';
import { codeBlockProcessor, type TemplateParams } from 'handlebars/codeBlockProcessor';
import { getHandlebars, resetHbEnv } from 'handlebars/instance';
import { parseHBFrontmatter } from 'handlebars/util';
import { importParams } from 'handlebars/importParams';
import { i18n, langMap, setLanguage } from 'i18n';

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
		const lang = window.localStorage.getItem('language');
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
			id: 'handlebars-add-template',
			name: i18n('addHandlebarsTemplate'),
			editorCallback: (editor: Editor, view) => {
				editor.replaceSelection(i18n('defaultTemplate'));
			}
		});

		this.addCommand({
			id: 'handlebars-ext-rebuild-page',
			name: i18n('rebuildPage'),
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) {
					return;
				}

				view.previewMode.rerender(true);
				this.app.workspace.updateOptions();

				new Notice(i18n('rebuildPage'));
			}
		});
		this.addCommand({
			id: 'handlebars-ext-rebuild-template',
			name: i18n('rebuildTemplate'),
			callback: async () => {
				for (const [key, value] of this.watcher.entries()) {
					console.log('rebuild', key);
					await this.onTplChanged(key, value, true);
				}

				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) {
					return;
				}

				view.previewMode.rerender(true);
				this.app.workspace.updateOptions();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor(
			'hb',
			codeBlockProcessor.bind(this)
		);

		this.registerEvent(this.app.vault.on('modify', async (file) => {
			if (!(file instanceof TFile)) {
				return;
			}

			const path = file.path;
			if (!path.endsWith('.md')) {
				return;
			}

			const tplWatcher = this.watcher.get(path);
			if (tplWatcher) {
				this.onTplChanged(path, tplWatcher);
			}
		}));

		this.registerEvent(this.app.vault.on('create', async (file) => {
			if (!(file instanceof TFile)) {
				return;
			}

			const path = file.path;
			if (!path.endsWith('.md')) {
				return;
			}

			const tplWatcher = this.watcher.get(path);
			if (tplWatcher) {
				this.onTplChanged(path, tplWatcher);
			}
		}));

		this.registerInterval(window.setInterval(() => {
			this.tryFlushWatcher();
		}, 60000)); //1분마다 watcher 정리
	}

	async onTplChanged(tplPath: string, item: WatcherItem, force?: boolean) {

		const tplFile = this.app.vault.getAbstractFileByPath(tplPath);
		if (!tplFile || !(tplFile instanceof TFile)) {
			this.watcher.delete(tplPath);
			return;
		}

		const rawContent = await this.app.vault.cachedRead(tplFile);
		if (rawContent == item.rawContent && !force) {
			return;
		}

		console.log('onTplChanged', tplPath);

		const { content, frontmatter } = parseHBFrontmatter(rawContent);
		item.content = content;
		item.rawContent = rawContent;
		item.frontmatter = frontmatter;

		if (frontmatter.importParams) {
			try {
				const cache = new Map<string, Promise<Record<string, unknown>>>();
				const moreParams = await importParams(frontmatter.importParams, this, cache);
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
		for (const [key, target] of item.targets) {
			const hbID = target.el.getAttr(hbIDKey);
			if (hbID != key) {
				item.targets.delete(key);
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
			waiters.push(MarkdownRenderer.render(this.app, markdown, target.el, target.sourcePath, this));
		}
		await Promise.all(waiters);
	}

	tryFlushWatcher() {
		const loadedFiles = new Set<string>();
		this.app.workspace.iterateAllLeaves((leaf) => {
			const view = leaf.view;
			if (!(view instanceof FileView)) {
				return;
			}
			if (!(view.file instanceof TFile)) {
				return;
			}
			const filePath = view.file.path;
			if (!filePath.endsWith('.md')) {
				return;
			}

			loadedFiles.add(filePath);
		});

		for (const [path, item] of this.watcher) {
			for (const [key, target] of item.targets) {
				if (loadedFiles.has(target.sourcePath)) {
					continue;
				}
				item.targets.delete(key);
			}
			if (item.targets.size == 0) {
				this.watcher.delete(path);
			}
		}
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
			.addText(text => text
				.setPlaceholder(i18n('templateFolderPlaceholder'))
				.setValue(this.plugin.settings.templateFolder)
				.onChange(async (value) => {
					this.plugin.settings.templateFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(i18n('constantFolder'))
			.setDesc(i18n('constantFolderDesc'))
			.addText(text => text
				.setPlaceholder(i18n('constantFolderPlaceholder'))
				.setValue(this.plugin.settings.constantFolder)
				.onChange(async (value) => {
					this.plugin.settings.constantFolder = value;
					await this.plugin.saveSettings();
				}));

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
