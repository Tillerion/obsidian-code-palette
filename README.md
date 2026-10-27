# Code Palette · 代码配色

v0.1.2 为 Obsidian 的行内代码和普通代码块提供多语言高亮及独立代码主题。新增可选的全局代码配色模式，不需要设置语言规则。历史版本标签保留。

源码与版本：[Tillerion/obsidian-code-palette](https://github.com/Tillerion/obsidian-code-palette)（私有仓库，需要登录有权限的 GitHub 账号）。

- 文件、文件夹（可递归）和仓库默认语言；文件规则优先于最近的文件夹规则。
- 🎨 全局代码配色：只沿用代码块已有语言，无标记代码不匹配、不猜测语言。
- 保留代码块已有的语言；支持 Python、C/C++、Java 等常用语言。
- 10 套离线代码配色；默认深色 One Dark Pro、浅色 VS Code Light+。
- 阅读视图、实时预览和源码模式；正文及 Obsidian 界面不受配色影响。
- 笔记原文保持不变，规则存放于插件 data.json。

## 安装

从 v0.1.2 发布页下载 `code-palette-v0.1.2.zip`，解压后将 `code-palette` 文件夹放入你的仓库 `.obsidian/plugins/`。重载 Obsidian，在设置 → 第三方插件中启用 **Code Palette · 代码配色**。更新时覆盖 main.js、manifest.json、styles.css 即可，保留自己的 data.json。

## 使用

### 🎨 全局代码配色（不匹配语言）

在插件设置中开启 **全局代码配色（不匹配语言）**，即可将当前选择的配色应用于整个仓库的行内代码和普通代码块，无需新增任何语言规则。

- 已有 `java`、`cpp` 等语言标记：沿用原语言，采用插件配色。
- 行内代码、无标记代码块，以及暂不支持的语言：只应用主题的基础文字色和背景色，不猜测语言、不进行额外语法着色。
- 当前文字／背景选项仍然有效，Mermaid、Dataview 等功能块继续使用原处理。
- 全局模式默认关闭；开启后暂不使用文件／文件夹／仓库默认语言规则，关闭后恢复原规则。总开关仍能暂停所有插件效果。
- 只调整显示，不修改 Markdown 内容。

**Global palette (no language inference):** Enable this option in the plugin settings to theme ordinary code throughout the vault without assigning language rules. Labelled fences retain their language; inline code, unlabelled fences and unsupported languages receive plain theme foreground/background colors only. This mode temporarily bypasses saved language rules; turning it off restores them. Functional blocks remain untouched and note contents are preserved.

### 文件或文件夹语言规则

右键文件或文件夹 → **代码配色：设置语言规则**，选择默认语言。已有 `java`、`cpp` 等标记的代码块继续使用原语言，但采用插件选定的代码主题。到插件设置中选择深浅配色、预览高亮、管理规则。全局模式关闭时，未设置规则的笔记默认不受影响；可在设置中启用仓库默认规则。

`text` / `txt` / `plain` 表示明确的纯文本；Mermaid、Dataview 等专用功能块保持其原有渲染。不支持的语言在规则模式下回退原显示，在全局模式下使用基础配色。

## 开发

Node.js 22+。运行 `npm ci`，再运行 `npm run check`。`npm run build` 在根目录生成 `main.js`；`npm run package` 生成安装包。单独修改 `data.json` 或主题配置不需要更改任何笔记。

手机端预留兼容；历史 v0.1.1 在 Windows 桌面版实测。本轮 v0.1.2 仅做后台自动化验证，未进行前台实测。TextMate 语法高亮不包含语言服务器提供的语义着色。

单段代码超过 200,000 个字符时回退原显示，避免大段同步分词阻塞编辑器。语法高亮只为可识别的词元着色，普通变量和不完整片段不一定呈现多种颜色。修改已有规则后会刷新已打开的阅读／编辑视图。

验证范围和实测记录见 [docs/verification.md](docs/verification.md)。

## 许可

插件代码使用 MIT 许可；捆绑的语言和主题保留各自许可，见 `THIRD_PARTY_NOTICES.md`。
