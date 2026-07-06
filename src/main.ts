import { ItemView, Plugin, PluginSettingTab, Setting, TFile, type WorkspaceLeaf } from 'obsidian';

interface CapacityTasksSettings {
	dailyNoteFolder: string;
	capacityProperty: string;
	costField: string;
	budgets: number[]; // points per capacity level 1..5
	warnRatio: number;
}

const DEFAULT_SETTINGS: CapacityTasksSettings = {
	dailyNoteFolder: 'Daily',
	capacityProperty: 'capacity',
	costField: 'cost',
	budgets: [2, 4, 6, 8, 10],
	warnRatio: 0.7,
};

const VIEW_TYPE = 'capacity-tasks-view';

interface FoundTask {
	file: TFile;
	line: number;
	text: string;
	cost: number;
}

function localISODate(): string {
	const d = new Date();
	const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
	return local.toISOString().slice(0, 10);
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default class CapacityTasksPlugin extends Plugin {
	settings: CapacityTasksSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(VIEW_TYPE, (leaf) => new CapacityTasksView(leaf, this));

		this.addRibbonIcon('gauge', 'Capacity Tasks: today within budget', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-view',
			name: "Show tasks within today's budget",
			callback: () => void this.activateView(),
		});

		this.addSettingTab(new CapacityTasksSettingTab(this));
	}

	async activateView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE);
		if (existing.length > 0) {
			await this.app.workspace.revealLeaf(existing[0]);
			return;
		}
		const leaf = this.app.workspace.getRightLeaf(false);
		if (!leaf) return;
		await leaf.setViewState({ type: VIEW_TYPE, active: true });
		await this.app.workspace.revealLeaf(leaf);
	}

	todayCapacity(): number | null {
		const path = `${this.settings.dailyNoteFolder}/${localISODate()}.md`;
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return null;
		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
		const raw = fm?.[this.settings.capacityProperty];
		const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
		if (!Number.isFinite(n) || n < 1 || n > 5) return null;
		return n;
	}

	budgetFor(capacity: number): number {
		return this.settings.budgets[capacity - 1] ?? 0;
	}

	async collectTasks(): Promise<FoundTask[]> {
		const costRe = new RegExp(
			`\\[${escapeRegExp(this.settings.costField)}::\\s*(\\d+(?:\\.\\d+)?)\\]`,
		);
		const taskRe = /^\s*[-*] \[ \] (.*)$/;
		const out: FoundTask[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			let content: string;
			try {
				content = await this.app.vault.cachedRead(file);
			} catch {
				continue;
			}
			const lines = content.split('\n');
			for (let i = 0; i < lines.length; i++) {
				const task = lines[i].match(taskRe);
				if (!task) continue;
				const cost = lines[i].match(costRe);
				if (!cost) continue;
				out.push({
					file,
					line: i,
					text: task[1].replace(costRe, '').trim(),
					cost: Number.parseFloat(cost[1]),
				});
			}
		}
		out.sort((a, b) => a.cost - b.cost);
		return out;
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}

class CapacityTasksView extends ItemView {
	private plugin: CapacityTasksPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: CapacityTasksPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Capacity Tasks';
	}

	getIcon(): string {
		return 'gauge';
	}

	async onOpen(): Promise<void> {
		await this.render();
	}

	async render(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass('capacity-tasks-view');

		const header = root.createDiv({ cls: 'capacity-tasks-header' });
		const refresh = header.createEl('button', { text: 'Refresh' });
		refresh.addEventListener('click', () => void this.render());

		const capacity = this.plugin.todayCapacity();
		if (capacity === null) {
			root.createEl('p', {
				text:
					`No capacity found for today. Add "${this.plugin.settings.capacityProperty}: 1-5" ` +
					`to the frontmatter of ${this.plugin.settings.dailyNoteFolder}/${localISODate()}.md.`,
			});
			return;
		}

		const budget = this.plugin.budgetFor(capacity);
		const guide = Math.round(budget * this.plugin.settings.warnRatio * 10) / 10;
		header.createEl('div', {
			text: `Capacity ${capacity} of 5. Budget: ${budget} points. Comfort line: ${guide}.`,
		});

		const tasks = await this.plugin.collectTasks();
		if (tasks.length === 0) {
			root.createEl('p', {
				text: `No open tasks with a [${this.plugin.settings.costField}::N] field found.`,
			});
			return;
		}

		const within = tasks.filter((t) => t.cost <= budget);
		const over = tasks.filter((t) => t.cost > budget);

		const list = root.createEl('ul', { cls: 'capacity-tasks-list' });
		let running = 0;
		let guideDrawn = false;
		for (const t of within) {
			running += t.cost;
			if (!guideDrawn && running > guide) {
				list.createEl('li', {
					cls: 'capacity-tasks-guide',
					text: `--- comfort line (${guide} points) ---`,
				});
				guideDrawn = true;
			}
			const item = list.createEl('li', { cls: 'capacity-tasks-item' });
			item.createSpan({ cls: 'capacity-tasks-cost', text: `${t.cost} ` });
			const link = item.createSpan({ cls: 'capacity-tasks-text', text: t.text });
			link.addEventListener('click', () => {
				void this.app.workspace.openLinkText(t.file.path, '', false);
			});
		}

		if (over.length > 0) {
			root.createEl('p', {
				cls: 'capacity-tasks-over',
				text: `${over.length} task(s) above today's budget are hidden. They are for another day, not a debt.`,
			});
		}
	}
}

class CapacityTasksSettingTab extends PluginSettingTab {
	private plugin: CapacityTasksPlugin;

	constructor(plugin: CapacityTasksPlugin) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Daily note folder')
			.setDesc('Folder with daily notes named YYYY-MM-DD.md.')
			.addText((t) =>
				t.setValue(this.plugin.settings.dailyNoteFolder).onChange(async (v) => {
					this.plugin.settings.dailyNoteFolder = v.replace(/\/+$/, '');
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName('Capacity property')
			.setDesc('Frontmatter key in the daily note holding a 1-5 capacity level.')
			.addText((t) =>
				t.setValue(this.plugin.settings.capacityProperty).onChange(async (v) => {
					this.plugin.settings.capacityProperty = v.trim();
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName('Cost field')
			.setDesc('Inline field name on task lines, e.g. [cost::2].')
			.addText((t) =>
				t.setValue(this.plugin.settings.costField).onChange(async (v) => {
					this.plugin.settings.costField = v.trim();
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName('Budgets per capacity level')
			.setDesc('Five comma-separated point budgets for capacity 1-5.')
			.addText((t) =>
				t.setValue(this.plugin.settings.budgets.join(',')).onChange(async (v) => {
					const parts = v.split(',').map((s) => Number.parseFloat(s.trim()));
					if (parts.length === 5 && parts.every((n) => Number.isFinite(n) && n >= 0)) {
						this.plugin.settings.budgets = parts;
						await this.plugin.saveSettings();
					}
				}),
			);

		new Setting(containerEl)
			.setName('Comfort ratio')
			.setDesc('Fraction of the budget marked as the comfort line. Default 0.7.')
			.addSlider((s) =>
				s
					.setLimits(0.5, 1, 0.05)
					.setValue(this.plugin.settings.warnRatio)
					.setDynamicTooltip()
					.onChange(async (v) => {
						this.plugin.settings.warnRatio = v;
						await this.plugin.saveSettings();
					}),
			);
	}
}
