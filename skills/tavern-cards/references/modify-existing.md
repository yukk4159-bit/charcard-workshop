# 已有角色卡/世界书修改

当用户提供单独的 PNG/JSON 文件（无对应工程文件）并要求修改时，使用本流程。

## 适用场景

- 用户提供单独的 PNG/JSON 角色卡或世界书文件
- 该文件没有对应的 `tavern-cards-state.json` 工程文件
- 用户想对其进行修改（内容、配置、新增条目等）

## 流程

### 1. 导入

```bash
node scripts/tavern-cards-forge.mjs unpack adhoc --file {用户文件路径} --output cards/{Project} --fresh
```

- 项目名从文件名/角色名推导，询问用户确认
- 导入后向用户呈现结构分析：
  - 基本信息（form、mvu、条目总数）
  - 条目清单（名称 + 内容摘要前 1-2 句）
  - 特殊组件（正则脚本数量、酒馆助手脚本、开场白数量、是否检测到 MVU）
  - 当前所有条目均在 `unknown` 类型下，文件平铺于 `世界书/`

**参考资源提取**：如果用户提供的卡不是修改目标，而是作为前端界面的参考样例（如借鉴状态栏样式），用 `split` 按需提取正则与助手脚本，无需走完整的 unpack 建项目流程：

```bash
node scripts/tavern-cards-forge.mjs split adhoc --file {参考卡} --kind regex,helper --output ./ref
```

提取出的正则与助手脚本仅作样式参考；前端界面选型见 `references/ui/regex-scripts.md`（正则写法）与 `references/ui/text.md`（纯文本状态栏）。

### 2. 需求对齐

询问用户修改意图，归类为：

| 修改类型 | 示例 | 是否需要分类 |
|---------|------|------------|
| 纯内容编辑 | 改某条目的文本、修错字 | 否 |
| 配置微调 | 改 keywords、enabled、probability | 否（不改 strategy/position 时） |
| 影响 strategy/position 的修改 | 改触发方式、调位置、改深度 | 是 |
| 新增条目 | 加角色、加世界观 | 是（用户明确类型/位置时可跳过） |
| 删除/重排条目 | 移除废弃条目、调整顺序 | 是（重排 order 时） |
| 大规模重构 | 重写世界观体系、加 MVU | 是 |

不需要分类时 → 先做 3.1 项目注册，再跳到步骤 5。
需要分类时 → 进入步骤 3。
新增条目可跳过分类的前提是类型已在 `typeLists` 中（否则仍需 3.3 补充）。

### 3. 项目注册与条目分类

#### 3.1 项目注册

- 复制 `assets/cardrc.json` 到工作区根目录为 `.cardrc.json`（如不存在）
- 向 `.cardrc.json` 的 projects 添加项目注册（state_file + artifact）
- 运行 `node scripts/tavern-cards-forge.mjs init {project}` 写入默认 typeLists/strategyThresholds/partOrder/depth_defaults

#### 3.2 条目分类

通读所有条目内容后，提出分类方案供用户确认：

- **类型归类**：为每条条目确定类型（世界观、角色、NPC、地理、时间线、事件、扮演准则等），参考 `references/requirements/entry-types.md`
- **part 和 scope**：按 skill 惯例设置（如角色条目的 basic/personality/tri_faceted，scope 的 catalog/specific）
- **文件路径整理**：按 `references/conventions.md` 路径组织原则，将文件从 `世界书/{name}.yaml` 移到 `世界书/{类型}/{name}.yaml`（角色条目建二级子目录）
- 外部卡片可能无法一一对应 skill 标准类型/part，必要时可自定义类型或调整 part 命名，但需用户确认

执行方式：

1. 用 `patch` 的 `move` 操作将条目从 `/entryManifest/unknown/{name}` 移到 `/entryManifest/{type}/{name}`
2. 用 `patch` 的 `replace` 操作更新 `path` 字段（自动重命名磁盘文件）
3. 用 `patch` 的 `replace` 操作补充 `part`、`scope`、`abstract` 字段
4. 确认 `unknown` 类型清空后，用 `patch` 的 `remove` 删除 `/entryManifest/unknown`

**重要：不要手动 `mv` 文件。** `patch` 的 `replace` 操作修改 `path`/`contents[].file`/`replace_file`/`script_file` 等文件路径字段时，会自动重命名磁盘文件（见 `references/conventions.md#文件路径自动重命名`）。手动移动文件会导致 state 与磁盘不一致。

#### 3.3 配置更新

分类完成后，根据实际类型更新 state：

- `typeLists`：将使用的类型分配到 before_char / after_char / depth
- `strategyThresholds`：为每个类型设置阈值（可参考 init 写入的默认值，按需调整）
- `partOrder`：为有 part 的类型设置排序

### 4. 运行 configure（需要时）

```bash
node scripts/tavern-cards-forge.mjs configure {project} --force
```

必须加 `--force`：unpack 得到的条目已带有原始 strategy/position，不加 `--force` 时 configure 会跳过已有值不覆盖。

触发条件：任何影响 strategy/position 的修改、新增条目、重排顺序。
纯内容编辑（不改触发/位置）时跳过。

### 5. 执行修改

> 本步只执行编辑动作。是否需要分类已在第 2 步判定（configure 触发条件见步骤 4）：不涉及分类的修改（纯内容编辑、非 strategy 的配置微调）直接在本步完成；需要分类的修改（新增、重排、strategy/position 调整、大规模重构）在步骤 3–4 完成后执行。

#### 5.1 世界书条目

- **以用户要求优先**：用户未明确时，主动询问是参照 skill 写作规则（`references/rules.md`）还是保持原卡风格
- **内容与配置字段**：条目内容编辑遵循 `references/composition.md`（前置必读的写作规则与检查清单）；配置字段（keywords / enabled / probability 等）用 patch 修改，见 `references/manual.md#EntryManifestLeaf`
- **新增条目**：编写内容文件并按 `references/conventions.md#条目注册` patch add 注册
- **删除/重排**：删除用 patch remove 移除 manifest 条目，并手动删除磁盘文件（patch 只改 state 不删文件）；重排/移动路径用 patch replace 更新 order / path 字段（path 变更自动重命名磁盘文件，不要手动 mv）

#### 5.2 开场白

- 编辑 `开场白/` 下文件；格式（叙事式/大纲式/说明式）、注册与自查清单见 `references/contents-creation/first-message.md`
- **后缀是占位符开关**：`.txt` 打包时自动追加 `<StatusPlaceHolderImpl/>`，`.md` 打包时不追加（见 `references/contents-creation/first-message.md#开场白后缀约定`）。旧版卡解包的开场白无占位符、存为 `.md`，需要状态栏时把后缀改为 `.txt`，打包即自动追加；不需要占位符或需自定义实现时改回 `.md`
- 开场白需要不同初始变量时，按 `references/mvu/initvar.md#initvar_override` 处理
- 新增/删除开场白：patch 操作 `first_messages` 数组，删除后手动清理磁盘文件（与 5.1 相同：patch 只改 state，不删文件）

#### 5.3 正则 / 脚本

- **正则脚本**：编辑 `正则/*.txt`，写法与常见错误见 `references/ui/regex-scripts.md`。前端界面（状态栏等）按用户需求选型：简单展示见 `references/ui/text.md`（纯文本版状态栏），复杂交互走 tavern-ui skill
- **酒馆助手脚本**：`脚本/*.txt` 仅引用外部加载地址（jsdelivr bundle），为固定资产，不需要修改（见 `references/mvu/templates.md`）

### 6. 旧版 MVU 迁移（条件触发）

#### 触发条件

导入分析阶段检测到 `mvu: true` 但 `state.zod` 缺失（无 Zod 脚本）时，说明是旧版 MVU 卡。此时主动询问用户是否要迁移到最新 MVU Zod 体系。

旧版 MVU 的特征：

- 无 schema.ts / Zod 脚本
- 变量更新格式为类 `_.set()` 风格，而非 JSON Patch (RFC 6902)
- 变量可能使用 `[值, "描述/更新规则"]` 的数组形式，将描述和更新规则内嵌在变量值中

#### 迁移流程

用户确认迁移后：

**6.1 分析旧变量结构**

- 读取旧版变量相关条目（通常在 `unknown` 类型下，名称含"变量"、"InitVar"、"status"等关键词）
- 识别变量层级结构和各变量的类型/取值范围
- 识别 `[值, "描述/更新规则"]` 格式 → 将描述/更新规则从变量值中分离出来：
  - 值 → 写入 `initvar.yaml`
  - 描述/更新规则 → 作为编写 `变量更新规则.yaml` 的素材

**6.2 编写新 MVU 核心文件**

按 `references/mvu/guide.md` 的编写顺序：

1. `schema.ts`：从旧变量结构推导 Zod schema（参考 `references/mvu/schema.md`）
2. `initvar.yaml`：从旧变量初始值提取（分离后的纯值部分）
3. `变量更新规则.yaml`：从旧版内嵌描述/更新规则整理为结构化规则（参考 `references/mvu/update-rules-guide.md`）

**6.3 替换模板文件与注册配置**

- 用 `assets/mvu-templates/世界书/变量/` 下的模板（`变量列表.txt`、`变量输出格式.txt`）替换旧版同功能条目
- 删除旧版 MVU 相关条目（旧的变量列表、旧的输出格式、旧的 InitVar 等）
- 应用 `assets/mvu-patch.json`（注册新 MVU 条目、脚本、正则）
- 复制 `assets/mvu-templates/` 整体到项目目录（脚本、正则等）
- 如旧卡已有 `extensions`/`regex_scripts`，直接应用 mvu-patch.json；否则先 mvu-prereq-patch.json 再 mvu-patch.json

**6.4 更新依赖组件**

所有依赖 MVU 变量的组件都需要相应调整：

| 组件 | 调整内容 |
|------|----------|
| 前端界面（`正则/*.txt`） | 变量路径、显示格式适配新结构 |
| 酒馆助手脚本（`脚本/*.txt`） | 变量读写路径适配 |
| EJS 条目中的 getvar() | stat_data 路径适配新 schema 结构 |
| 开场白中的 `<UpdateVariable>` 块 | 更新为 JSON Patch 格式；提取 initvar_override |

前端界面不止状态栏，还可能包含开局表单等其他界面。unpack 不会识别 HTML 内容，因此前端界面文件后缀仍为 `.txt`。需逐个检查 `正则/` 下所有文件，确认哪些是涉及 MVU 变量读写的前端界面（内容为 HTML）并分别适配。前端界面文件大多首尾有代码块标记（三个反引号 ` ``` `），编辑时需保留。

**6.5 校验**

- 运行 `node scripts/tavern-cards-forge.mjs validate-mvu {project}` 校验 initvar.yaml
- 执行 `references/mvu/guide.md` 收尾步骤第 4 步的 MVU 一致性检查

#### 用户拒绝迁移

保持旧版 MVU 不动，仅执行用户要求的具体修改。注意：此时不可使用 skill 的 MVU 编写流程（schema.md、update-rules-guide.md 等），这些文档仅适用于 Zod 版本。

### 7. 打包输出

```bash
node scripts/tavern-cards-forge.mjs pack {project}
```

工程文件保留在 `cards/{Project}/` 下，供后续修改使用。

---

## 错误处理

- unpack 失败（格式不支持、编码问题）→ 提示用户检查文件
- 条目名为空（无 comment）→ unpack 自动命名 `entry_{i}`，分类时由用户/AI 重命名
- configure 验证失败 → 按报错信息补全缺失配置
- 旧版 MVU 变量结构无法自动解析 → 询问用户说明变量含义和结构
