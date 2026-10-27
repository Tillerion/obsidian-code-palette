# Code Palette · 代码配色

v0.1 为 Obsidian 的行内代码和普通代码块提供多语言高亮及独立代码主题。

源码与版本：[Tillerion/obsidian-code-palette](https://github.com/Tillerion/obsidian-code-palette)（私有仓库，需要登录有权限的 GitHub 账号）。

- 文件、文件夹（可递归）和仓库默认语言；文件规则优先于最近的文件夹规则。
- 保留代码块已有的语言；支持 Python、C/C++、Java 等常用语言。
- 10 套离线代码配色；默认深色 One Dark Pro、浅色 VS Code Light+。
- 阅读视图、实时预览和源码模式；正文及 Obsidian 界面不受配色影响。
- 笔记原文保持不变，规则存放于插件 data.json。

## 安装

从 v0.1 发布页下载 `code-palette-v0.1.zip`，解压后将 `code-palette` 文件夹放入你的仓库 `.obsidian/plugins/`。重载 Obsidian，在设置 → 第三方插件中启用 **Code Palette · 代码配色**。

## 使用

右键文件或文件夹 → **代码配色：设置语言规则**，选择默认语言。已有 `java`、`cpp` 等标记的代码块继续使用原语言，但采用插件选定的代码主题。到插件设置中选择深浅配色、预览高亮、管理规则。未设置规则的笔记默认不受影响；可在设置中启用仓库默认规则。

`text` / `txt` / `plain` 表示明确的纯文本；Mermaid、Dataview 等专用功能块保持其原有渲染。不支持的语言回退原显示。

## 开发

Node.js 22+。运行 `npm ci`，再运行 `npm run check`。`npm run build` 在根目录生成 `main.js`；`npm run package` 生成安装包。单独修改 `data.json` 或主题配置不需要更改任何笔记。

手机端预留兼容；v0.1 的实际验收以 Windows 桌面版为准。TextMate 语法高亮不包含语言服务器提供的语义着色。

单段代码超过 200,000 个字符时回退原显示，避免大段同步分词阻塞编辑器。语法高亮只为可识别的词元着色，普通变量和不完整片段不一定呈现多种颜色。修改已有规则后会刷新已打开的阅读／编辑视图。

验证范围和实测记录见 [docs/verification.md](docs/verification.md)。

## 许可

插件代码使用 MIT 许可；捆绑的语言和主题保留各自许可，见 `THIRD_PARTY_NOTICES.md`。
