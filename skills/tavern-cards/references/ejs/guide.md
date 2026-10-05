# EJS 方案编写

EJS 方案在条目创作时一并处理（见 `references/conventions.md`）。本文档提供复杂度分级、语法参考和常见模式。

## 编写原则

- EJS 方案按复杂度从低到高：条目显隐 → 段落控制 → 动态文本
- 条目显隐：通过 `contents` 首片段嵌入 `@@if`，不编辑条目内容文件
- 段落控制和动态文本：需编辑条目内容文件
- 所有中文内容使用简体中文，不使用繁体字

**前置**：若项目使用 MVU，schema.ts 已完成。

## EJS 在世界书中的作用

EJS 允许在世界书条目中嵌入代码逻辑，根据变量值动态控制发送给 AI 的提示词内容。常见用途：

- 根据好感度/阶段/状态切换不同人设
- 根据位置/场景加载不同区域设定
- 根据剧情分支渲染不同内容

### 优势

- **精准控制**：只发送当前需要的设定，节省 token
- **自动判断**：不依赖关键词匹配，用变量条件直接控制
- **多维触发**：同时根据多个维度（区域+事件+人物+阶段...）决定内容

## 基础语法速览

| 标签 | 作用 |
|------|------|
| `<%_ 代码 _%>` | 执行代码，不输出，自动去除前后空白（推荐） |
| `<%- 表达式 %>` | 输出原值（不转义） |
| `<%= 表达式 %>` | 输出值（HTML 转义） |

详细语法见 `references/ejs/reference.md` 和 `references/ejs/features.md`。

## 复杂度分级

直接使用编写规划文档的 `ejs.entries[].complexity` 判定：

| 复杂度 | 特征 | 处理方式 | 读取完整知识库 |
|------|------|---------|--------------|
| **条目显隐** | 单一条件、条目级显隐 | `contents` 首片段嵌入 `@@if` | 否 |
| **段落控制** | if/else 分支 | 内容文件内写 EJS 条件语句 | 否 |
| **动态文本** | `<%=` 动态文本替换、setvar/incvar、injectPrompt、activateRegex 等 | 读取 `reference.md` + `features.md` 后处理 | 是 |

**升级规则**：
- 条目显隐需要更精细控制（条目内 if/else 分支）→ 段落控制
- 段落控制语法不足（需要动态文本替换、变量操作等）→ 动态文本，先读取 `reference.md` 和 `features.md`


## 条目显隐（@@if 内联 getvar）

条目级显隐通过 `contents` 首片段嵌入 `@@if 条件`，不编辑条目内容文件。

`@@if 条件表达式` 之后不必换行，contents 各片段之间自动换行。

`getvar()` 是 EJS 内置函数，路径必须带 `stat_data.` 前缀，使用点分隔：`stat_data.角色.好感度`。务必通过 `{ defaults: 值 }` 参数添加默认值兜底，确保不会因变量未注册而抛 ReferenceError。

### 条件表达式示例

| 表达式 | 含义 |
|--------|------|
| `getvar('stat_data.世界.当前区域', { defaults: '' }).includes('万剑山')` | 变量包含某值 |
| `getvar('stat_data.角色.好感度', { defaults: 0 }) >= 60` | 数值比较 |
| `['explore','battle'].includes(getvar('stat_data.阶段.当前阶段', { defaults: '' }))` | 多值匹配（或） |
| `getvar('stat_data.角色.好感度', { defaults: 0 }) > 30 && getvar('stat_data.角色.信任度', { defaults: 0 }) > 20` | 多条件同时满足（与） |

### 关键词匹配

`matchChatMessages` 扫描聊天消息中的关键词，效果类似🟢但可自由控制与/或关系：

```
matchChatMessages(['关键词A', '关键词B'])                // 扫描最后2楼
matchChatMessages(['关键词A', '关键词B'], { start: -5 }) // 扫描最后5楼
```

与变量条件组合使用：

```
getvar('stat_data.世界.当前区域', { defaults: '' }).includes('万剑山') || matchChatMessages(['剑宗', '万剑山'])
```

### 条目显隐示例

```json
{
  "name": "中央神州",
  "part": "region",
  "contents": [
    { "content": "@@if getvar('stat_data.世界.当前区域', { defaults: '' }).includes('中央神州')" },
    { "file": "世界书/地理/中央神州.yaml" }
  ]
}
```

pack 时脚本自动将首片段 `@@if` 与后续内容组合为带条件装饰器的条目。

## 段落控制（条件渲染）

段落控制在条目内容文件内部用 EJS 条件语句根据 MVU 变量状态决定渲染哪些内容。状态变化时，同一个条目输出完全不同内容。

既可以把不同内容分拆到不同条目用 `@@if` 控制显隐，也可以全部放在一个条目里用条件语句控制。

### 条件控制语法（@@private + const 局部短名）

在条目内容文件内，先用 `@@private` + `const` 定义局部短名，再用 EJS 条件语句根据变量状态决定渲染哪些内容：

```
@@private
<%_ const affection = getvar('stat_data.角色.好感度', { defaults: 0 }); _%>
<%_ if (affection >= 60) { _%>
好感高阶段内容
<%_ } else if (affection >= 30) { _%>
好感中阶段内容
<%_ } else { _%>
好感低阶段内容
<%_ } _%>
```

- `@@private` 自动为条目包裹块作用域 `<% { %>`...`<% } %>`，`const affection` 不会与其它条目或重复预处理冲突。
- 短名只在条目内有效，一次 `getvar` 多次复用，可读性高，但无跨条目顺序依赖、无 preparation 阶段报错。

## 动态文本与高级能力

动态文本适用于 `<%=` 动态文本替换、变量操作、动态加载条目、提示词注入等场景。处理前先读取 `references/ejs/reference.md` 和 `references/ejs/features.md`。

### 常用装饰器

| 装饰器 | 作用 |
|--------|------|
| `@@if 条件` | 条件为 false 时排除此条目 |
| `@@generate_before` | 注入到提示词开头（等价 `[GENERATE:BEFORE]`） |
| `@@generate_after` | 注入到提示词末尾（等价 `[GENERATE:AFTER]`） |
| `@@render_before` | 渲染到消息开头（等价 `[RENDER:BEFORE]`，不发给 AI） |
| `@@render_after` | 渲染到消息末尾（等价 `[RENDER:AFTER]`，不发给 AI） |
| `@@private` | 自动包裹作用域，避免变量重复声明；配合 `const` 在条目内定义局部短名 |

### 常用函数

| 函数 | 作用 |
|------|------|
| `getvar('路径')` | 读取变量 |
| `getvar('路径', { defaults: 值 })` | 读取变量，不存在时返回默认值（推荐） |
| `setvar('key', value)` | 写入变量 |
| `incvar('key', n)` | 增加变量值（支持 min/max） |
| `decvar('key', n)` | 减少变量值（支持 min/max） |
| `await getwi('条目名')` | 动态加载其他世界书条目 |
| `await activewi('条目名')` | 激活条目 |
| `define('name', value)` | 定义全局常量；仅供需要跨条目共享全局函数/常量时使用 |
| `getChatMessage(idx)` | 获取指定楼层消息 |
| `matchChatMessages([关键词])` | 关键词匹配扫描 |

## 易错点

1. `getwi()` 必须加 `await`
2. MVU 变量路径必须带 `stat_data.` 前缀
3. `@@if` 条件禁止裸引用标识符（如 `current_location?.includes`）；preprocessing / preparation 阶段变量可能尚未注册，会抛 ReferenceError。必须用 `getvar('stat_data.xxx',{defaults})` 读取
4. `@@private` 配合 `const` 定义条目内局部短名，避免与其它条目或重复预处理导致 `Identifier ... has already been declared`
5. 装饰器与内容之间不能有空行
6. 一个条目只使用一个装饰器

## EJS 收尾检查

MVU 变量完成后执行（SKILL.md 主流程第 6 步）。

### 1. 变量定义完整性

- [ ] 收集 EJS 条件/分支引用的 MVU 变量路径（从规划文档的 `ejs.entries[].condition` 获取），与 schema.ts 中已定义的变量对照
- [ ] 未定义的变量返回 MVU 流程补全 schema.ts

### 2. EJS 变量读取与条件检查

- [ ] 所有 `@@if` 条件与段落控制分支以 `getvar(...,{defaults})` 读取变量，而非直接访问 `stats` 对象
- [ ] MVU 变量路径带 `stat_data.` 前缀：`getvar('stat_data.角色.变量',{defaults})`
- [ ] 条件中无裸标识符引用（如 `current_location?.includes` 等未注册的标识符）
- [ ] `@@` 装饰器必须在文件首行（`contents` 中的 XML 标签也必须在装饰器之后）
- [ ] EJS 条件语句语法正确
- [ ] 条件分支覆盖所有情况（if/else if/else）
