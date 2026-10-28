# 验证记录

## 0.1.4：实际社区扫描反馈修复，2026-10-28

- 0.1.3 的 GitHub Actions 构建、31 项测试、三个附件的来源证明及核验成功；社区亦确认 `main.js` 和 `styles.css` 来源证明通过。
- 社区扫描新增阻断项：设置分组标题不能重复插件名。0.1.4 使用通用的“高亮设置”标题。
- 仅修改标题及版本／文档信息，不调整高亮逻辑和用户配置；本轮继续仅做后台检查及社区扫描，不操作 Obsidian 前台。

**English:** The 0.1.3 hosted build, tests and asset attestations succeeded, but the community scanner rejected a settings heading that repeated the plugin name. Version 0.1.4 uses a generic heading. Highlighting behavior and saved settings are unchanged; no foreground Obsidian tests were performed.

## 0.1.3：社区审核修复，2026-10-28

- 本轮仅后台验证，未启动、安装或操作 Obsidian。
- 31 项自动化测试通过，TypeScript 类型检查和生产构建通过。
- 新增所属窗口计时器回归：修改前失败，修正后通过；验证阅读视图的刷新与清理使用笔记窗口的计时器，内容及卸载恢复保持正确。
- 原有 Shiki、阅读 DOM、CodeMirror、多语言保留、全局配色开关和配置兼容性用例继续通过。
- 修复社区报告中的设置标题阻断项，以及计时器、选择回调、DOM 帮助方法、配置快照、未使用导入、描述标点和 README 英文简介问题。
- 独立静态审查未发现阻断性缺陷；据审查意见细化了计时器用例，检查销毁时取消的确实是尚未运行的计时器 ID。
- 新增发布工作流：版本校验、测试、生产构建、附件来源证明与验证；正式发布仅上传三个 Obsidian 安装文件。远端执行结果以 GitHub Actions 记录为准。
- 保留的建议项：旧设置页接口用于兼容 Obsidian 1.8.0；样式覆盖及跨行背景保留，以免削弱代码主题效果；文件列表枚举用于用户主动选择规则范围。这些建议不等同于审核阻断错误。

**English:** 31 background tests, type checking and production build passed. An owning-window timer regression failed before the fix and passed afterward. No frontend Obsidian testing was performed. Legacy settings APIs and scoped code-style overrides remain for compatibility; remote build/attestation results are available in GitHub Actions.

## v0.1.2：本轮仅后台验证

按用户要求，本轮没有启动或操作 Obsidian，没有前台测试、截图、自动安装或热重载。

- 30 项后台自动化测试通过，包括真实 Shiki 高亮、jsdom 阅读 DOM 和 CodeMirror 6 编辑器集成；类型检查和生产构建通过。
- 全局模式：无需任何范围规则即可覆盖普通代码；总开关可暂停；关闭全局模式后恢复保存的规则。
- 无标记行内代码、无标记块和暂不支持的语言只显示基础配色；已有 Java/C++ 等标记继续采用对应语言；Mermaid、Dataview 等功能块不接管。
- 验证旧配置默认不启用新功能、无效开关值不被当成 true、规则数据和原文保持不变。
- 后台编辑器用例验证全局开关前后的词元颜色变化及原文保留。
- 针对本轮改动完成独立静态代码审查，未发现需要修复的问题；审查未操作前台应用。
- 本轮新增设置项的真实 Obsidian 界面和实际交互，留给用户自行核验。以下 v0.1.1 实测记录仅代表历史版本结果。

日期：2026-10-27。运行环境：Windows、Node.js 24.21.0、Obsidian 1.14.5（安装器 1.14.4）。

## v0.1.1：历史自动化验证

- 自动化测试 26 项通过，TypeScript 类型检查、esbuild 生产构建通过；安装包结构和版本单独检查。
- 24 个实际语言语法、10 套实际主题均已从本地资源成功加载；包括 Python、C、C++、Java、C# 等。
- 实际 CodeMirror 6 + jsdom 集成测试验证：行内与代码块着色、原文不变、关闭规则清理装饰。
- 10,000 行代码块回归测试验证：保留整块语法分析上下文，但仅在可见范围创建文本装饰。
- 文件／目录／仓库优先级、目录边界、非递归、排除、根目录立即生效、重命名映射、已有语言和纯文本优先级通过测试。
- Markdown 边界测试：表格、多反引号、转义、引号内代码、缩进块、未闭合围栏、HTML、YAML 属性、空 YAML 属性、CRLF 和 Unicode 偏移。
- 阅读 DOM 测试验证：原始文字与原 DOM 节点可恢复；异步更新后不覆盖新的 DOM 内容。
- 独立代码审查确认，YAML 解析、屏幕外装饰、根路径、控制器重叠和异步 DOM 通知丢失问题已修复；最终复审未发现新的可操作缺陷。
- ZIP 结构检查：顶层 `code-palette/`，含主程序、manifest、CSS、说明、示例和许可文件；不含 node_modules、个人配置或凭据。
- 示例文件和独立测试库笔记 SHA-256 相同：`D50BA7A359A548E18CE939311FD9E8E03A9D36EAC7D74E01877D9670D887AE81`。

## v0.1.1：历史真实 Obsidian 桌面验收

用户手动完成首次信任提示后，在独立 `CodePalette-TestVault` 中完成验证，实际加载版本为 0.1.1。

- 阅读视图：原生渲染器生成 16 个分区；表格行内代码和普通块有自定义词元。保留 `cpp`、`java`、`text` 原标记。
- 实时预览：11 个表格代码单元全部高亮；正文编辑区域有 29 个词元装饰。
- 源码模式：保留反引号和表格 Markdown 原文，当前视口有 114 个词元装饰。
- 首次启用或重载插件：已经打开的实时预览表格即时着色，无需重新打开笔记。
- 原生 Prism 延迟完成后：C++、Java 块继续使用 Shiki 自定义词元，而非被原生主题覆盖。
- 明暗切换：跟随 Obsidian 的浅色模式选择 Light+，恢复深色后按设置使用 One Dark Pro；代码背景和词元颜色相应变化。
- 设置页：中文控件、版本号、主题选项及 Python/C++/Java 预览；实际切换到 C++ 后出现对应示例和高亮。
- 文件规则：命令打开对话框，搜索 `c++`、选择并保存，产生优先于文件夹的 `cpp` 文件规则；已有 Java 块仍保留 Java。验收后移除该临时文件规则。
- 右键菜单：文件夹菜单包含“代码配色：设置语言规则”，点击后打开带递归选项的文件夹规则对话框；取消不写配置。
- 实际剪贴板：使用原生复制按钮，对比启用和关闭插件后的复制内容，完全一致。原生复制会去除代码块结尾空白，本插件保持相同行为；验收后恢复原剪贴板文本。
- 关闭插件：自定义 `.cp-code`、`.cp-token`、`.cp-syntax` 节点数归零；Java 原生 Prism 词元恢复。重新启用后立即生效。
- 文件夹重命名：将 `课程/Python` 临时改名后，规则路径和当前笔记路径一同更新；随后改回。
- 未命中规则的笔记：包含行内代码和 Java 块的对照笔记没有任何自定义高亮标记。
- 重载整个测试库：插件自动加载、规则保持，阅读视图正常渲染。
- 独立弹出窗口：另一个 Document 中，11/11 表格代码单元有插件高亮，编辑区有 29 个装饰；关闭额外窗口后主窗口保持正常。
- Obsidian `dev:errors`：无捕获错误。

Mermaid 保持原生授权提示和渲染逻辑，不被插件接管；本次未代点该额外授权，因此不宣称已验证 Mermaid 图表输出。主用户仓库未安装此插件，也没有改动其学习笔记。

## 限制

手机端没有实际验证；其他 Obsidian 版本、第三方主题或渲染插件组合未逐一测试。单段代码超过 200,000 个字符回退原显示。语法高亮不包含语言服务器语义着色。
