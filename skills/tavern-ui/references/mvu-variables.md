# MVU 变量读写方式：三种等价写法

> 本文说明 tavern-ui 前端界面读写 MVU 消息楼层变量（`stat_data`）的三种方式及其关系。
> 写法 A 为 `defineMvuDataStore` 响应式封装，是推荐方式；写法 B 直接使用酒馆助手变量接口；写法 C 是 MVU 框架自带的变量读写函数。

## 数据落点：三种写法读写的是同一个东西

前端界面运行在消息楼层 iframe 中，MVU 变量存放在「当前界面所在消息楼层」的变量表的 `stat_data` 字段：

```typescript
// 变量定位
const option = { type: 'message', message_id: getCurrentMessageId() };
// 数据路径
_.get(getVariables(option), 'stat_data');
```

三种写法最终都是对这个定位下的 `stat_data` 读写，因此**数据互通**，可视为等价。

## 三种写法概览

| | A. useDataStore（推荐） | B. 直接操作变量接口（酒馆助手） | C. MVU 变量读写函数 |
|---|---|---|---|
| 读 | `useDataStore().data`（响应式） | `getVariables(option)` + `_.get(..., 'stat_data')` | `Mvu.getMvuData(option)` + `_.get(..., 'stat_data')` |
| 写 | 改 `store.data` 自动写回 | `updateVariablesWith` / `insertOrAssignVariables` + `_.set` / `_.merge` | `Mvu.getMvuData` → 修改 → `await Mvu.replaceMvuData` |
| 前置条件 | 界面入口两道等待 | 楼层 `stat_data` 时同 A；其它位置变量无需等待 | `await waitGlobalInitialized('Mvu')`（直接调用 `Mvu` 对象） |
| 响应式 | ✅ 双向同步（watch 写回 + 2s 轮询读入） | ❌ 一次性命令式 | ❌ 一次性命令式（异步） |
| schema 校验 | ✅ zod 解析 + prefault 默认值 | ❌ 无 | ❌ 无 |
| 同步机制 | watch 微任务 + 2s 轮询 | 同步 / 函数式 | 异步（`Promise`） |

## 写法 A：useDataStore（推荐）

### 定义 store

`界面/状态栏/store.ts`：

```typescript
import { defineMvuDataStore } from '@util/mvu';
import { Schema } from '../../schema';

export const useDataStore = defineMvuDataStore(Schema, {
  type: 'message',
  message_id: getCurrentMessageId(),
});
```

### 在 Vue 组件中使用

```typescript
import { useDataStore } from './store';

const store = useDataStore();
store.data.主角.好感度 = 80; // 直接改，自动写回 stat_data
```

### 在无 Vue 的界面（jQuery 等）中使用

pinia store 需要显式传入实例（模块顶层创建一次，勿在回调里重复创建）：

```typescript
import { createPinia } from 'pinia';
import { useDataStore } from './store';

const store = useDataStore(createPinia());
```

### 同步机制（`util/mvu.ts` 的 `defineMvuDataStore`）

| 方向 | 机制 | 说明 |
|------|------|------|
| 写回 | `watchIgnorable(data, ..., { deep: true })` | 深监听 `store.data` 变化 → `updateVariablesWith` 写回 `stat_data`（watch 微任务，非同步） |
| 读入 | `useIntervalFn(..., 2000)` | 每 2s 读一次楼层 `stat_data`，解析后与 store 数据比对，不一致则替换；若原始数据非 schema 形态还会归一化写回 |

- 初始化：`Schema.parse(_.get(getVariables(option), 'stat_data', {}))`，缺失字段由 zod `prefault` 填默认值
- 因此**无需手写默认值**（积分/HP/MP/战力/空记录等由 schema 填充），也无需 `_.merge` 合并
- **界面入口等两道就绪**（楼层 `stat_data` 场景下写法 B 相同）。`defineMvuDataStore` 内部只调用 `getVariables` / `updateVariablesWith`，不直接调用 `Mvu` 对象；但界面展示的是 MVU 脚本管理的楼层 `stat_data`，入口须先等 MVU 框架初始化、再等 `stat_data` 写入楼层变量表，如下：

  ```typescript
  import { waitUntil } from 'async-wait-until';
  import App from './App.vue';
  import { useDataStore } from './store';

  $(async () => {
    await waitGlobalInitialized('Mvu');
    await waitUntil(() => _.has(getVariables({ type: 'message' }), 'stat_data'));
    createApp(App).use(createPinia()).mount('#app');
    const store = useDataStore();
  });
  ```

  两道等待各管一件事：

  - `await waitGlobalInitialized('Mvu')`：等 MVU 框架（`window.Mvu`）初始化完成，此后 `Mvu` 对象可用（写法 C 直接依赖它）。
  - `await waitUntil(() => _.has(getVariables({ type: 'message' }), 'stat_data'))`：等 MVU 脚本把 `stat_data` 写入当前消息楼层的变量表。框架就绪不代表数据已落表——楼层 `stat_data` 由 MVU 世界书脚本在楼层加载时写入，未等到落表就初始化 store，`Schema.parse` 只会拿到空对象填出的默认值。

## 写法 B：直接操作变量接口（酒馆助手）

```typescript
// 读
const variables = getVariables({ type: 'message', message_id: getCurrentMessageId() });
const stat_data = _.get(variables, 'stat_data', {});

// 写（一次性、命令式）
const option = { type: 'message', message_id: getCurrentMessageId() };
updateVariablesWith(variables => {
  const cur = _.get(variables, 'stat_data', {});
  _.set(variables, 'stat_data', _.merge({}, cur, stat)); // 手动合并、手动补默认值
  return variables;
}, option);
```

相关接口：`getVariables` / `replaceVariables` / `insertOrAssignVariables` / `updateVariablesWith`（`@types/function/variables.d.ts`）。

特点：

- **等待时机**：楼层 `stat_data` 由 MVU 脚本管理，读写前入口用与写法 A 相同的两道等待。读写其它位置的变量（如 chat 级变量）无需等待；但默认流程的 `stat_data` 在消息楼层，不等待就读到尚未落表的空数据。
- 一次性命令式读写，无响应式绑定
- 需手写默认值、手写合并（`_.merge`）、手动保证与 schema 一致
- 无类型约束（`_.set` 接受任意结构，错字段只在运行时暴露）

## 写法 C：MVU 变量读写函数（`Mvu` 对象）

**必须先用 `await waitGlobalInitialized('Mvu')` 等待 MVU 框架初始化**（接口见 `@types/iframe/exported.mvu.d.ts`，窗口对象为 `window.Mvu`）。

```typescript
await waitGlobalInitialized('Mvu');

// 读：返回完整 MvuData 表（含 stat_data、initialized_lorebooks 等键）
const mvu_data = Mvu.getMvuData({ type: 'message', message_id: getCurrentMessageId() });
const stat_data = _.get(mvu_data, 'stat_data');

// 写：整体替换变量表（异步）——必须先 get 再改再 replace，否则会丢掉表内其他键
const mvu_data = Mvu.getMvuData({ type: 'message', message_id: getCurrentMessageId() });
_.set(mvu_data, 'stat_data.主角.好感度', 80);
await Mvu.replaceMvuData(mvu_data, { type: 'message', message_id: getCurrentMessageId() });
```

相关函数：

| 函数 | 说明 |
|------|------|
| `Mvu.getMvuData(option)` | 读：获取变量表，视为含 `stat_data` 的 MvuData |
| `Mvu.replaceMvuData(mvu_data, option)` | 写：**整体替换**整个变量表（异步）。直接换掉表内所有键，需保留原表其它内容（如 `initialized_lorebooks`）时用 get → 修改 → replace 模式 |
| `Mvu.parseMessage(message, old_data)` | 解析含变量更新命令（`_.set(...)`）的消息文本，返回更新后的 MvuData（无更新则 `undefined`）。**写法 C 独有能力** |
| `Mvu.isDuringExtraAnalysis()` | 酒馆是否正在进行额外模型解析 |
| `Mvu.events.*` | 事件监听：`VARIABLE_UPDATE_ENDED`（更新结束，可二次修正）、`COMMAND_PARSED`（命令解析，可修复命令）等。**写法 C 独有能力** |

特点：

- `await waitGlobalInitialized('Mvu')` 是写法 C 的硬前置——本节开头示例直接调用 `window.Mvu` 对象。写法 A/B 的两道等待见写法 A「界面入口」。
- `replaceMvuData` 是异步整体替换，不是合并——只改 `stat_data` 时不能直接构造新表 `{stat_data: ...}` 传进去，否则 `initialized_lorebooks` 等键丢失
- 独有能力：`parseMessage` 解析 MVU 命令文本；`Mvu.events` 监听/修正变量更新。典型场景是用 `generate` / `generateRaw` 自行请求 AI（不产生新消息楼层，MVU 不会自动解析命令）时，手动 `parseMessage` + `replaceMvuData` 完成更新

## 三种写法的关系

1. **分层结构**：

   ```
   酒馆助手变量接口（getVariables / updateVariablesWith / insertOrAssignVariables …）   ← 最底层
      ├─ 写法 B 直接使用
      └─ 写法 A 的 defineMvuDataStore 内部基于它实现（util/mvu.ts）
   写法 C 的 Mvu 对象（getMvuData / replaceMvuData / parseMessage / events）           ← MVU 框架层
   ```

2. **数据互通**：三者读写同一楼层 `stat_data`（见「数据落点」），任一写法写入的数据其他写法都能读到；写法 A 的 2s 轮询会把外部写入同步进 store，非 schema 形态还会归一化。
3. **A 受 schema 约束，B/C 无**：写法 A 写出完整 schema 形态（未知字段剥离、缺失字段 prefault 填充），初始化 `Schema.parse` 严格——楼层已有不合 schema 的值会 throw、界面 JS 失效；B/C 写入的是调用方拼的原始结构，无校验，错误延后到读取端。
4. **写入语义**：B 的 `updateVariablesWith` / `insertOrAssignVariables` 是合并更新（可只动 `stat_data`）；C 的 `Mvu.replaceMvuData` 是整表替换，须 get → 改 → replace 保住表内其他键（见写法 C 特点）。

## 为什么推荐写法 A

- **一致性**：全项目界面统一 `useDataStore`，读写模式单一
- **schema 校验 + prefault 默认值**：不必手写默认值与 `_.merge`
- **响应式**：组件内改 `store.data` 自动写回，多组件共享同一数据
- **归一化**：写出的 `stat_data` 恒为完整 schema 形态，与读取端（状态栏）期望一致

## 迁移注意点（B / C → A）

- **无 Vue 组件时**：需 `useDataStore(createPinia())` 显式传 pinia 实例；在模块顶层创建一次
- **类型约束**：赋值对象必须满足 schema 的输出类型——如 `交际.系统娘` 需显式写 `战力: ''` 等必填字段，否则报 TS2741（写法 B 的 `_.set` 无此检查）
- **schema 完整性**：若旧数据含 schema 外字段（如 `队友`），写法 A 写入时会被剥离；需要该字段就先在 schema.ts 补定义
- **写入时机**：从同步变为 watch 微任务。界面内紧接的 `createChatMessages` / `triggerSlash`（AI 生成秒级）不受影响，watch 早已 flush
- **初始 parse 严格**：若该楼层 `stat_data` 可能已存在 AI 写入的不合 schema 的值，需先确认数据形态、补 schema 或清理数据，否则 store 实例化失败

## 何时用 B / C 而非 A

- **写法 B**：一次性初始化 / 数据迁移（无界面、无响应式需求）；脚本（无 Vue）中只读或低频写入
- **写法 C**：需要 MVU 独有能力时——自行 `generate` / `generateRaw` 后解析命令（`parseMessage`）、监听并二次修正变量更新（`Mvu.events`）；或 MVU 世界书 initvar / 初始化场景
- 但**前端界面内**应统一使用写法 A，避免同一项目多种写法并存

## 参考

以下路径均在 tavern_helper_template 仓库内：

- 仓库内置 skill：`.agents/skills/mvu-variable-framework/SKILL.md`——两道等待语义、`Mvu` 接口与事件用法
- 状态栏界面示例：`示例/角色卡示例/界面/状态栏/`——`index.ts` 的入口两道等待写法、`store.ts` 的 `defineMvuDataStore` 用法
- 变量接口类型：`@types/function/variables.d.ts`（写法 B 接口）、`@types/iframe/exported.mvu.d.ts`（写法 C 接口）、`util/mvu.ts`（写法 A 实现）
