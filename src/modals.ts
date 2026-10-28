import {
  App,
  Modal,
  Setting,
  SuggestModal,
  FuzzySuggestModal,
  TFile,
  TFolder,
  type TAbstractFile,
} from "obsidian";
import { languages, languageName, themes } from "./catalog";
import type CodePalette from "./main";
import type { Rule } from "./rules";
import { resolveRule, cleanPath } from "./rules";
export class LanguagePicker extends SuggestModal<{
  id: string;
  name: string;
  aliases: string[];
}> {
  constructor(
    app: App,
    private select: (id: string) => void | Promise<void>,
  ) {
    super(app);
    this.setPlaceholder("搜索语言，例如 Python、C++、Java、SQL");
  }
  getSuggestions(query: string) {
    const q = query.trim().toLowerCase();
    return [
      ...languages,
      { id: "text", name: "纯文本", aliases: ["txt", "plain"] },
    ].filter((x) =>
      `${x.id} ${x.name} ${x.aliases.join(" ")}`.toLowerCase().includes(q),
    );
  }
  renderSuggestion(item: { id: string; name: string }, el: HTMLElement) {
    el.createSpan({ text: item.name });
    el.createSpan({ text: item.id, cls: "cp-picker-id" });
  }
  onChooseSuggestion(item: { id: string }) {
    void this.select(item.id);
  }
}
export class ThemePicker extends SuggestModal<{ id: string; name: string }> {
  constructor(
    app: App,
    private select: (id: string) => void | Promise<void>,
  ) {
    super(app);
    this.setPlaceholder("选择代码配色");
  }
  getSuggestions(query: string) {
    return themes.filter((t) =>
      `${t.id} ${t.name}`.toLowerCase().includes(query.toLowerCase()),
    );
  }
  renderSuggestion(item: { name: string }, el: HTMLElement) {
    el.setText(item.name);
  }
  onChooseSuggestion(item: { id: string }) {
    void this.select(item.id);
  }
}
export class TargetPicker extends FuzzySuggestModal<TAbstractFile> {
  constructor(
    app: App,
    private kind: "file" | "folder",
    private select: (item: TAbstractFile) => void,
  ) {
    super(app);
    this.setPlaceholder(kind === "file" ? "选择 Markdown 文件" : "选择文件夹");
  }
  getItems() {
    return this.app.vault
      .getAllLoadedFiles()
      .filter((f) =>
        this.kind === "file"
          ? f instanceof TFile && f.extension === "md"
          : f instanceof TFolder,
      );
  }
  getItemText(item: TAbstractFile) {
    return item.path || "/";
  }
  onChooseItem(item: TAbstractFile) {
    this.select(item);
  }
}
export class RuleModal extends Modal {
  private draft: Rule;
  constructor(
    private plugin: CodePalette,
    private kind: "file" | "folder",
    private path: string,
  ) {
    super(plugin.app);
    path = this.path = cleanPath(path);
    const existing = plugin.settings.rules.find(
      (r) => r.kind === kind && r.path === path,
    );
    const inherited = resolveRule(
      kind === "file" ? path : `${path}/_preview.md`,
      plugin.settings,
    );
    this.draft = existing
      ? { ...existing }
      : {
          kind,
          path,
          enabled: true,
          language: inherited?.language ?? "python",
          inline: true,
          blocks: true,
          recursive: true,
        };
  }
  onOpen() {
    const el = this.contentEl;
    el.addClass("cp-rule-modal");
    el.createEl("h2", { text: "设置语言规则" });
    el.createEl("p", {
      text: `${this.kind === "file" ? "文件" : "文件夹"}：${this.path || "仓库根目录"}`,
      cls: "cp-rule-path",
    });
    new Setting(el)
      .setName("启用此范围")
      .setDesc("关闭时，此范围使用 Obsidian 原生代码显示。")
      .addToggle((t) =>
        t.setValue(this.draft.enabled).onChange((v) => {
          this.draft.enabled = v;
        }),
      );
    new Setting(el)
      .setName("默认语言")
      .setDesc("应用于行内代码和未标注语言的代码块；保留已有语言。")
      .addButton((b) =>
        b.setButtonText(languageName(this.draft.language)).onClick(() =>
          new LanguagePicker(this.app, (id) => {
            this.draft.language = id;
            b.setButtonText(languageName(id));
          }).open(),
        ),
      );
    new Setting(el)
      .setName("行内代码")
      .setDesc("包括正文、表格、列表和引用中的代码。")
      .addToggle((t) =>
        t.setValue(this.draft.inline).onChange((v) => {
          this.draft.inline = v;
        }),
      );
    new Setting(el).setName("普通代码块").addToggle((t) =>
      t.setValue(this.draft.blocks).onChange((v) => {
        this.draft.blocks = v;
      }),
    );
    if (this.kind === "folder")
      new Setting(el).setName("包含子文件夹").addToggle((t) =>
        t.setValue(this.draft.recursive).onChange((v) => {
          this.draft.recursive = v;
        }),
      );
    new Setting(el)
      .addButton((b) =>
        b.setButtonText("恢复继承").onClick(async () => {
          await this.plugin.removeRule(this.kind, this.path);
          this.close();
        }),
      )
      .addButton((b) => b.setButtonText("取消").onClick(() => this.close()))
      .addButton((b) =>
        b
          .setButtonText("保存规则")
          .setCta()
          .onClick(async () => {
            await this.plugin.upsertRule(this.draft);
            this.close();
          }),
      );
  }
  onClose() {
    this.contentEl.empty();
  }
}
export function describeRule(rule: Rule): string {
  return rule.enabled
    ? `${languageName(rule.language)} · ${[rule.inline ? "行内代码" : "", rule.blocks ? "代码块" : ""].filter(Boolean).join("、") || "未启用代码类型"}${rule.kind === "folder" ? (rule.recursive ? " · 含子目录" : " · 仅本层") : ""}`
    : "已关闭插件效果";
}
