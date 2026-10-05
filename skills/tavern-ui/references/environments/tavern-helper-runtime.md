# Tavern-Helper 运行时环境

> 酒馆助手扩展（Tavern-Helper，仓库 [JS-Slash-Runner](https://github.com/N0VI028/JS-Slash-Runner)）的运行时行为、iframe 隔离边界、生命周期管理。
> `tavern_helper_template/@types/` 已覆盖全部 API 签名、事件枚举、类型声明，**本文档不重复**。
>
> **版本：v4.8.19**（最低酒馆 1.12.13）。本文档基于该版本编写，其他版本的行为细节可能不一致。

---

## iframe 类型

| 维度 | 消息楼层 iframe | 全局脚本 iframe |
|------|----------------|-----------------|
| 名称 | `TH-message--{message_id}--{swipe_id}` | `TH-script--{script_id}--{脚本名称}` |
| 创建 | 消息渲染时 `panel/render/iframe.ts` | 脚本启用时 `panel/script/iframe.ts` |
| 用途 | 渲染前端 UI（Vue 组件、HTML） | 后台脚本逻辑 |

两类 iframe 的根本差异：

- **消息楼层**：用户内容放在 `<body>` 中作为 **HTML 渲染**，依赖的 loader 是 `HtmlWebpackPlugin` → 单文件 HTML 产物。
- **脚本**：用户代码放在 `<script type="module">` 中，**ES module 作用域**，变量不泄露到全局。

**入口判断**：`webpack.config.ts` 中 entry 有 `index.html` 即消息楼层类型（`HtmlWebpackPlugin`），否则是脚本类型（`style-loader` 方式）。

## 隔离边界

**不存在沙箱隔离**。两类 iframe 均无 `sandbox` 属性，srcdoc 天然同源。

| 能力 | 可行 | 说明 |
|------|------|------|
| `window.parent.document` 访问主界面 DOM | ✅ | 无 sandbox，同源 |
| 修改 `window.parent` 全局变量 | ✅ | `cleanup_protector.js` 记录写入，pagehide 时恢复 |
| 直接操作主界面 DOM | ✅ | 脚本 iframe 中 `$ === parent.$`，无包装 |

隔离主要靠：
- **约定**：不主动访问主界面 DOM，用 `eventOn`/`eventEmit`/`getVariables` 等 tavern_helper API 通信
- **CSS 隔离**：iframe srcdoc 结构天然隔离样式，不污染主界面
- **脚本 iframe** 的 `cleanup_protector.js`：Proxy 包装 `window.parent`，劫持 DOM 创建打 `data-th-iframe-id` 标记，pagehide 时按标记批量清理（`closest()` 查询用 `CSS.escape()` 转义 iframeId，兼容含特殊字符的脚本名）——但这些是**清理追踪**而非**访问阻止**
- **消息楼层 iframe 完全不加载** `cleanup_protector.js` 和 `parent_jquery.js`，`window.parent` 没有被 Proxy 包装，可直访父窗口

## 预注入机制

脚本在 iframe `<head>` 中按固定顺序**同步加载**：

1. CDN 脚本（Vue、Vue Router、jQuery 等，`third_party_*.html` 声明）
2. `predefine.js` — 从 `window.parent` 复制全局对象并绑定 API 到 iframe 全局
3. `log.js` — 日志重定向
4. 脚本 iframe 加载 `cleanup_protector.js`；消息楼层加载 `adjust_viewport.js` + `adjust_iframe_height.js`
5. 用户代码执行时，所有预注入已完成

`predefine.js` 注入逻辑（`src/iframe/predefine.js`）：

1. `window._ = window.parent._`（lodash 继承）
2. `window.__TH_IFRAME_ID` / `window.name` — 持久化 iframe 标识（三重 fallback：frameElement.id → __TH_IFRAME_ID → window.name）
3. 复制 `EjsTemplate`、`TavernHelper`、`YAML`、`showdown`、`toastr`、`z`
4. `TavernHelper._bind` 中下划线前缀函数解绑到 iframe `window`：`_eventOn → eventOn`、`_getVariables → getVariables` 等
5. Vue 编译时标志：`__VUE_PROD_DEVTOOLS__`=true、`__VUE_OPTIONS_API__`=true、`__VUE_PROD_HYDRATION_MISMATCH_DETAILS__`=false（兼容 pinia 4.0.0+）
6. `SillyTavern` — getter 注入，每次访问都调用 `getContext()` 返回新对象
7. `Mvu` — 条件性代理 getter，`await waitGlobalInitialized('Mvu')` 后可用
8. `pagehide` 事件 → `eventClearAll()`

> CDN 阻塞风险：CDN `<script>` 同步加载，不可达时 iframe 阻塞至超时（30-60s），是 iframe 白屏最常见原因。预注入全局变量清单及离线切换方法详见 `references/environments/tavern-helper-template.md` §10.3、§11.3。

## 变量作用域链

变量分 5 层存储（`src/function/variables.ts`）：

| 类型 | 存储 | 持久化 |
|------|------|--------|
| `global` | `extension_settings.variables.global` | 用户设置文件 |
| `character` | Pinia store | 角色卡数据 |
| `chat` | `chat_metadata.variables` | 聊天元数据 |
| `message` | `chat[message_id].variables[swipe_id]` | 消息楼层 |
| `script` | Pinia store `.data` | **不持久化**，内存中 |

**读取链（`getAllVariables()` 合并）**：

- 消息楼层 iframe：`global → character → chat → message[0..当前]`——**包含**所有消息楼层变量
- 脚本 iframe：`global → character → script → chat`——**不含消息楼层变量**

> **常见错误**：脚本 iframe 中 `getAllVariables()` 读不到 `message` 变量；须用 `getVariables({ type: 'message', message_id: ... })` 显式获取。

消息楼层变量结构为数组（按 swipe 索引），兼容旧版的 plain object 格式。

变量写操作会自动触发节流保存（`message` → `saveChatConditionalDebounced`，`chat` → `saveMetadataDebounced`，`global` → `saveSettingsDebounced`）。

## 事件与清理

事件系统是**跨 iframe 的**——所有 iframe 共享同一个主线程 `eventSource` 实例。

iframe 注册的 listener 会被自动 wrapper 化：
- 以 `iframe_name` 为键存入 `listener_wrapper_map`
- 幂等：相同 listener 已注册时不重复加
- iframe `pagehide` 触发 `eventClearAll()` → 遍历 map 逐个 `removeListener`

> **安全约束**：`eventOn` 所在 iframe 销毁时，监听自动卸载。但 `pagehide` 在极端情形（浏览器强制关闭）下不一定可靠，理论上有残监听风险。
> **不建议主动 `eventEmit` 酒馆事件**（`@types/` 中已标注），因为发送数据格式未知。

## iframe 高度自适应（仅消息楼层）

`adjust_iframe_height.js`：

- `ResizeObserver` 监听 `document.body`，500ms 节流
- 直接写 `frameElement.style.height = scrollHeight + 'px'`

`adjust_viewport.js`：

- 在 `<html>` 上设 `--TH-viewport-height` CSS 变量 = `parent.innerHeight`
- iframe 中 `100vh` 等于 iframe 自身高度而非父窗口，于是 `createSrcContent` 会扫描内容中的 `vh` 替换为 `var(--TH-viewport-height)` 计算
- 替换**仅覆盖 4 种模式**：CSS 声明块、行内 `style`、`element.style.minHeight`、`setProperty('min-height', ...)`。其他绕过预扫描的动态 `vh` 写法**不会被替换**，可能布局错误

## 错误排查速查表

| 症状 | 根因 |
|------|------|
| `getAllVariables()` 在脚本中读不到 `message` 变量 | 脚本 iframe 作用域链不含 `message` 层，须 `getVariables({ type: 'message', ... })` |
| `getCurrentMessageId()` 报错 | 在脚本 iframe 中调用，仅限 `TH-message--` 前缀 |
| `getScriptId()` 报错 | 在消息楼层 iframe 中调用，仅限 `TH-script--` 前缀 |
| 写入变量后值丢失 | `script` 类型变量不持久化，改用 `global`/`chat`/`message` |
| `message` 变量在前端读不到 | `schema.ts` 缺该字段；补 schema 字段或改前端引用，先询问用户以哪一侧为准（先跑 vue-tsc 定位，见 `references/environments/tavern-helper-template.md` 的 §8.4） |
| 事件监听不触发 | iframe 已销毁（pagehide 已清理）或函数引用与其它 iframe 冲突 |
| CDN 加载阻塞 | CDN `<script>` 同步加载，不可达会阻塞 iframe；检查 `testingcf.jsdelivr.net` 可达性 |
| `vh` 单位导致布局错乱 | 仅 4 种模式的 `vh` 被替换为 `--TH-viewport-height` 计算，绕过预扫描的动态 `vh` 不替换 |
| 脚本静默失败 | `<script type="module">` 内异常不影响 iframe 全局；用 `errorCatched()` 包装或查 console |
| `SillyTavern` 对象每次访问返回新对象 | 每次访问 getter 都重新调用 `getContext()`，**返回的不是引用**，不能跨步保留后比对同一对象 |
| 预设/角色脚本在 pagehide 时读脚本信息失败 | 已知问题：pagehide 时角色卡已切换，`get()` 返回空（`function/script.ts` 已注 TODO） |
| 消息楼层 iframe 创建的 DOM 在切换楼层后残留在主界面 | 消息楼层 iframe **不加载** `cleanup_protector.js`，没有标记追踪清理机制，主界面残留靠 DOM 整体回收 |
| 在消息楼层 iframe 中操作主界面 DOM 出现意外 | 消息楼层 iframe 中 `window.parent` **未经任何包装**，直接访问可用但清理不托底，改用 tavern_helper API |
