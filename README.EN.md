# 🎨 Code Palette

[简体中文](README.md) · [Download ZIP](https://github.com/Tillerion/obsidian-code-palette/releases/latest) · [Community listing](https://community.obsidian.md/plugins/code-palette)

Independent code themes for inline code, tables and code blocks in Obsidian. Set a default language for a file or folder to highlight short snippets throughout your notes, while keeping Markdown content unchanged.

## ✨ Features

- **Scope rules:** Set a default language for a file, a folder and its subfolders, or the vault.
- **24 languages:** Python, C/C++, Java, JavaScript/TypeScript, SQL and more. Preserve existing code-block language labels by default, or override their highlighting language per rule.
- **10 offline themes:** One Dark Pro, VS Code Dark+/Light+, GitHub Dark/Light, Dracula, Nord, Monokai and Solarized Dark/Light. Choose a fixed theme or follow light/dark mode.
- **Global palette:** Theme ordinary code across the vault without assigning language rules. Unlabelled snippets receive plain theme foreground/background colors, with no language inference.
- **Reading and editing:** Supports reading, live preview and source modes. Themes affect managed code areas; surrounding text and note contents remain unchanged.

## 📦 Install or update

### ZIP installation

1. Download the plugin ZIP from the [latest release](https://github.com/Tillerion/obsidian-code-palette/releases/latest). Use the installation asset, **not GitHub's automatically generated Source code ZIP**.
2. Extract its `code-palette` folder into your vault's `.obsidian/plugins/` directory.
3. Enable **Code Palette** under Obsidian → Settings → Community plugins.

```text
Your vault/
└─ .obsidian/plugins/code-palette/
   ├─ main.js
   ├─ manifest.json
   └─ styles.css
```

**Updating an existing installation:** Disable the plugin, replace `main.js`, `manifest.json` and `styles.css` in its existing folder, then enable it again. Keep your `data.json` to preserve rules and theme preferences. Existing rules retain their preserve-language behavior when upgrading to 0.2.0.

### In-app directory

Search for **Code Palette** under Settings → Community plugins → Browse. Once the app's directory includes the plugin, use **Check for updates** to upgrade.

For newly approved plugins, the in-app directory can take up to 24 hours to synchronize. If search or update checks do not find it yet, use the ZIP. See [Obsidian's official guidance](https://obsidian.md/blog/future-of-plugins/#how-do-i-submit-a-new-plugin-or-theme).

## 🚀 Usage

**Language-based highlighting:** Leave global palette off. Right-click a file or folder → **代码配色：设置语言规则**, then choose its default language. Inline code and unlabelled blocks use that language. Priority: file → nearest folder → parent folders → vault default.

**Preserve or replace existing labels:** Under **已有代码块语言**, choose **保留已有语言（默认）** (preserve, default) or **替换为指定语言** (replace with the selected language). For Markdown snippets incorrectly labelled `text`, choose Markdown as the rule language and enable replacement. This is available for file, folder and vault-default rules.

Replacement applies the selected language to all ordinary code blocks in that scope, not only `text` blocks. It changes highlighting only; fence labels and source text remain unchanged. See the [example note](examples/替换已有语言.md).

**Palette without language inference:** Enable **全局代码配色（不匹配语言）** in plugin settings. Labelled blocks retain syntax highlighting; inline code and unlabelled blocks use plain theme foreground/background colors. Saved language rules are bypassed until global mode is turned off.

**Theme selection:** Choose fixed/light/dark themes and background preferences in plugin settings. The master switch pauses the effect while preserving settings.

## 🖼️ Preview

Reading view example, captured in v0.1.1:

![Inline table code and block highlighting](docs/screenshots/v0.1.1-reading.png)

## Notes

- Requires Obsidian 1.8.0 or later. Mobile behavior has not been tested.
- Known functional blocks such as Mermaid and Dataview keep their original handling. Plain-text labels remain plain by default; replacement mode can highlight them using the selected rule language.
- Syntax highlighting does not provide code execution or language-server semantic coloring. Ordinary identifiers may use the base text color.
- Individual snippets over 200,000 characters retain native display.

## License and feedback

[MIT](LICENSE) · [Third-party licenses](THIRD_PARTY_NOTICES.md) · [Report an issue](https://github.com/Tillerion/obsidian-code-palette/issues)
