# Code Palette v0.1 已批准设计

用户于 2026-10-27 批准开始构建、Git 管理和 GitHub 私有仓库推送。显示发布号 v0.1；Obsidian manifest 使用语义版本 0.1.0。

## 行为
- 默认语言作用于行内代码与未标记语言的普通代码块；已有语言标记总是优先。
- 覆盖 Python、C/C++、Java、C#、JS/TS、Go、Rust、Kotlin、Swift、PHP、Ruby、SQL、Bash、PowerShell、Batch、HTML/CSS、JSON/YAML/TOML/XML、Markdown。
- 10 套离线主题：Dark+、Light+、One Dark Pro、GitHub Dark/Light、Dracula、Nord、Monokai、Solarized Dark/Light。
- 自动明暗模式，默认深色 One Dark Pro / 浅色 Light+；可固定主题。
- 代码块主题背景、行内代码背景可选择主题色或 Obsidian 原有背景；只改变代码区域。
- 文件 > 最近的文件夹 > 上级文件夹 > 仓库默认；文件夹递归开关；规则可关闭或恢复继承。
- 右键入口、命令、中文设置、语言搜索、主题实时预览、生效来源、规则集中管理。
- 阅读、实时预览、源码模式均支持；原文件字节不改，复制原始内容。
- 保护 Mermaid、Dataview 等专用处理器；未知语言回退；显式纯文本不自动猜测。
- 规则跟随 Obsidian 内文件或文件夹重命名；关闭插件清理显示效果。

## 技术与约束
TypeScript、Shiki core + 离线语言/主题 + 内联 Oniguruma WASM、CodeMirror 6 文本装饰、Obsidian Markdown 后处理。
按需初始化，单例引擎和有界缓存，编辑视图只装饰可见范围；保留整个块的多行语法上下文。
首版在 Windows 桌面实测；手机不宣称已验证；不包含 VS Code LSP 语义高亮。
插件内设置页沿用 Obsidian 控件、字体和间距，用真实代码预览呈现配色，正文视觉不改。

## 交付与验收
源码 Git 仓库、私有 GitHub、v0.1 标签、安装 ZIP、中文说明和验证记录。
规则/边界/主题/DOM 自动化测试、类型检查与生产打包、真实 Obsidian 三视图测试、关闭/重开/复制/重命名/文件完整性检查。
