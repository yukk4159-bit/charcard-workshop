# 错误处理

管理技术阶段及 SillyTavern 运行时的错误处理流程。

---

## 技术阶段

### patch 命令失败

schema 校验不通过、路径冲突、JSON 格式错误等：

1. 解读错误信息，定位具体问题（字段缺失、类型不匹配、路径已存在等）
2. 修正后重新执行 patch
3. 路径冲突时：检查是否为重复注册，确认后用 `replace` 操作覆盖或删除旧条目后重新 `add`

> **null 值迁移**：`recursion.delay_until`、`effect.sticky/cooldown/delay`、`regex_scripts.minDepth/maxDepth` 已收紧为 `.optional()`（禁止 `null`，仅允许缺省）。若旧 state.json 报 `expected number, received null`，把对应字段的 `null` 删除即可（留空即可省略）。

### MVU 校验失败

> MVU 校验失败 forge 会详细列出违法语句。
> 关键提示原文含「do NOT run `npm install`」「Cannot find module 'zod'」——遇到此类提示直接删除对应 import，**不要**给项目 `npm install zod`/`lodash`。

`state.zod` 缺失时 validate-mvu 会报错，需确保 `mvu-patch.json` 已正确应用（包含 `/zod` 的 add 操作）。Zod 脚本内容校验现在通过 `state.zod` 驱动，schema.ts 路径由 `state.zod.schemaPath` 定位。

**重复字段键**：报错形如 `duplicate field keys ... Schema.好感度: appears 2 times (lines 2, 3)`，列出键名、对象路径与全部出现行号。按提示定位 `schema.ts` 中对应的 `z.object`，删掉重复的键、只保留一个即可。复制粘贴字段时容易引入此类问题。

### pack 产出警告

pack 完成时可能输出两类警告，均为自动处置，确认产物即可：

- **avatar 回退**：`avatar` 非空但文件内容不是合法 PNG → 回退输出角色 JSON 卡。如需 PNG，更换为合法 PNG 头像后重新 pack。
- **后缀自动修正**：产物路径后缀与实际格式不符（如 `artifact` 配置 `.png` 但实际输出 JSON）→ 自动替换为正确后缀。按警告提示的最终路径取用产物。

## SillyTavern 运行时

以下错误发生在 SillyTavern 浏览器中，卡片已部署后运行时报错。

### EJS 条件抛 `xxx is not defined`

现象：打开聊天或生成时，酒馆 EJS 扩展自检报 `ReferenceError: xxx is not defined`；生成阶段可能不报，只在打开/preparation 阶段报。

根因：EJS 扩展用 `with(locals){...}` 包裹模板。`@@if` 条件里裸引用 `define()` 注册过的短名（如 `current_location?.includes(...)`），生成阶段 `define()` 恰好先执行所以不报；但 open/preparation 阶段条目执行顺序不保证（features.md 称 “Unordered processing”），短名可能尚未注册 → `with` 找不到标识符 → ReferenceError。`?.` 只防 TypeError，防不住未声明标识符的 ReferenceError。

修复：条件里不裸引用 `define()` 注册的短名，改用 `getvar('stat_data.xxx',{defaults})`——`getvar` 是 EJS 内置函数，任何阶段都在作用域，无顺序依赖。需要短名复用时，在该条目内用 `@@private` + `const x = getvar(...)`。

> 改造完成后，旧的全局定义条目（如 `EJS预处理`）可删除：其唯一作用是用 `define()` 为其他条目提供短名，现有条目已改为条目内 `getvar`/`const` 自取，该条目不再被引用。

### EJS 抛 `Identifier ... has already been declared`

现象：段落控制里用 `<%_ const x = getvar(...) _%>` 定义局部短名后，扩展报 `Identifier 'x' has already been declared`。

根因：条目内容文件里的 `const` 在 EJS 扩展的模板作用域中无块作用域隔离，当条目被多次处理（open/preparation 阶段或重新加载时重算）时，同一段 `const x` 会被再次声明而冲突。`@@if` 装饰器行是单行求值不涉及此问题，受影响的是条目内多行 EJS 代码。

修复：在条目首行加 `@@private` 装饰器——它会在条目首尾插入 `<% { %>`/`<% } %>` 形成块作用域，每次处理的 `const` 都封闭在该块内，不再跨求值冲突。凡是条目内容中用了 `const`/`let` 定义局部变量的条目，都应加 `@@private`。
