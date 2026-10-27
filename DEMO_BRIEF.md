# 🎬 Code Palette — 宣传视频制作简报 / Demo Video Brief

> 面向 Claude Code / Opus 5.5 的制作交接。先读第 1–3 节，再按第 4–7 节准备和录制；英文摘要见第 10 节。本文根据仓库当前代码整理，描述版本为 **0.1.2**。

## 1. 30 秒理解项目 / Quick context

**Code Palette 是 Obsidian 第三方插件，让学习笔记中的行内代码、表格代码和普通代码块拥有独立配色，并支持按文件或文件夹指定默认编程语言。** 它运行在 Obsidian 内，没有独立网页、端口或后端服务。

最适合的视频开场：一张 Python 方法速查表，原本单调的行内代码，在配置文件夹语言后出现清晰的语法颜色；随后切换代码主题，正文与 Obsidian 界面保持原样。

| 项目事实 | 内容 |
| --- | --- |
| 名称 / 插件 ID | Code Palette / `code-palette` |
| 当前版本 | `manifest.json`：`0.1.2` |
| 公开源码 | [Tillerion/obsidian-code-palette](https://github.com/Tillerion/obsidian-code-palette) |
| 正式发布 | [Release 0.1.2](https://github.com/Tillerion/obsidian-code-palette/releases/tag/0.1.2)，标签没有 `v` 前缀 |
| 安装包 | Release 中的 `code-palette-v0.1.2.zip`；安装需要 `main.js`、`manifest.json`、`styles.css` |
| 运行环境 | Obsidian；清单最低版本 `1.8.0`；历史桌面实测版本 `1.14.5` |
| 开发环境 | Node.js ≥ 22；TypeScript、Shiki、CodeMirror 6 |
| 当前本地仓库 | `F:\Code\AI Project\Codex\2026-10-27\new-chat-3\outputs\obsidian-code-palette` |

### 可直接交给 Claude Code 的任务提示词

```text
请阅读本仓库 DEMO_BRIEF.md，基于当前 Code Palette 0.1.2 制作宣传演示视频。
默认制作约 120 秒、1920×1080、30 fps、中文旁白和中文字幕的横屏成片。
以真实 Obsidian 画面展示表格行内代码、文件夹规则、独立主题、多语言保留、全局配色及三种视图。
重点遵守第 3 节的两种模式区别：全局配色不会猜测未标注代码的语言。
先检查实际环境和可用录制工具，使用独立演示库；按本文分镜录制并剪辑。
功能画面使用真实录屏，标题和转场可以程序化生成；不要用动画伪造成功交互。
先完成环境与镜头准备，再录制。不能录制时，交付可执行录制方案并明确缺少什么。
交付 MP4、SRT、旁白稿和制作说明。依用户当次授权执行，不修改插件功能或代为发布。
```

上述时长、画幅和旁白是制作默认值，可按发布平台调整。本文交付时只完成文档整理，没有录制视频或进行新的前台验收。

## 2. ✨ 功能与演示优先级 / Feature priorities

| 优先级 | 功能 | 视频怎样展示 | 观众应记住什么 |
| --- | --- | --- | --- |
| 必拍 | 行内代码与表格代码高亮 | 固定机位对比同一张方法表；突出 `return False`、字符串和数字 | 学习笔记里的短代码也能按语言着色 |
| 必拍 | 文件夹默认语言 | 右键 Python 文件夹，设置 Python，打开子文件夹笔记 | 一处配置，覆盖一组笔记 |
| 必拍 | 10 套独立代码配色 | 同一段代码切换 One Dark Pro → Dracula → VS Code Light+ | 改代码的配色，保留正文与界面主题 |
| 必拍 | 保留已有语言标记 | 在默认 Python 的笔记中展示显式 `cpp`、`java` 块 | 混合语言笔记不会全部被当作 Python |
| 必拍 | 全局配色开关 | 打开设置项，在没有规则的笔记中展示效果 | 不设默认语言，也能统一整个库的代码外观 |
| 必拍 | Markdown 原文不变 | 展示源码中的反引号与围栏；配合原文件哈希对比 | 调整显示，保留笔记内容 |
| 简短展示 | 文件规则优先、恢复继承 | Python 目录内为 Java 例外笔记设置文件级 Java | 局部例外可单独处理 |
| 简短展示 | 阅读、实时预览、源码模式 | 同一笔记三种视图连切 | 阅读与编辑均可使用 |
| 简短展示 | 设置预览与语言搜索 | 搜索 `c++`；预览 Python / C++ / Java | 常用语言与配色容易选择 |
| 字幕即可 | 离线资源、背景控制、独立开关 | 设置页局部或结尾功能卡 | 无需在线高亮 API，代码背景可自行控制 |

**24 种内置语言：** Python、C、C++、Java、C#、JavaScript、TypeScript、Go、Rust、Kotlin、Swift、PHP、Ruby、SQL、Bash / Shell、PowerShell、Windows Batch、HTML、CSS、JSON、YAML、TOML、XML、Markdown。纯文本是额外的特殊处理选项。

**10 套主题：** One Dark Pro、VS Code Dark+、VS Code Light+、GitHub Dark、GitHub Light、Dracula、Nord、Monokai、Solarized Dark、Solarized Light。可以跟随 Obsidian 明暗模式，或固定使用一套代码主题。

不必逐个演示全部语言和主题。主视频用 Python、C++、Java 和三套有明显差异的主题，其他内容用短字幕补充。

## 3. 必须准确表达的两种模式 / Mode contract

| 行为 | 文件／文件夹语言规则模式 | 全局代码配色模式 |
| --- | --- | --- |
| 设置状态 | “启用代码配色”开；“全局代码配色（不匹配语言）”关 | 两个开关均开 |
| 应用范围 | 命中规则的笔记；可额外启用仓库默认规则 | 整个仓库的普通代码 |
| 行内代码、未标注语言块 | 用指定的默认语言分词高亮 | 只用主题基础文字色和背景色；不做语言推断 |
| 已有 `cpp`、`java` 等支持的标记 | 保留原语言，使用插件主题 | 保留原语言，使用插件主题 |
| 保存的语言规则 | 文件 → 最近文件夹 → 上级文件夹 → 仓库默认 | 暂时绕过；关闭全局模式后恢复，包括原先关闭某范围的规则 |
| Mermaid、Dataview 等功能块 | 保持原处理 | 保持原处理 |

全局模式默认关闭。“不匹配语言”不等于取消显式语言块的语法高亮；它表示不替行内代码或无语言块额外选择一种语言。

推荐字幕：**“按语言精细高亮，或一键全局统一配色。”** 全局模式镜头必须同时展示一个已有语言标记的块和一个无标记片段，并分别说明。不要把全局模式下短代码只有一种文字色剪成“未生效”。

## 4. 🛠️ 环境、构建与启动 / Setup and launch

### 4.1 先检查，再准备

在仓库根目录打开 PowerShell。已有仓库可直接使用；异地机器先克隆：

```powershell
git clone https://github.com/Tillerion/obsidian-code-palette.git
Set-Location -LiteralPath .\obsidian-code-palette
```

```powershell
node --version
npm --version
npm ci
npm run build
```

`npm run build` 执行类型检查和生产构建，在仓库根目录生成 `main.js`。直接使用 Release 安装包时可以跳过源码构建。其他开发命令：

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 监听源码并重新构建；不会打开 Obsidian，也不会自动部署到演示库 |
| `npm test` | 后台自动化测试 |
| `npm run check` | 测试和生产构建 |
| `npm run package` | 检查后生成 `dist/code-palette-v0.1.2.zip` |

本项目没有 `npm start` 或 localhost 预览地址。不要为录视频改造成网页。

### 4.2 创建独立演示库并复制插件

建议新建 **CodePalette-VideoDemo**，避免使用个人笔记库。下面脚本只创建新的演示目录，若目录已存在会停止；重新录制时应检查并复用现有库，而不是删除重建。

在仓库根目录、完成构建后运行：

```powershell
$repoPath = (Get-Location).Path
$demoVault = [IO.Path]::GetFullPath((Join-Path $repoPath '..\..\work\CodePalette-VideoDemo'))
if (Test-Path -LiteralPath $demoVault) { throw "演示库已存在，请检查后复用：$demoVault" }
$pluginDir = Join-Path $demoVault '.obsidian\plugins\code-palette'
New-Item -ItemType Directory -Path $pluginDir -Force | Out-Null
foreach ($name in @('main.js', 'manifest.json', 'styles.css')) {
    Copy-Item -LiteralPath (Join-Path $repoPath $name) -Destination $pluginDir
}
$pythonDir = Join-Path $demoVault 'Python\进阶'
$globalDir = Join-Path $demoVault '全局'
New-Item -ItemType Directory -Path $pythonDir, $globalDir -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $repoPath 'examples\代码配色演示.md') -Destination (Join-Path $demoVault 'Python\代码配色演示.md')
Copy-Item -LiteralPath (Join-Path $repoPath 'examples\代码配色演示.md') -Destination (Join-Path $pythonDir '下一课.md')
$demoVault
```

`work` 是此本地交接目录的素材暂存位置；在其他机器可以把 `$demoVault` 改为任意明确的独立目录。检查复制后的 `manifest.json` 确实是 `0.1.2`。

在 Obsidian 库选择器中选择“打开本地仓库”，打开上述路径；由操作者处理首次信任提示，再到设置 → 第三方插件启用 **Code Palette**。进入插件设置确认版本。现有 `CodePalette-TestVault` 是历史验收库，不能默认它已经安装当前版本。

### 4.3 打开演示笔记和辅助命令

当前 Windows 机器的 Obsidian 路径为 `E:\Programs\Obsidian\Obsidian.exe`，CLI 为 `E:\Programs\Obsidian\Obsidian.com`。其他机器先定位自己的安装路径。下面的启动命令会显示应用窗口，供实际录制时使用；首次打开演示库通过正常库选择器完成。CLI 作为已打开库的辅助入口。

```powershell
Start-Process -FilePath 'E:\Programs\Obsidian\Obsidian.exe' -WindowStyle Normal
# 首次通过库选择器打开 CodePalette-VideoDemo，并启用插件后，再使用以下命令。
$obsidianCli = 'E:\Programs\Obsidian\Obsidian.com'
& $obsidianCli 'vault=CodePalette-VideoDemo' open 'path=Python/代码配色演示.md'
& $obsidianCli 'vault=CodePalette-VideoDemo' command 'id=code-palette:choose-theme'
& $obsidianCli 'vault=CodePalette-VideoDemo' command 'id=code-palette:show-effective-rule'
```

CLI 未启用或不可用时，直接用 Obsidian 文件列表和命令面板完成同一操作。录制前确认命令确实作用于演示库。

| 命令 ID | 效果 |
| --- | --- |
| `code-palette:set-file-language` | 打开“设置当前文件的语言规则” |
| `code-palette:inherit-file-rule` | 移除当前文件规则，恢复继承 |
| `code-palette:toggle-highlighting` | 切换总开关；调用前检查当前状态，避免反向切换 |
| `code-palette:choose-theme` | 打开“选择代码配色”；选定后切为固定主题模式 |
| `code-palette:show-effective-rule` | 显示当前规则来源与配色 |
| `markdown:toggle-preview` | Obsidian 阅读／编辑视图切换 |
| `editor:toggle-source` | Obsidian 源码／实时预览切换；在编辑视图中使用 |

## 5. 🧪 演示素材与起始状态 / Demo fixtures

优先使用已跟踪的 `examples/代码配色演示.md`：它包含方法表、行内代码、无标记 Python 块、显式 C++ / Java、纯文本、引用和列表。**方法名等普通标识符不保证都有多种颜色**；镜头同时放入 `return False`、字符串和数字，颜色差异更明确。

按下面结构准备，新增内容只放演示库，不更改仓库示例或个人笔记：

```text
CodePalette-VideoDemo/
├─ Python/
│  ├─ 代码配色演示.md       # 已从 examples 复制
│  ├─ Java例外.md           # 下方 Java 素材；演示文件规则优先
│  └─ 进阶/下一课.md        # 已复制；演示递归继承
└─ 全局/
   └─ 无规则.md             # 下方素材；始终不为此文件夹设置语言规则
```

`Python/Java例外.md`：

````markdown
# 同一文件夹中的 Java 例外

默认语言设为 Java 后，行内片段 `return true;` 和 `"Hello, Java!"` 使用 Java 配色。

```
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}
```
````

`全局/无规则.md`：

````markdown
# 无语言规则，也能统一代码配色

普通正文保持原样。行内代码 `return False` 只使用基础文字色，不猜测为 Python。

## 无标记块：只有基础文字色和背景色
```
def greet(name):
    return f"Hello, {name}!"
```

## 已有 Java 标记：保留 Java 语法高亮
```java
public class Demo {
    public static void main(String[] args) {
        System.out.println("Hello, Code Palette!");
    }
}
```
````

录制基线：使用 Obsidian 默认主题，隐藏个人信息和无关窗口；插件总开关开启、全局配色关闭、仓库默认规则关闭；起初没有文件／文件夹规则。选择固定 One Dark Pro，代码块背景开启，行内代码背景选“跟随代码配色”。这些设置只调整演示库。

视图字号以 1080p 成片能读清楚为准，建议正文约 22–24 px。保持一段完整表格或代码块在画面内，提前确认中文字体没有缺字。

## 6. 🎞️ 120 秒分镜与录制脚本 / Shot list

时间用于成片编排；原始录制每个动作前后多留 2 秒，等待界面稳定后再切镜。旁白不必填满每一秒。

| 时间 | 画面与操作脚本 | 中文旁白 / 字幕要点 |
| --- | --- | --- |
| 00–08 | 同一张方法表前后对比。先展示总开关关闭的原生显示，再切到文件夹 Python 规则生效的相同位置；第二个画面可从后续录屏取材。 | “Obsidian 里的短代码和方法表，也能拥有清晰的语法配色。试试 Code Palette。” / **让短代码，也有好配色** |
| 08–26 | 从基线开始，右键 `Python` 文件夹 →“代码配色：设置语言规则”→ 默认语言搜索 Python；保持行内代码、普通代码块、包含子文件夹开启 →“保存规则”。打开主示例，聚焦 `return False` 与表格。 | “为文件夹选一次默认语言，行内代码、表格代码和没有标注语言的代码块，就能一起高亮。” / **文件夹设一次，同类笔记一起生效** |
| 26–39 | 打开 `Python/进阶/下一课.md`，停留继承效果。打开 `Java例外.md`，右键文件设置 Java；如时间允许，显示当前生效规则来源。 | “子文件夹可以继承；某篇笔记需要另一种语言，再单独设置文件规则。” / **文件规则优先 · 支持递归继承** |
| 39–57 | 打开设置，展示固定配色和预览语言；在相同预览或同一笔记固定区域切换 One Dark Pro、Dracula、VS Code Light+。匹配剪辑时正文和侧栏位置保持一致。 | “十套代码主题，包含熟悉的 VS Code 配色。只调整代码区域，笔记正文和界面风格照旧。” / **10 套离线配色 · 代码主题独立选择** |
| 57–70 | 回到 Python 默认规则的主示例，滚到显式 `cpp` 和 `java` 块；短切源码画面突出围栏标签，再回到阅读画面。 | “一篇笔记混用多种语言？已有的 C++、Java 标记始终保留，不会被默认语言覆盖。” / **保留已有语言标记** |
| 70–92 | 恢复 One Dark Pro。打开“全局代码配色（不匹配语言）”，切到 `全局/无规则.md`；先圈出显式 Java 的多色词元，再圈出无标记块的基础配色。最后短切 Python 页，关闭全局模式，展示原规则恢复。 | “也可以一键统一整个库的代码配色。已有语言照常高亮；没有标记的代码只换基础颜色，不猜语言。关闭全局模式，原来的语言规则继续生效。” / **全局统一外观 · 无标记代码不推断语言** |
| 92–105 | 在规则恢复后的主示例中切换阅读、实时预览、源码模式，保持同一段代码可见；源码保留反引号和围栏。叠加实际完成的哈希比对结果，避免铺满终端。 | “阅读、实时预览和源码模式都能使用。改变显示，保留 Markdown 原文。” / **三种视图 · 原文不变** |
| 105–113 | 暂停总开关，展示原生效果，再重新开启。若节奏太紧，只保留重新开启后的清晰画面；用字幕补充离线语言与主题。 | “需要时随时暂停，设置依然保留。常用语言和主题资源随插件提供。” / **随时暂停 · 离线高亮** |
| 113–120 | 干净的示例笔记定格，叠加名称、GitHub 仓库和版本。网址至少可读 3 秒。 | “Code Palette，让学习笔记里的代码，更清晰，也更合你的审美。” / **开源 · Code Palette 0.1.2** |

### 镜头执行补充

- **对比素材：** 先录原生状态，再录相同滚动位置的规则效果。即使开头使用分屏，也要来自同一份 Markdown 和真实状态。
- **规则继承：** `Python` 文件夹设 Python 并勾选“包含子文件夹”；Java 文件例外仅作用于 `Java例外.md`，不要覆盖主示例。
- **切换主题：** 比较代码主题时保持 Obsidian 的明暗模式不变。另有余量再补“跟随 Obsidian 明暗模式”，避免把两种切换混在一镜。
- **全局镜头：** 关闭全局开关会让“无规则”页恢复原生显示。要表现旧规则恢复，切回有 Python 规则的主示例。
- **源码镜头：** 原文件哈希比对能证明演示期间没有改写 Markdown；复制按钮内容一致可作为补拍，主片无需展示测试过程。
- **菜单与状态栏：** 可补拍状态栏语言／全局配色提示，以及语言搜索弹窗。主片时间不足时保留核心镜头。

### 30 秒精简版剪辑建议

00–05 秒表格前后对比 → 05–12 秒文件夹选择 Python → 12–19 秒三套主题与显式 C++ / Java → 19–25 秒全局开关，字幕注明“无标记不猜语言” → 25–30 秒项目名称和仓库。此为主片素材的可选复用，不需要另外录一遍完整流程。

## 7. 🎙️ 连续旁白稿 / Voice-over

按第 6 节镜头切分录音；可轻微删改停顿和语气，不改变功能含义。以下约两分钟的留白式旁白，最终长度由语速和剪辑决定。

> Obsidian 里的短代码和方法表，也能拥有清晰的语法配色。试试 Code Palette。
>
> 为文件夹选一次默认语言，行内代码、表格代码和没有标注语言的代码块，就能一起高亮。
>
> 子文件夹可以继承；某篇笔记需要另一种语言，再单独设置文件规则。
>
> 十套代码主题，包含熟悉的 VS Code 配色。只调整代码区域，笔记正文和界面风格照旧。
>
> 一篇笔记混用多种语言？已有的 C++、Java 标记始终保留，不会被默认语言覆盖。
>
> 也可以一键统一整个库的代码配色。已有语言照常高亮；没有标记的代码只换基础颜色，不猜语言。关闭全局模式，原来的语言规则继续生效。
>
> 阅读、实时预览和源码模式都能使用。改变显示，保留 Markdown 原文。
>
> 需要时随时暂停，设置依然保留。常用语言和主题资源随插件提供。
>
> Code Palette，让学习笔记里的代码，更清晰，也更合你的审美。

字幕以这份文案为底稿，按最终成片实际时间生成 SRT；不要把计划时间当作已经校准的字幕时间。

## 8. 📹 录制、剪辑与可复现检查 / Capture workflow

1. **准备工具。** 先检查现有录屏、剪辑、字幕、语音工具；优先复用已安装工具。录制应用窗口或指定区域，排除个人路径、通知和其他笔记。需要新增工具时，先按操作者的安装授权处理。
2. **录制独立镜头。** 依第 6 节操作脚本逐段录制，避免一遍长录后靠加速掩盖查找菜单。鼠标每次完成动作后离开代码区域，主题切换后等待高亮稳定。
3. **剪辑。** 主要保留真实屏幕画面，可给方法表和菜单局部放大。使用克制的切换和标注；不闪切十套主题，不用后期手工改颜色冒充插件效果。
4. **声音与字幕。** 中文旁白清晰，背景音乐可省略；使用音乐时确认授权。字幕放在代码之外，一屏不超过两行，避免遮住反引号、表头和语言标签。
5. **导出检查。** 默认 MP4、H.264、1080p、30 fps，常见播放器可播放；检查字号、字幕同步和最终全局模式解释是否准确。实际导出规格和片长写进制作说明。

若已有 `ffmpeg` 且 Windows 构建支持 `gdigrab`，可使用下列**可选原始录屏模板**。先手动把窗口调整到合适大小，并把 `$windowTitle` 替换成当前真实窗口标题；模板没有录音，旁白后期加入，也没有自动点击 UI。没有该工具时用已有录屏软件即可。

```powershell
Get-Command ffmpeg -ErrorAction Stop
$windowTitle = '替换为当前 Obsidian 演示窗口的完整标题'
$videoDir = [IO.Path]::GetFullPath((Join-Path $repoPath '..\code-palette-video'))
New-Item -ItemType Directory -Path $videoDir -Force | Out-Null
$capturePath = Join-Path $videoDir ('capture-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.mp4')
ffmpeg -f gdigrab -framerate 30 -i "title=$windowTitle" -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p $capturePath
# 在该终端按 q 停止并正常封装 MP4；正式录制前确认实际捕获区域。
```

上例的 `code-palette-video` 是与仓库同级的交付目录。FFmpeg 模板仅供制作时适配，本文编写阶段没有运行或验证录制工具链。

**证明笔记未改写：** 在演示库文件准备完成后、开始录制前运行第一行，全部镜头结束后运行第二行；同一 PowerShell 会话保持 `$demoVault` 可用。

```powershell
$beforeHashes = Get-ChildItem -LiteralPath $demoVault -Filter '*.md' -Recurse -File | Get-FileHash -Algorithm SHA256 | Select-Object Path, Hash
# 在此期间录制显示操作，不编辑 Markdown 内容。
$afterHashes = Get-ChildItem -LiteralPath $demoVault -Filter '*.md' -Recurse -File | Get-FileHash -Algorithm SHA256 | Select-Object Path, Hash
Compare-Object $beforeHashes $afterHashes -Property Path, Hash
```

`Compare-Object` 无输出才表示两次采样的文件路径和内容哈希相同。此检查只覆盖演示库中的 Markdown 文件，不是“所有环境均无改写”的普遍证明。

## 9. 事实边界与交付标准 / Accuracy and delivery

### 发布文案应保持准确

- 当前有公开 GitHub Release；社区目录审核状态未在本文确认，结尾使用 GitHub 下载入口，不宣称“已上架 Obsidian 社区”。
- 语法高亮来自 TextMate 语法，不提供 LSP 语义高亮、代码执行或 AI 自动识别。普通变量、短片段不一定呈现多种颜色。
- 仅调整所管理的代码显示。Mermaid、Dataview 等功能块保持其渲染逻辑；不把这些图表当作插件生成成果。
- 单段代码超过 200,000 字符会回退原显示。移动端和所有第三方主题组合未完成实测，不宣传全平台全面兼容。
- `docs/screenshots/v0.1.1-*.png` 是历史实测截图，可用于背景参考；不能当作 0.1.2 全局设置的实际录屏。
- 既有记录：0.1.1 有 Windows 前台验收；0.1.2 全局模式有后台验证，详情见 [验证记录](docs/verification.md)。本简报没有补做前台验证；制作者应先确认新镜头行为，再据实录制，异常需报告。

### 建议交付目录

```text
code-palette-video/
├─ Code-Palette-demo-zh-1080p.mp4  # 主片
├─ Code-Palette-demo-zh.srt        # 按实际时间轴校准的字幕
├─ narration-zh.md                # 最终旁白
├─ production-notes.md            # 实际环境、录制方式、素材出处、未完成项
└─ sources/                      # 原始分段录屏、旁白、可编辑工程或渲染脚本
```

建议封面文字：**“让 Obsidian 的代码更好看”**；小字 **“Code Palette · 行内代码 / 多语言 / 独立配色”**。片尾展示 `github.com/Tillerion/obsidian-code-palette`，说明为开源项目；有需要再制作二维码，并核对链接目标。

交付前检查：核心对比来自同一内容；文件夹规则和显式语言保留可见；全局模式的无标记片段没有伪造语法颜色；主题切换没有混入 Obsidian 正文换肤；源码内容和哈希检查属实；成片、字幕能实际打开。若只产出了脚本或素材，明确报告，不写成“视频制作完成”。

## 10. English production handoff

**Product:** Code Palette 0.1.2 is a third-party plugin for Obsidian that applies independent code themes and optional language defaults to inline code and ordinary code blocks. It is an in-app plugin, with no web server or standalone preview URL.

**Default film:** About 120 seconds, 1920×1080, 30 fps, Chinese narration and captions. Use real Obsidian footage for functionality; generated titles, callouts and transitions are fine. Deliver an MP4, a synchronized SRT, final narration and production notes. These are suggested production defaults, not completed deliverables.

**Primary story:** Start with a Python reference table before/after. Set a recursive folder rule once, show an inherited child note and a file-level Java exception, switch three code themes, preserve explicitly labelled C++/Java blocks, demonstrate the global palette toggle, then show reading/live-preview/source views and unchanged Markdown.

**Two modes must remain distinct:**

- With global palette **off**, saved file/folder/vault rules supply a default language for inline code and unlabelled blocks. File rules outrank the nearest folder rule, then parent folder rules and the vault default. Existing supported fence labels retain their language.
- With global palette **on**, ordinary code across the vault receives the selected palette without adding language rules. Supported labelled fences retain syntax highlighting. Inline code, unlabelled fences and unsupported labels receive **plain theme foreground/background only**, with no language inference. Saved rules are bypassed until the toggle is turned off. The master switch still applies.

**Highlights:** 24 bundled languages, 10 bundled themes, independent code colors/backgrounds, scope inheritance, explicit-language preservation, Chinese settings with live previews, and offline highlighting resources. The note text and the surrounding Obsidian UI keep their existing content/style.

**Build:** Node.js 22+, `npm ci`, `npm run build`. The build creates root `main.js`. Install `main.js`, `manifest.json` and `styles.css` into `<DEMO_VAULT>/.obsidian/plugins/code-palette/`, then open the isolated vault in Obsidian and enable the plugin through its normal settings. Keep existing `data.json` when updating a configured installation. `npm run dev` watches source; it does not deploy or launch the app.

**Footage plan:** 0–8s hook; 8–26s folder rule; 26–39s inheritance and file exception; 39–57s themes; 57–70s explicit languages; 70–92s global palette; 92–105s three views and source preservation; 105–113s pause/resume and offline resources; 113–120s project link. Follow the detailed Chinese action script and narration in sections 6–7. Record each shot separately with handles for editing.

**Fixtures:** Reuse `examples/代码配色演示.md`. Section 5 supplies a Java-exception note and a separate no-rule global-palette note. Use a fresh `CodePalette-VideoDemo` vault, never personal notes. Section 4 contains Windows setup/CLI commands; section 8 contains an optional FFmpeg capture template and a Markdown hash comparison. Adapt paths and verify the real capture window before recording.

**Accuracy:** Do not claim automatic language detection, LSP semantic coloring, code execution, verified mobile support, or confirmed community-directory approval. Historical screenshots demonstrate 0.1.1, not the newer global setting. Existing 0.1.2 records cover background verification; actual new footage must be checked during production. Do not fake successful UI actions or recolor tokens in post-production to simulate a feature.

**Download / CTA:** [GitHub repository](https://github.com/Tillerion/obsidian-code-palette) · [Release 0.1.2](https://github.com/Tillerion/obsidian-code-palette/releases/tag/0.1.2). The release tag matches `manifest.version` exactly and has no leading `v`.

## 11. 源码定位 / Source map

| 文件 | 制作前需要核对的内容 |
| --- | --- |
| [manifest.json](manifest.json) / [package.json](package.json) | 插件名称、版本、构建命令 |
| [src/settings.ts](src/settings.ts) | 全局开关、配色选项、背景选项、预览语言等实际界面标签 |
| [src/modals.ts](src/modals.ts) | 语言搜索、规则对话框、递归选项 |
| [src/main.ts](src/main.ts) | 右键菜单、命令 ID、状态栏 |
| [src/rules.ts](src/rules.ts) | 范围优先级、全局模式绕过规则的行为 |
| [src/catalog.ts](src/catalog.ts) | 24 种语言、10 套主题、功能块清单 |
| [examples/代码配色演示.md](examples/代码配色演示.md) | 主镜头现成 Markdown 素材 |
| [docs/verification.md](docs/verification.md) | 已有验证范围、历史实测与限制 |

若后续代码或版本变化，以实际仓库为准更新本简报，再录制对应版本。
