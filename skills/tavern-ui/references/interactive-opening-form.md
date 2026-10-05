# 开局表单前端界面（交互表单开局）

开局表单本身是一个前端界面。它覆盖表单式（纯占位符）与叙事 + 表单组合两种形态，以**自定义占位符**挂载到开场白，并配一对替换/隐藏正则（见 tavern-cards skill 的 `references/contents-creation/first-message.md#表单式`）。这些设计层面的约定由 tavern-cards 侧负责，本文档只讲前端界面的代码实现与部署。

- 纯文本版流程无法实现交互表单，必须走 frontend 分支，对应 tavern-cards 全流程中的 `ui_mode: frontend` 场景。

## 工程结构

开局表单是前端界面的一种，工程结构在 `src/{ProjectName}/界面/{界面名}/` 下起步，按是否使用 Vue 与界面数量伸缩：

- **入口与模板**：每个界面至少有 `index.ts` + `index.html` 作为加载入口与模板。
- **Vue 项目**：以 `App.vue` 主组件 + `components/` 子组件拆分（结构遵循 `SKILL.md`「目录骨架」），把渲染逻辑与读写/提交解耦。
- **多个界面共用 store.ts**：状态栏、开局表单等多个界面共存时，把 `store.ts` 上提到 `src/{ProjectName}/界面/store.ts`，各界面共用同一份 `defineMvuDataStore`，避免每界面各定义一份造成数据封装不一致。

以「开局表单」为例，多界面共用 store 时的结构：

```
src/{ProjectName}/界面/
├── store.ts          # 共用的 defineMvuDataStore
├── 状态栏/           # 含 index.ts / index.html / App.vue / components/ …
└── 开局表单/         # 含 index.ts / index.html / App.vue / components/ …
```

## 与开场白的连接

开局表单挂在开场白末尾的**自定义占位符**（如 `<OpeningPlaceHolder/>`），由一对替换/隐藏正则挂载（布局形态、占位符选择、正则注册的完整约定见 tavern-cards skill 的 `references/contents-creation/first-message.md#表单式` 与 `references/ui/regex-scripts.md`）。**前端本页只负责**：把编译产物（CDN 链接或内联）写进替换脚本的 `replace_file`（见下方「预览与部署」），隐藏脚本用 `replaceString: ""` 剔除占位符，二者共用同一 `findRegex`。

## 前端界面代码要点

### 读写 MVU 变量：`defineMvuDataStore` / `useDataStore`

读取/写入开局表单对应的 `stat_data`，与状态栏等界面保持一致（三写法详见 `references/mvu-variables.md`）：

```typescript
import { createPinia } from 'pinia';
import { defineMvuDataStore } from '@util/mvu';
import { Schema } from '../../schema';

export const useDataStore = defineMvuDataStore(Schema, {
  type: 'message',
  message_id: getCurrentMessageId(),
});

// 无 Vue 组件时传入显式 pinia 实例；Vue 组件内直接 useDataStore()
const store = useDataStore(createPinia());
store.data.主角.名称 = name; // 直接改，watch 自动写回 stat_data
```

- 界面入口须先 `await waitGlobalInitialized('Mvu')` 再 `await waitUntil(() => _.has(getVariables({ type: 'message' }), 'stat_data'))` 等 `stat_data` 落表（`stat_data` 由 MVU 脚本管理，与状态栏入口一致）。
- 用 zod schema 归一化，保证写出**完整 schema 形态**，与其他界面（状态栏）的读取端一致。
- 若旧数据含 schema 外字段会被剥离；缺失字段按 `prefault` 填充。需要新字段先补 `schema.ts`。

### 提交后触发 AI 生成：`createChatMessages` + `triggerSlash`

玩家提交表单后，写入变量并把玩家的选择/输入作为用户消息发送，再触发 AI 生成后续：

```typescript
import { createChatMessages } from '@types/function/chat_message';
import { triggerSlash } from '@types/function/slash';

createChatMessages([{ role: 'user', name: name, message: identity_desc }]).then(() => {
  triggerSlash('/trigger'); // 让 AI 铺开对应开场白场景
});
```

按玩家选项写入变量（如所选副本/人设）后，由 `createChatMessages` 发出对应选择、再用 `triggerSlash` 让 AI 铺开所选开局场景。

### 加载时执行

界面加载/卸载用 jQuery `$(() => {...})` / `'pagehide'`，不直接在全局作用域执行（见 tavern-helper-template 环境文档），并包一层 `errorCatched` 记录错误：

```typescript
function init() { /* 初始化 + 提交逻辑 */ }
$(() => { errorCatched(init)(); });
```

## 预览与部署

预览与部署流程与状态栏界面一致（`SKILL.md` 步骤 6-8），仅以下路径差异：

- 界面路径：`界面/状态栏/` → `界面/开局表单/`
- 正则文件名：`正则/状态栏界面.html` → `正则/开局表单界面.html`

以 CDN 写法为例（首尾各一行纯三反引号须保留）：

````
```
<body>
<script>
$('body').load('https://testingcf.jsdelivr.net/gh/{GH_USER}/{GH_REPO}/dist/{ProjectName}/界面/开局表单/index.html')
</script>
</body>
```
````

## 参考

- 变量读写三写法：`references/mvu-variables.md`
- tavern-cards 侧：开场白概念与规划见 tavern-cards skill 的 `references/contents-creation/first-message.md#表单式`；正则注册见 tavern-cards skill 的 `references/ui/regex-scripts.md`