# 角色卡工坊 · CharCard Workshop

[English](README.en.md) | 中文

一个 [DeepSeek Harness](https://github.com/deepseek-ai)（DSH）的 agent preset **及其**
skill 集合，用于创作 SillyTavern 角色卡。它在官方内置的 标准 / PTC / 极简 / 创造
四个 mode 之外，新增第五个 session mode：**角色卡工坊**（`rolecard`）。

```
charcard-workshop/
├─ cordis.patch.yml    preset 声明与路由契约
├─ package.json        bundle manifest
├─ skills/             23 个 skill bundle —— 纯数据，运行时不执行任何代码
├─ NOTICE.md           每个 skill bundle 的来源
└─ LICENSE             MIT（覆盖本仓库，不覆盖 skill 正文）
```

## 这个 mode 是什么

它用官方 `standard` preset 组合出一个 session —— terminal、filesystem、search、job、
goal、plan-mode、compaction、delegation、workflow、web、todo 这些工具面完全一致 ——
再额外加一段 persona，把做卡的工作路由到对应的 skill。**不增加也不移除任何 tool**，
所以它是一个 lens，而不是另一个 agent。

persona 与路由契约限定在这个 preset 里，所以它们只作用于选用「角色卡工坊」的 session。
但 **skill 的发现不是 preset 级的**：`$DSH_HOME/skills` 是 user 级 root（rank 400），
标准/PTC/极简/创造四个内置 mode 都会扫描它，所以装到那里的 skill 会出现在**每一个**
session 的 catalog 里。要让某个 skill 只在本 mode 出现，就把它放进只有本 preset 扫描的
root（`customSkillDirs`，rank 300），而不是 `$DSH_HOME/skills`。

| 项目 | 值 |
|---|---|
| Bundle package | `charcard-workshop` |
| Preset id | `rolecard` |
| 显示名 | 角色卡工坊 |
| 排序 | 2 |
| 基础能力 | 官方 `standard` preset |

## 安装

需要一个 DSH profile。

**1. 安装 bundle。** 把 `install_bundle` 的 target 指向本目录的绝对路径：

```
plugin_manager action=install_bundle target="<本目录的绝对路径>"
```

**2. 安装 skill，让这个 mode 的 catalog 有内容。** DSH 的 `dsh-skill-filesystem`
把 `$DSH_HOME/skills` 作为它的 `user-dsh` root 来扫描，而发现深度**恰好只有一层** ——
它识别 `<root>/<name>/SKILL.md`，但不识别嵌套目录树。所以要把本仓库 `skills/` 的
**内容**复制进那个 root，而不是把仓库本身放进去：

```bash
# bash
cp -r skills/* "$DSH_HOME/skills/"
```

```powershell
# PowerShell
Copy-Item -Path ".\skills\*" -Destination "$env:DSH_HOME\skills" -Recurse -Force
```

把仓库**作为子目录**克隆到 `$DSH_HOME/skills` 下面是不行的 —— 多出来的那一层嵌套会让
每个 skill 都发现不到。

**替代做法：**保留一份 checkout，改为让 preset 指向它 —— 在 `cordis.patch.yml` 里给
`skill-filesystem` 这一行加一个 `customSkillDirs`：

```yaml
- id: skill-filesystem
  name: '@deepseek-ai/dsh-skill-filesystem'
  config:
    customSkillDirs:
      - C:\path\to\charcard-workshop\skills
```

不装 skill 也能用：这个 mode 照样能组合出来，只是它的 catalog 会比较单薄。

**3. 验证。** 该 mode 会出现在 session 的 mode 选择器里。用它与新开一个 session，
确认 catalog 里列出了这些做卡的 skill。

## 两套制卡框架，以及为什么必须区分

路由契约写在 `cordis.patch.yml` 里。它把两条**不可互换**的 workflow 分开，因为它们
打包角色卡用的是完全不同的机制。把它们混用是最容易卡住的路径。

### 框架 A —— 内容优先、自足的 project

适用于「从零做一张卡」「从小说改编」「改一下这张卡」「加个玩法 / MVU / 开场白」。

```
tavern-design                  → cards/{Project}/design-spec.md，然后停下等用户确认
tavern-cards                   → forge project：init → 创作规划.yaml → 条目 → MVU → EJS
                                 → configure → 开场白 → UI
tavern-ui                      → 状态栏要做成 frontend 时
```

打包属于 `tavern-cards`，用它自带的离线 CLI：

```
node <skills>/tavern-cards/scripts/tavern-cards-forge.mjs pack {project}
```

角色卡有头像时写出 `cards/{Project}/{Project}.png`，没有头像时写 `.json`；独立世界书写
worldbook JSON。

**这条框架里绝不能使用 `sillytavern-card-pipeline`。** 它不附带 build engine —— 它做的
是发现目标仓库自己的工具链，而 forge project 没有任何这类工具。在这条链上伸手去够它，
得到的是一份「缺少 adapter boundary」的报告，而不是一张卡。

### 框架 B —— 数据驱动的工程仓库

只在用户指向一个已有的角色卡仓库、问起 watch build / 组件库 / adapter、或者要求
release / acceptance 闸门时才走这条。

```
tavern-card-builder            → 设计与 runtime-dependency ledger
sillytavern-card-components    → 拆解、registry、recipe
sillytavern-card-pipeline      → validate by impact → compose → pack → embed → gate
sillytavern-runtime-debug      → 来自真实 SillyTavern session 的证据
```

打包走项目自己的工具，且**先发现、先验证**。如果那个仓库没有这样的工具，正确答案是
报告缺失的 adapter boundary —— 绝不自编一条命令。

### 两条框架共享的 skill

以下 skill 各自负责一个专门领域，两条框架都会用到：`tavern-ui` /
`sillytavern-embedded-ui`（界面）、`sillytavern-database-rolecards`（变量与数据）、
`sillytavern-api-reference`（精确签名与版本事实）、
`sillytavern-render-regex-pipeline`（正则）、`sillytavern-component-update`（单个组件）、
`sillytavern-rolecard-performance`（预算）、`sillytavern-rolecard-security`（注入与远程
加载审查）、`sillytavern-media-live2d-runtime`（媒体）、`sillytavern-extension-dev`
（扩展）、`tavern-helper-frontend`（Tavern Helper 前端）、`rewrite-natural-prose`
（文风）、`code-quality-workflow`（架构）、`orchestrate-project-blueprint`（模糊愿望 →
设计案）、`rolecard-workshop-ops`（发布基础设施）、`consult-tavernweave-library`
（资料库路由）。

### 这里的 Codex subagent 并不存在

这些 skill 是为 Codex 写的，里面点名了 Codex harness 会注入的 subagent ——
`check-agent`、`schema-agent`、`first-message-agent`、`conversion-agent`。DSH 不定义这些
agent。preset 的 persona 指示模型：要么自己动手做，要么用 `subagent` tool 委派并把该
skill 的完整指令块粘进 task 字符串。**绝不要干等一个不会出现的 agent，也绝不要声称某个
agent 跑过。**

### skill 是怎么被调用的（以及为什么会被漏掉）

DSH 的 skill 由**模型自己调用**。harness 只做两件事：把 skill catalog（每个 skill 的
`name` + `description`）作为一条 `user/message` 注进 session，并提供 `skill` tool 按名字取正文。
没有任何机制会替你触发 skill，也没有东西会在中途重新提醒模型。

由此推出两个实践后果，本 preset 都做了处理：

- **catalog 只发布一次，不会每轮重复。** 它出现在 session 开头。对话越长，模型在动手写正文时
  越容易想不起它。所以 persona 把路由契约写成「按你**即将执行的动作**分类」而不是「等用户说
  关键词」，并在 `suffix`（system prompt 的最后一段）放了一道开门闸：一个 turn 内第一次
  write/edit 之前必须先加载对应 skill，**写完再补算漏调**。
- **catalog 里的 description 会被截断。** `dsh-tool-skill` 默认
  `catalogDescriptionMaxLength: 500`。本套 23 个 skill 里有 10 个的 description 超过 500 字符，
  而截掉的正好是结尾的「该用谁 / 不该用谁」消歧句 —— 例如 `tavern-card-builder` 会丢掉
  `route those tasks to the focused TavernWeave skills`，
  `sillytavern-card-pipeline` 会丢掉整句 `use sillytavern-card-components instead`。
  本 preset 把它设为 `1200`，覆盖最长的一条（约 930 字符），因此每条 catalog 都是完整的。

### 想绕过模型的判断？直接用 `/skill-name` 点名

路由能不能成，最终取决于模型每轮的决定。你要不想赌这一步，就在消息里直接写斜杠命令：
消息正文里出现一个独立的 `/rewrite-natural-prose`（前后是空格或行首行尾），DSH 会把该
skill 的完整正文直接注进这一轮，模型不需要自己想起来。名字必须和 catalog 里的完全一致。

比如「这段设定 `/rewrite-natural-prose` 帮我改一遍」就会强制加载。这条通道不受上面两个
问题影响，是最硬的兜底。

## skill bundle 清单

`skills/` 下 23 个 bundle。每个都是一个目录，内含一个 `SKILL.md`，frontmatter 里带
`name` 和 `description`；DSH 用这段 frontmatter 建立 catalog，正文只在按需加载时才读。

| 分组 | Skill |
|---|---|
| 叙事设计 | `tavern-design` |
| 项目创建与条目创作 | `tavern-cards` |
| 前端界面开发 | `tavern-ui` |
| 酒馆助手前端界面 | `tavern-helper-frontend` |
| 卡体设计与工程路由 | `tavern-card-builder` |
| 拆卡与组件库 | `sillytavern-card-components`, `sillytavern-component-update` |
| 装配打包与发布闸门 | `sillytavern-card-pipeline` |
| 变量与数据 | `sillytavern-database-rolecards` |
| 接口与版本事实 | `sillytavern-api-reference` |
| 正则渲染管线 | `sillytavern-render-regex-pipeline` |
| 界面与交互 | `sillytavern-embedded-ui` |
| 真实运行时调试 | `sillytavern-runtime-debug` |
| 性能预算 | `sillytavern-rolecard-performance` |
| 安全审查 | `sillytavern-rolecard-security` |
| 媒体与 Live2D | `sillytavern-media-live2d-runtime` |
| 扩展开发 | `sillytavern-extension-dev` |
| 资料库检索 | `consult-tavernweave-library` |
| 构思收束 | `orchestrate-project-blueprint` |
| 文风精修 | `rewrite-natural-prose` |
| 架构审查 | `code-quality-workflow` |
| 工坊与发布基础设施 | `rolecard-workshop-ops` |
| 指导式教学 | `activate-tavernweave-soul` |

`tavern-cards` 在 `tavern-cards/scripts/tavern-cards-forge.mjs` 附带一个 4.7 MB 的 CLI。
它是单个自足文件，不是需要安装的 dependency。

## 修改与重装

`pnpm` 把本目录 link 进 profile，所以 persona 文本就是从这里读的。

对 `cordis.patch.yml` 的修改，只有在**改变了某条 dependency row 的那次安装**里才会被
重新加载。对一个没变的包重跑 `install_bundle` 会以 `ambiguous-install` 失败；而只把
`version` 加一也不够，因为 pnpm 保留的是完全相同的 `link:` spec。正确做法是先移除再
重新加入：

```
plugin_manager action=remove_bundle  target=charcard-workshop
plugin_manager action=install_bundle target="<本目录的绝对路径>"
```

skill 正文不需要重装 —— `skill-filesystem` 会 watch 它扫描的各个 root，每次加载都重新
从磁盘读取文件。

## 许可

本仓库采用 MIT —— 见 [LICENSE](LICENSE)。

这覆盖的是 preset 声明与文档。它**不是**对 `skills/` 下 skill 正文的授权，那些正文的
权利仍属各自作者。每个 bundle 的来源、上游致谢、以及因许可原因被刻意排除的 skill 清单，
见 [NOTICE.md](NOTICE.md)。
