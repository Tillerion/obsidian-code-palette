# 🎨 Code Palette

[简体中文](README.md) · [Download ZIP](https://github.com/Tillerion/obsidian-code-palette/releases/latest) · [Community listing](https://community.obsidian.md/plugins/code-palette)

Independent code themes for inline code, tables and code blocks in Obsidian. Set a default language for a file or folder to highlight short snippets throughout your notes, while keeping Markdown content unchanged.

## ✨ Features

- **Scope rules:** Set a default language for a file, a folder and its subfolders, or the vault.
- **24 languages:** Python, C/C++, Java, JavaScript/TypeScript, SQL and more. Preserve existing code-block language labels by default, or override their highlighting language per rule.
- **10 offline themes:** One Dark Pro, VS Code Dark+/Light+, GitHub Dark/Light, Dracula, Nord, Monokai and Solarized Dark/Light. Choose a fixed theme or follow light/dark mode.
- **Markdown body:** A replacement rule targeting Markdown renders `text` blocks as headings, lists, tables and other Markdown content in reading and live preview.
- **Global palette:** Theme code in notes without matching rules. Existing file/folder/vault rules stay in control; unlabelled snippets in unmatched notes receive plain theme colors without language inference.
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

**Language-based highlighting:** Right-click a file or folder → **代码配色：设置语言规则**, then choose its default language. Inline code and unlabelled blocks use that language. Priority: file → nearest folder → parent folders → vault default → global palette for unmatched notes.

**Preserve or replace existing labels:** Under **已有代码块语言**, choose **保留已有语言（默认）** (preserve, default) or **替换为指定语言** (replace with the selected language). This is available for file, folder and vault-default rules.

**Render a text block as Markdown:** Select Markdown as the rule language and enable replacement. Reading and live-preview views display rendered headings, lists, tables and other Markdown content. Double-click the live preview to edit its source; move the cursor outside the block to restore the preview. Source mode keeps the original fenced text editable.

Replacement applies the selected language to all ordinary code blocks in that scope, not only `text` blocks. It changes display only; fence labels and source text remain unchanged. See the [example note](examples/替换已有语言.md).

**Palette without language inference:** Enable **全局代码配色（不匹配语言）**. Saved rules remain effective, including replacement, per-type switches and explicit exclusions. Only unmatched notes use the global palette: labelled blocks retain syntax highlighting, while inline code and unlabelled blocks use plain theme colors.

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
