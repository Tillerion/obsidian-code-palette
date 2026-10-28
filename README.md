# 🎨 Code Palette

[English](README.EN.md) · [下载 ZIP](https://github.com/Tillerion/obsidian-code-palette/releases/latest) · [社区页面](https://community.obsidian.md/plugins/code-palette)

为 Obsidian 的行内代码、表格代码和代码块选择独立配色。按文件或文件夹设置默认语言，让学习笔记中的短代码也能获得语法高亮，笔记原文保持不变。

**English:** Code Palette brings independent code themes to inline code, tables and code blocks in Obsidian. Set a default language for a file or folder, or enable a vault-wide palette without language guessing. Existing code-block language labels are preserved. It includes 24 languages and 10 offline themes, supports reading and editing views, and keeps your Markdown content unchanged. See the [English guide](README.EN.md) for installation and usage.

## ✨ 功能

- **范围规则：** 按文件、文件夹及子文件夹设置默认语言，也可设置仓库默认规则。
- **多语言高亮：** 内置 Python、C/C++、Java、JavaScript/TypeScript、SQL 等 24 种常用语言，保留代码块已有语言标记。
- **独立配色：** 10 套离线主题，包括 One Dark Pro、VS Code Dark+/Light+、GitHub、Dracula、Nord 等；可固定配色或跟随明暗模式。
- **全局代码配色：** 无需设置语言规则，统一仓库内普通代码的外观。无标记代码只使用主题基础文字色与背景色，不猜测语言。
- **阅读与编辑：** 支持阅读、实时预览和源码模式；只调整代码区域，正文与 Markdown 内容不变。

## 📦 安装与更新

### ZIP 安装

1. 从 [最新发布](https://github.com/Tillerion/obsidian-code-palette/releases/latest) 下载 ZIP 安装包，**不要下载 GitHub 自动生成的 Source code ZIP**。
2. 解压，将 `code-palette` 文件夹放入笔记仓库的 `.obsidian/plugins/`。
3. 在 Obsidian → 设置 → 第三方插件中启用 **Code Palette**。

```text
你的笔记仓库/
└─ .obsidian/plugins/code-palette/
   ├─ main.js
   ├─ manifest.json
   └─ styles.css
```

**已有版本更新：** 暂停插件，将 ZIP 中的 `main.js`、`manifest.json`、`styles.css` 覆盖到原目录，再重新启用。保留现有 `data.json`，即可保留语言规则和配色设置。从 0.1.2 更新到 0.1.4 也适用。

### 插件市场

在 Obsidian → 设置 → 第三方插件 → 浏览中搜索 **Code Palette**。已被应用内目录收录后，可使用“检查更新”升级。

新插件在社区网站通过审核后，同步到应用内目录可能需要最多 24 小时；如暂时搜不到或检查不到更新，请先使用 ZIP 安装。参见 [Obsidian 官方说明](https://obsidian.md/blog/future-of-plugins/#how-do-i-submit-a-new-plugin-or-theme)。

## 🚀 使用

**按语言高亮：** 保持“全局代码配色”关闭。右键文件或文件夹 → **代码配色：设置语言规则** → 选择 Python、C++、Java 等默认语言。行内代码和无语言标记的普通代码块使用该语言；已有语言标记保持优先。规则优先级为：文件 → 最近的文件夹 → 上级文件夹 → 仓库默认。

**只统一配色：** 在插件设置中打开 **全局代码配色（不匹配语言）**。已有语言标记的代码块保留语法高亮；行内代码和无标记块只应用基础文字色与背景色。此模式暂时绕过语言规则，关闭后恢复。

**选择主题：** 在插件设置中调整固定配色、深浅模式和代码背景。总开关可随时暂停显示效果，设置仍会保留。

## 🖼️ 效果示例

阅读视图示例（截图来自 v0.1.1）：

![表格行内代码与代码块高亮示例](docs/screenshots/v0.1.1-reading.png)

## 使用说明

- 要求 Obsidian 1.8.0 或更新版本；移动端尚未完成实测。
- Mermaid、Dataview 等专用功能块保持原处理；`text` 等纯文本标记不会被当成编程语言。
- 提供语法高亮，不提供代码执行或语言服务器语义着色；普通标识符不一定呈现多种颜色。
- 单段代码超过 200,000 字符时保留原生显示。

## 许可与反馈

[MIT](LICENSE) · [第三方资源许可](THIRD_PARTY_NOTICES.md) · [问题反馈](https://github.com/Tillerion/obsidian-code-palette/issues)
