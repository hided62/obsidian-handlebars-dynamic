import { MarkdownRenderChild, TAbstractFile, TFile } from 'obsidian';
import type ObsidianHandlebars from 'main';

export class HbRenderChild extends MarkdownRenderChild {
	private plugin: ObsidianHandlebars;
	private sourcePath: string;
	private tplPath?: string;
	private targetId?: string;

	constructor(
		plugin: ObsidianHandlebars,
		containerEl: HTMLElement,
		sourcePath: string,
		tplPath?: string,
		targetId?: string
	) {
		super(containerEl);
		this.plugin = plugin;
		this.sourcePath = sourcePath;
		this.tplPath = tplPath;
		this.targetId = targetId;
	}

	getSourcePath(): string {
		return this.sourcePath;
	}

	getTargetId(): string | undefined {
		return this.targetId;
	}

	override onload() {
		if (!this.tplPath || !this.targetId) {
			return;
		}

		const onChange = async (file: TAbstractFile) => {
			if (!(file instanceof TFile)) {
				return;
			}

			if (file.path !== this.tplPath) {
				return;
			}

			const tplWatcher = this.plugin.watcher.get(this.tplPath);
			if (!tplWatcher) {
				return;
			}

			await this.plugin.onTplChanged(this.tplPath, tplWatcher, false, this.targetId);
		};

		this.registerEvent(this.plugin.app.vault.on('modify', onChange));
		this.registerEvent(this.plugin.app.vault.on('create', onChange));
	}

	override onunload() {
		if (!this.tplPath || !this.targetId) {
			return;
		}

		const tplWatcher = this.plugin.watcher.get(this.tplPath);
		if (!tplWatcher) {
			return;
		}

		tplWatcher.targets.delete(this.targetId);
		if (tplWatcher.targets.size === 0) {
			this.plugin.watcher.delete(this.tplPath);
				this.plugin.removeTplTracking(this.tplPath);
		}
	}
}
