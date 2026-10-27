import { PluginSettingTab, Setting } from "obsidian";
import type CodePalette from "./main";
import { languages, themes, languageName } from "./catalog";
import { appendTokens } from "./rendering";
import {
  RuleModal,
  TargetPicker,
  LanguagePicker,
  describeRule,
} from "./modals";

const samples: Record<string, string> = {
  python:
    'def greet(name: str) -> str:\n    # 代码配色 · Python\n    return f"Hello, {name}!"\n\nprint(greet("Obsidian"))',
  cpp: '#include <iostream>\n\nint main() {\n    // 代码配色 · C++\n    std::cout << "Hello, Obsidian!" << 42;\n    return 0;\n}',
  java: 'public class Demo {\n    public static void main(String[] args) {\n        // 代码配色 · Java\n        System.out.println("Hello, Obsidian!");\n    }\n}',
};
export class PaletteSettings extends PluginSettingTab {
  private previewLanguage = "python";
  private previewGeneration = 0;
  constructor(private plugin: CodePalette) {
    super(plugin.app, plugin);
  }
  display() {
    const el = this.containerEl;
    el.empty();
    el.addClass("cp-settings");
    const header = el.createDiv({ cls: "cp-settings-header" });
    header.createEl("h2", { text: "Code Palette" });
    header.createSpan({
      text: `v${this.plugin.manifest.version}`,
      cls: "cp-version",
    });
    el.createEl("p", {
      text: "按笔记设置语言，为代码选择独立配色。已有语言标记始终保留。",
      cls: "cp-description",
    });
    new Setting(el)
      .setName("启用代码配色")
      .setDesc("暂停后保留设置，代码恢复原生显示。")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.enabled).onChange(async (v) => {
          this.plugin.settings.enabled = v;
          await this.plugin.saveSettings();
        }),
      );
    new Setting(el)
      .setName("全局代码配色（不匹配语言）")
      .setDesc(
        "为整个仓库的行内代码和普通代码块使用所选配色。只沿用代码块已有的语言标记；没有标记或暂不支持的语言仅应用基础文字色和背景色，不猜测语言。开启后暂不使用下面的语言规则，关闭后恢复。",
      )
      .addToggle((t) =>
        t.setValue(this.plugin.settings.globalPalette).onChange(async (v) => {
          this.plugin.settings.globalPalette = v;
          await this.plugin.saveSettings();
        }),
      );
    new Setting(el).setName("代码配色").setHeading();
    new Setting(el).setName("切换方式").addDropdown((d) =>
      d
        .addOption("auto", "跟随 Obsidian 明暗模式")
        .addOption("fixed", "始终使用指定配色")
        .setValue(this.plugin.settings.themeMode)
        .onChange(async (v) => {
          this.plugin.settings.themeMode = v as "auto" | "fixed";
          await this.plugin.saveSettings();
          this.display();
        }),
    );
    const chooseTheme = (
      key: "darkTheme" | "lightTheme" | "fixedTheme",
      name: string,
      filter?: (typeof themes)[number]["dark"],
    ) => {
      new Setting(el).setName(name).addDropdown((d) => {
        for (const t of themes.filter(
          (t) => filter === undefined || t.dark === filter,
        ))
          d.addOption(t.id, t.name);
        d.setValue(this.plugin.settings[key]).onChange(async (v) => {
          this.plugin.settings[key] = v;
          await this.plugin.saveSettings();
          await this.preview(preview);
        });
      });
    };
    if (this.plugin.settings.themeMode === "auto") {
      chooseTheme("darkTheme", "深色配色", true);
      chooseTheme("lightTheme", "浅色配色", false);
    } else chooseTheme("fixedTheme", "固定配色");
    new Setting(el)
      .setName("代码块背景")
      .setDesc("使用代码主题的背景色，只影响代码块。")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.blockBackground).onChange(async (v) => {
          this.plugin.settings.blockBackground = v;
          await this.plugin.saveSettings();
          await this.preview(preview);
        }),
      );
    new Setting(el).setName("行内代码背景").addDropdown((d) =>
      d
        .addOption("theme", "跟随代码配色")
        .addOption("obsidian", "沿用 Obsidian 行内背景")
        .setValue(this.plugin.settings.inlineBackground)
        .onChange(async (v) => {
          this.plugin.settings.inlineBackground = v as "theme" | "obsidian";
          await this.plugin.saveSettings();
        }),
    );
    const previewBar = el.createDiv({ cls: "cp-preview-bar" });
    previewBar.createSpan({ text: "配色预览" });
    const select = previewBar.createEl("select", {
      attr: { "aria-label": "预览语言" },
    });
    for (const id of Object.keys(samples))
      select.createEl("option", { text: languageName(id), value: id });
    select.value = this.previewLanguage;
    const preview = el.createEl("pre", { cls: "cp-preview" });
    select.addEventListener("change", () => {
      this.previewLanguage = select.value;
      void this.preview(preview);
    });
    void this.preview(preview);
    new Setting(el).setName("仓库默认语言").setHeading();
    new Setting(el)
      .setName("启用仓库默认规则")
      .setDesc("仅在没有文件或文件夹规则时生效。初始关闭。")
      .addToggle((t) =>
        t.setValue(!!this.plugin.settings.defaultRule).onChange(async (v) => {
          this.plugin.settings.defaultRule = v
            ? {
                kind: "folder",
                path: "",
                language: "python",
                enabled: true,
                inline: true,
                blocks: true,
                recursive: true,
              }
            : null;
          await this.plugin.saveSettings();
          this.display();
        }),
      );
    const fallback = this.plugin.settings.defaultRule;
    if (fallback) {
      new Setting(el).setName("仓库默认语言").addButton((b) =>
        b.setButtonText(languageName(fallback.language)).onClick(() =>
          new LanguagePicker(this.app, async (id) => {
            fallback.language = id;
            await this.plugin.saveSettings();
            this.display();
          }).open(),
        ),
      );
      new Setting(el).setName("仓库默认行内代码").addToggle((t) =>
        t.setValue(fallback.inline).onChange(async (v) => {
          fallback.inline = v;
          await this.plugin.saveSettings();
        }),
      );
      new Setting(el).setName("仓库默认代码块").addToggle((t) =>
        t.setValue(fallback.blocks).onChange(async (v) => {
          fallback.blocks = v;
          await this.plugin.saveSettings();
        }),
      );
    }
    new Setting(el).setName("文件与文件夹规则").setHeading();
    el.createEl("p", {
      text: "优先级：文件 → 最近的文件夹 → 上级文件夹 → 仓库默认。也可以右键文件或文件夹设置。",
      cls: "cp-description",
    });
    new Setting(el)
      .setName("添加规则")
      .addButton((b) =>
        b
          .setButtonText("选择文件")
          .onClick(() =>
            new TargetPicker(this.app, "file", (f) =>
              new RuleModal(this.plugin, "file", f.path).open(),
            ).open(),
          ),
      )
      .addButton((b) =>
        b
          .setButtonText("选择文件夹")
          .onClick(() =>
            new TargetPicker(this.app, "folder", (f) =>
              new RuleModal(this.plugin, "folder", f.path).open(),
            ).open(),
          ),
      );
    if (!this.plugin.settings.rules.length)
      el.createEl("p", {
        text: "还没有范围规则。选择一个文件或文件夹开始。",
        cls: "cp-empty",
      });
    for (const r of [...this.plugin.settings.rules].sort((a, b) =>
      a.path.localeCompare(b.path),
    )) {
      new Setting(el)
        .setName(`${r.kind === "file" ? "文件" : "文件夹"}：${r.path || "/"}`)
        .setDesc(describeRule(r))
        .addButton((b) =>
          b
            .setButtonText("编辑")
            .onClick(() => new RuleModal(this.plugin, r.kind, r.path).open()),
        )
        .addButton((b) =>
          b
            .setButtonText("移除")
            .setTooltip("恢复继承上级规则")
            .onClick(async () => {
              await this.plugin.removeRule(r.kind, r.path);
              this.display();
            }),
        );
    }
    const foot = el.createDiv({ cls: "cp-settings-foot" });
    foot.createEl("p", {
      text: `${languages.length} 种语言 · ${themes.length} 套配色 · 离线运行`,
    });
    foot.createEl("p", {
      text: "规则保存在插件配置中。笔记原文保持不变；Mermaid、Dataview 等功能块继续使用原有渲染。",
    });
  }
  private async preview(pre: HTMLElement) {
    const generation = ++this.previewGeneration;
    const code = samples[this.previewLanguage];
    pre.textContent = "正在载入配色…";
    try {
      const r = await this.plugin.highlighter.highlight(
        code,
        this.previewLanguage,
        this.plugin.theme(pre.ownerDocument),
      );
      if (generation !== this.previewGeneration || !r) return;
      pre.style.setProperty("--cp-bg", r.background);
      pre.style.setProperty("--cp-fg", r.foreground);
      pre.classList.toggle(
        "cp-background",
        this.plugin.settings.blockBackground,
      );
      const el = pre.ownerDocument.createElement("code");
      appendTokens(el, r);
      pre.replaceChildren(el);
    } catch (e) {
      if (generation === this.previewGeneration)
        pre.textContent = "预览加载失败，可重新打开设置重试。";
      this.plugin.reportError(e);
    }
  }
}
