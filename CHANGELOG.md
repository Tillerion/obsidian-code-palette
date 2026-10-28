# 更新记录

## 0.1.3

- 🛠️ 修正设置页标题接口、所属窗口计时器、异步选择回调类型、DOM 创建及快照类型。
- 清单改用以英文句号结尾的描述，主 README 增加英文简介。
- 社区发布附件收敛为三个安装文件；新增 GitHub Actions 构建与来源证明流程。
- **English:** Resolve community review findings, use owning-window timers, and publish only the three supported assets with build provenance. Existing highlighting and saved settings remain compatible.

## 0.1.2

- 📦 社区发布使用不带 `v` 的标签 `0.1.2`，与清单版本完全一致；重新打包的附件包含显示名 `Code Palette`。历史标签不变。
- **Community release:** Tag `0.1.2` exactly matches the manifest. Refreshed assets include the compliant display name `Code Palette`; historical tags are preserved.

- 🎨 新增设置项“全局代码配色（不匹配语言）”，默认关闭。
- 沿用已有语言标记，无标记和暂不支持的语言只采用基础配色；不使用文件／文件夹的语言匹配规则。
- 关闭后恢复原语言规则；保留原文、专用功能块和旧配置。
- 本轮仅后台测试、构建与审查，未进行前台测试。

**English:** Added an opt-in vault-wide palette mode without language inference. Explicit fence languages are retained; unlabelled/unsupported code receives plain theme colors. Saved language rules resume when disabled. Verified in background tests only.

## 0.1.1

- 补齐真实 Obsidian 桌面端验收，原 v0.1 标签保留。
- 首次启用插件即可为已经打开的笔记、实时预览表格应用高亮。
- 原生 Prism 延迟渲染后重新应用所选代码主题，避免 C++、Java 等已有语言块回到原生配色。
- 同一代码元素只由一个显示控制器管理，关闭插件时恢复原节点。
- 保留原生高亮器后来创建的节点，恢复时不覆盖外部更新。
- 安装包文件名、构建标记和设置页版本从清单读取。

## 0.1.0 / v0.1

- 首次预发布：24 种常用语言、10 套主题、文件／文件夹／仓库规则及三视图高亮。
- 原文不变、已有语言优先、专用功能块保护。
