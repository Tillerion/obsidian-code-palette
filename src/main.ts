import {
  Plugin,
  Notice,
  MarkdownRenderChild,
  MarkdownView,
  TFile,
  TFolder,
  editorInfoField,
  type MarkdownPostProcessorContext,
} from "obsidian";
import { Highlighter } from "./highlighter";
import {
  normalizeSettings,
  resolveRule,
  moveRules,
  activeTheme,
  cleanPath,
  setRule,
  type Settings,
  type Rule,
} from "./rules";
import { createEditorExtension } from "./editor";
import { ReadingController } from "./reading";
import { PaletteSettings } from "./settings";
import { RuleModal, ThemePicker } from "./modals";
import { languageName, themeName } from "./catalog";
import type { PaletteHost } from "./host";

export default class CodePalette extends Plugin implements PaletteHost {
  declare settings: Settings;
  highlighter = new Highlighter();
  active = false;
  revision = 0;
  private listeners = new Set<() => void>();
  private readers = new Set<ReadingController>();
  private startupReaders = new Map<MarkdownView, ReadingController>();
  private observed = new Set<Document>();
  private status!: HTMLElement;
  private lastError = 0;
  private saveQueue: Promise<void> = Promise.resolve();
  private settingsTab!: PaletteSettings;
  async onload() {
    this.settings = normalizeSettings(await this.loadData());
    this.active = true;
    this.settingsTab = new PaletteSettings(this);
    this.addSettingTab(this.settingsTab);
    this.status = this.addStatusBarItem();
    this.status.addClass("cp-status");
    this.status.setAttribute("aria-label", "查看或设置当前文件代码语言");
    this.registerDomEvent(this.status, "click", () => this.editCurrent());
    this.registerEditorExtension(
      createEditorExtension(
        this,
        (state) => state.field(editorInfoField, false)?.file?.path ?? "",
      ),
    );
    this.registerMarkdownPostProcessor((el, ctx) =>
      this.processReading(el, ctx),
    );
    this.observeDocument(document);
    this.registerEvent(
      this.app.workspace.on("window-open", (win) =>
        this.observeDocument(win.doc),
      ),
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.updateStatus()),
    );
    this.registerEvent(
      this.app.workspace.on("file-open", () => this.refresh()),
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => this.seedOpenViews()),
    );
    this.app.workspace.onLayoutReady(() => {
      if (this.active) this.seedOpenViews();
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (
          !(file instanceof TFolder) &&
          (!(file instanceof TFile) || file.extension !== "md")
        )
          return;
        const kind = file instanceof TFolder ? "folder" : "file";
        const path = cleanPath(file.path);
        menu.addItem((item) =>
          item
            .setTitle("代码配色：设置语言规则")
            .setIcon("palette")
            .onClick(() => new RuleModal(this, kind, path).open()),
        );
        if (this.settings.rules.some((r) => r.kind === kind && r.path === path))
          menu.addItem((item) =>
            item
              .setTitle("代码配色：恢复继承")
              .setIcon("rotate-ccw")
              .onClick(() => this.removeRule(kind, path)),
          );
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        for (const r of this.readers) r.renamePath(oldPath, file.path);
        const moved = moveRules(this.settings.rules, oldPath, file.path);
        if (moved.some((r, i) => r.path !== this.settings.rules[i].path)) {
          this.settings.rules = moved;
          void this.saveSettings();
        } else this.refresh();
      }),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        const next = this.settings.rules.filter(
          (r) => r.path !== file.path && !r.path.startsWith(file.path + "/"),
        );
        if (next.length !== this.settings.rules.length) {
          this.settings.rules = next;
          void this.saveSettings();
        }
      }),
    );
    this.addCommand({
      id: "set-file-language",
      name: "设置当前文件的语言规则",
      callback: () => this.editCurrent(),
    });
    this.addCommand({
      id: "inherit-file-rule",
      name: "当前文件恢复继承",
      callback: async () => {
        const f = this.app.workspace.getActiveFile();
        if (f) await this.removeRule("file", f.path);
      },
    });
    this.addCommand({
      id: "toggle-highlighting",
      name: "启用或暂停代码配色",
      callback: async () => {
        this.settings.enabled = !this.settings.enabled;
        await this.saveSettings();
        new Notice(this.settings.enabled ? "代码配色已启用" : "代码配色已暂停");
      },
    });
    this.addCommand({
      id: "choose-theme",
      name: "选择代码配色",
      callback: () =>
        new ThemePicker(this.app, async (id) => {
          this.settings.fixedTheme = id;
          this.settings.themeMode = "fixed";
          await this.saveSettings();
          new Notice(`代码配色：${themeName(id)}`);
        }).open(),
    });
    this.addCommand({
      id: "show-effective-rule",
      name: "查看当前文件生效规则",
      callback: () => {
        const f = this.app.workspace.getActiveFile(),
          r = f ? resolveRule(f.path, this.settings) : null;
        new Notice(
          !r
            ? "当前文件使用 Obsidian 原生代码显示。"
            : `${r.source}\n${r.enabled ? "默认语言：" + languageName(r.language) : "已关闭插件效果"}\n配色：${themeName(this.theme())}`,
          7000,
        );
      },
    });
    this.updateStatus();
  }
  private seedOpenViews() {
    if (!this.active) return;
    const views = new Set<MarkdownView>();
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (!(leaf.view instanceof MarkdownView)) continue;
      const view = leaf.view;
      views.add(view);
      if (this.startupReaders.has(view)) continue;
      const controller = new ReadingController(
        view.contentEl,
        () => view.file?.path ?? "",
        this,
      );
      this.startupReaders.set(view, controller);
      this.readers.add(controller);
    }
    for (const [view, controller] of this.startupReaders)
      if (!views.has(view)) {
        controller.dispose();
        this.readers.delete(controller);
        this.startupReaders.delete(view);
      }
  }
  private processReading(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    if (!el.querySelector("code") && el.tagName !== "CODE") return;
    this.observeDocument(el.ownerDocument);
    const plugin = this;
    class PaletteChild extends MarkdownRenderChild {
      private controller?: ReadingController;
      onload() {
        this.controller = new ReadingController(el, ctx.sourcePath, plugin);
        plugin.readers.add(this.controller);
      }
      onunload() {
        if (this.controller) {
          this.controller.dispose();
          plugin.readers.delete(this.controller);
        }
      }
    }
    ctx.addChild(new PaletteChild(el));
  }
  theme(doc: Document = document) {
    return activeTheme(
      this.settings,
      doc.body.classList.contains("theme-dark"),
    );
  }
  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
  refresh() {
    this.revision++;
    for (const callback of [...this.listeners]) callback();
    this.updateStatus();
  }
  private observeDocument(doc: Document) {
    if (this.observed.has(doc)) return;
    this.observed.add(doc);
    const observer = new MutationObserver(() => this.refresh());
    observer.observe(doc.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    this.register(() => {
      observer.disconnect();
      this.observed.delete(doc);
    });
  }
  async saveSettings() {
    const snapshot = JSON.parse(JSON.stringify(this.settings));
    this.saveQueue = this.saveQueue
      .catch(() => {})
      .then(() => this.saveData(snapshot));
    try {
      await this.saveQueue;
      this.refresh();
    } catch (e) {
      this.reportError(e);
      throw e;
    }
  }
  async upsertRule(rule: Rule) {
    this.settings.rules = setRule(this.settings.rules, rule);
    await this.saveSettings();
    this.settingsTab.display();
    new Notice("代码语言规则已保存");
  }
  async removeRule(kind: "file" | "folder", path: string) {
    path = cleanPath(path);
    this.settings.rules = this.settings.rules.filter(
      (r) => r.kind !== kind || r.path !== path,
    );
    await this.saveSettings();
    this.settingsTab.display();
  }
  private editCurrent() {
    const f = this.app.workspace.getActiveFile();
    if (f?.extension === "md") new RuleModal(this, "file", f.path).open();
    else new Notice("请先打开一篇 Markdown 笔记");
  }
  private updateStatus() {
    if (!this.status || !this.settings) return;
    const f = this.app.workspace.getActiveFile(),
      r = f ? resolveRule(f.path, this.settings) : null;
    this.status.setText(
      !this.settings.enabled
        ? "代码：已暂停"
        : r?.enabled
          ? "代码：" + languageName(r.language)
          : "代码：原生",
    );
    this.status.setAttribute(
      "title",
      `${r?.source ?? "未设置语言规则"}\n${themeName(this.theme())}`,
    );
  }
  reportError(error: unknown) {
    console.error("[Code Palette]", error);
    if (this.active && Date.now() - this.lastError > 10000) {
      this.lastError = Date.now();
      new Notice("代码配色加载失败，已保留原显示。详情见开发者控制台。");
    }
  }
  onunload() {
    this.active = false;
    this.revision++;
    for (const r of [...this.readers]) r.dispose();
    this.readers.clear();
    this.startupReaders.clear();
    for (const callback of [...this.listeners]) callback();
    this.listeners.clear();
    this.highlighter.dispose();
  }
}
