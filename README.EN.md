# 🎨 Code Palette

[简体中文](README.md) · [Download ZIP](https://github.com/Tillerion/obsidian-code-palette/releases/latest) · [Community listing](https://community.obsidian.md/plugins/code-palette)

Independent code themes for inline code, tables and code blocks in Obsidian. Set a default language for a file or folder to highlight short snippets throughout your notes, while keeping Markdown content unchanged.

## ✨ Features

- **Scope rules:** Set a default language for a file, a folder and its subfolders, or the vault.
- **24 languages:** Python, C/C++, Java, JavaScript/TypeScript, SQL and more. Existing code-block language labels take precedence.
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

**Updating an existing installation:** Disable the plugin, replace `main.js`, `manifest.json` and `styles.css` in its existing folder, then enable it again. Keep your `data.json` to preserve language rules and theme preferences. This also works when updating from 0.1.2 to 0.1.4.

### In-app directory

Search for **Code Palette** under Settings → Community plugins → Browse. Once the app's directory includes the plugin, use **Check for updates** to upgrade.

For newly approved plugins, the in-app directory can take up to 24 hours to synchronize. If search or update checks do not find it yet, use the ZIP. See [Obsidian's official guidance](https://obsidian.md/blog/future-of-plugins/#how-do-i-submit-a-new-plugin-or-theme).

## 🚀 Usage

**Language-based highlighting:** Leave global palette off. Right-click a file or folder → **代码配色：设置语言规则**, then choose its default language. Inline code and unlabelled blocks use that language; explicit fence labels retain their grammar. Priority: file → nearest folder → parent folders → vault default.

**Palette without language inference:** Enable **全局代码配色（不匹配语言）** in plugin settings. Labelled blocks retain syntax highlighting; inline code and unlabelled blocks use plain theme foreground/background colors. Saved language rules are bypassed until global mode is turned off.

**Theme selection:** Choose fixed/light/dark themes and background preferences in plugin settings. The master switch pauses the effect while preserving settings.

## 🖼️ Preview

Reading view example, captured in v0.1.1:

![Inline table code and block highlighting](docs/screenshots/v0.1.1-reading.png)

## Notes

- Requires Obsidian 1.8.0 or later. Mobile behavior has not been tested.
- Functional blocks such as Mermaid and Dataview keep their original handling. Explicit plain-text labels remain plain text.
- Syntax highlighting does not provide code execution or language-server semantic coloring. Ordinary identifiers may use the base text color.
- Individual snippets over 200,000 characters retain native display.

## License and feedback

[MIT](LICENSE) · [Third-party licenses](THIRD_PARTY_NOTICES.md) · [Report an issue](https://github.com/Tillerion/obsidian-code-palette/issues)
