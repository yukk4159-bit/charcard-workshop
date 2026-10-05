# tavern_helper_template 开发环境参考文档

> **本文档截至 2025-07-23 的 commit `ff2bba6` 编写。** 版本变更后，文中引用的行号、目录结构、配置项细节可能与新版本不一致。使用时应以实际代码为准，并将行号信息作为定位参考而非绝对依据。
>
> 用途：AI 开发者遇到构建/打包/部署/运行错误时，快速定位根因。
>
> 本文档覆盖 tavern_helper_template 项目的目录骨架、构建链路、CI 机制、开发约定、预注入全局变量清单及依赖打包决策规则。源码引用路径均相对于 tavern_helper_template 仓库根目录。

---

## 1. 项目目录约定

### 1.1 `src/` vs `示例/`

- **`src/`**：用户工作目录（初始仅有 `.gitkeep`）。webpack 入口扫描 `{示例,src}/**/index.{ts,tsx,js,jsx}`（`webpack.config.ts:54`）。
- **`示例/`**：参考示例代码，**不应删除**。webpack 默认也打包示例入口；可在 `webpack.config.ts:54` 将范围改为 `src/` 跳过。
- **CI**（`bundle.yaml`）：上游保留示例，分叉仓库自动删除示例产物。

**常见问题**：`src/` 下新建目录后 webpack 没扫描到 → 检查目录内是否有 `index.ts`/`index.tsx`/`index.js`/`index.jsx`。

### 1.2 `dist/` 产出结构

- 保留入口**同路径**目录结构（`webpack.config.ts:216-220`）。
- 前端界面（有 `index.html`）额外产出 `*.html`、`*.css`、`*.js.map`。
- 每次 build 前以 `output.clean: true`（`webpack.config.ts:221`）清空。

### 1.3 三个 CI 工作流

| 工作流 | 触发 | 主要操作 | 关键细节 |
|--------|------|---------|---------|
| `bundle.yaml` | push master/main（不含 dist/）+ workflow_dispatch | `pnpm install && pnpm build` → commit dist/ → 打 tag | JesseTG/rm 清空 dist/ → pnpm install && pnpm build → 上游仅保留角色卡示例/分叉删全部示例 → commit dist/ → autotag 打版本号（让 jsdelivr 12h 刷新而非 7d） |
| `bump_deps.yaml` | 每 3d cron + workflow_dispatch | `pnpm update` → 更新 `@types/` → 更新 `tavern_sync.mjs` | 仅 `pnpm-lock.yaml` 变更时不提交；Node 22（`bump_deps.yaml:19`） |
| `sync_template.yaml` | 每天 3am cron + workflow_dispatch | 从 StageDog/tavern_helper_template 同步，PR 形式 | 仅非上游仓库执行 |

分叉仓库需设置 `Workflow permissions = Read and write`。`bundle.yaml` 用 Node 24（`bundle.yaml:31`），`bump_deps.yaml` 用 Node 22（`bump_deps.yaml:19`）。

### 1.4 其他配置文件

- **`.github/.templatesyncignore`**：忽略 `.github/workflows`、`@types`、`dist`、`README.md`。
- **`.gitattributes:5`**：`dist/** merge=ours`，冲突时以当前分支版本为准。手动合并后应重新 `pnpm build`。
- **`eslint.config.mjs`**：flat config。关键规则：`import-x/no-cycle: error`、`import-x/no-unresolved: [2, { ignore: ['^http'] }]`、`no-undef: off`、`'vue/multi-word-component-names': off`。全局忽略 `dist/**`、`node_modules/**`。使用 `better-tailwindcss` 插件做类名排序检查。
- **`AGENTS.md`**：面向 AI 协作的编写通用指南（项目结构、酒馆助手接口清单、特殊导入方式、最佳实践、日志与错误处理）。开发时可直接读此文件了解项目通用约定。
- **`.agents/skills/`**：按主题拆分的 skill 文档，每个子目录含一个 `SKILL.md`，供 AI 按需加载对应场景的详细规则：
  - `tavern-helper-frontend/`：前端界面项目（`index.ts` + `index.html`）的编写规则，含 `index.html` 允许内容、图标使用、iframe 适配要求。
  - `tavern-helper-script/`：脚本项目（仅 `index.ts`）的编写规则，含 jQuery 作用域、Vue 组件挂载到酒馆网页的两种样式方案（`teleportStyle` 复制样式 vs `createScriptIdIframe` 隔离）、脚本设置、按钮注册。
  - `mvu-variable-framework/`：MVU 变量框架接口使用规则，含 `waitGlobalInitialized('Mvu')` 初始化等待、`stat_data` 数据存储、`parseMessage` 自行解析、`COMMAND_PARSED` 与 `VARIABLE_UPDATE_ENDED` 事件。
  - `mvu-character-card/`：完整 MVU 角色卡（脚本 + 界面 + 世界书 + `schema.ts`）的组织规则，含 zod 4 变量结构编写要求、世界书 `[mvu_update]变量更新规则` 条目格式、`defineMvuDataStore` 用法。

---

## 2. 三种入口模板结构

### 2.1 前端界面

**文件**：`index.ts`（`createApp(App).mount('#app')` + `pagehide` 卸载）、`App.vue`、`index.html`（`<div id="app">`）。

**特征**：有 `index.html` → webpack 识别为前端界面（`webpack.config.ts:32-38`）。产物：`*.html` + 内联 CSS + 内联 JS（`HtmlWebpackPlugin` + `HtmlInlineScriptWebpackPlugin` + `HTMLInlineCSSWebpackPlugin`）。挂载到酒馆 iframe 中。

### 2.2 流式楼层界面

**文件**：`index.ts`（`mountStreamingMessages(() => createApp(App))`）、`App.vue`（通过 `injectStreamingMessageContext()` 获取楼层上下文）、`store.ts`（Pinia store）。

**特征**：**无 `index.html`** → webpack 识别为脚本类型。CSS 用 `style-loader` + `vue-style-loader`（配合 `sass-loader`），不提取独立文件。通过 `mountStreamingMessages()` 挂载到每个消息楼层。

### 2.3 脚本

**文件**：`index.ts` 纯脚本入口，无 UI 组件，无 Vue 生命周期。模板入口文件为空。

**特征**：最小入口，通常使用酒馆助手 slash command API 或事件监听。无 `createApp`，函数式而非组件式。

### 2.4 示例覆盖场景

| 示例目录 | 覆盖 |
|---------|------|
| `角色卡示例/` | 完整角色卡项目（schema + 界面/状态栏 + 脚本/MVU + 世界书 + 第一条消息） |
| `前端界面示例/` | 界面.vue、日记.vue、选择框.vue、加载/卸载函数 |
| `脚本示例/` | settings、消息监听、聊天变更重载、设置界面(.vue)、楼层调整 |
| `流式楼层界面示例/` | App.vue + 分段.vue + 搜索框.vue + 高亮.vue |

### 2.5 初始模板

`初始模板/` 提供四种类型的起步脚手架：前端界面、流式楼层界面、脚本、角色卡。每种含 `新建为src文件夹中的文件夹/`（模板文件，复制到 `src/` 下作为项目起点）和 `导入到酒馆中/`（`*实时修改.json`，用于本地实时预览，见 §4）。

### 2.6 工具函数 util/

`util/` 提供前端界面与脚本公用的工具函数：

- `common.ts`：数组原地赋值、修正 lodash 数组合并、uuid 生成等通用工具
- `mvu.ts`：MVU 数据 store（`defineMvuDataStore`，状态栏 store.ts 通过此连接 MVU 变量）
- `script.ts`：脚本/界面公用工具（README 加载、样式传送等）
- `streaming.ts`：流式楼层界面挂载（`mountStreamingMessages`）
- `iframe_srcdoc.html`：iframe srcdoc 模板（预加载 FontAwesome/Tailwind/jQuery 等 CDN 资源）

---

## 3. webpack 构建链路

### 3.1 完整链路

```
glob_script_files() [L54]
  globSync({示例,src}/**/index.{ts,tsx,js,jsx})
  CI 过滤 @no-ci；去重（子目录被父目录覆盖）
  → map(parse_entry) [L32] 检测同目录 index.html
  → parse_configuration() [L185] 判断 @obfuscate
  → webpack.Configuration
    ├─ entry / output（dist/{相对路径}/{文件名}.js）
    ├─ module.rules → ts/vue/css/sass/html/md/yaml/raw/url loader
    ├─ resolve.plugins → TsconfigPathsPlugin（@/ @util/）
    ├─ plugins → HtmlWebpackPlugin / MiniCssExtractPlugin
    │            + watch_tavern_helper / schema_dump / tavern_sync hooks
    │            + VueLoaderPlugin + unpluginAutoImport + unpluginVueComponents
    │            + LimitChunkCountPlugin (maxChunks:1) + DefinePlugin
    │            + WebpackObfuscator (if @obfuscate)
    └─ externals → §12 详述(4 分支决策，§11.1）
```

**源码引用**：`webpack.config.ts` 全文。

### 3.2 Socket.IO 事件名称（watch 模式，端口 6621）

| 事件名 | 触发时机 | 条件 |
|--------|---------|------|
| `iframe_updated` | 首次连接时 | `io.on('connect')`（`webpack.config.ts:89`） |
| `message_iframe_updated` | 编译完成 | plugins 含 `HtmlWebpackPlugin`（`webpack.config.ts:100-101`） |
| `script_iframe_updated` | 编译完成 | plugins 不含 `HtmlWebpackPlugin`（`webpack.config.ts:102-103`） |

**源码引用**：`webpack.config.ts:83-113` — `watch_tavern_helper()` 完整实现。

---

## 4. 实时预览机制

三组件协作：

| 组件 | 端口 | 作用 |
|------|------|------|
| Live Server (VSCode) | 5500 | 暴露 `dist/` 为静态资源 |
| webpack watch | — | 监听源码变更重新编译 |
| socket.io (webpack hook) | 6621 | 编译完成通知酒馆重载 |

**`*实时修改.json`**（`导入到酒馆中/`）：前端界面用 Regex Replace 加载 `localhost:5500/dist/...`；脚本/流式楼层用 `import` 加载。

**工作流**：拖入 JSON → Live Server → webpack watch → socket.io 通知重载（需开启「允许监听」）。

**常见问题**：空白页→5500；socket 连不上→6621+允许监听；加载旧代码→`disableNetworkCache: true`。

### 4.1 WSL 环境的端口转发

开发者把 SillyTavern 跑在 Windows、把开发服务器跑在 WSL2 时，会出现「服务在 WSL 内监听、访问者（浏览器/酒馆）在 Windows 侧」的跨子系统场景。此时直接写 `localhost:5500` 在浏览器里可能加载空白页，原因与跨系统网络边界有关。

- **Live Server 地址**：Live Server 默认绑定 `127.0.0.1`，仅 WSL 自身可达。在 VS Code 设置中把 `liveServer.settings.host` 改为 `0.0.0.0` 才能让 Windows 侧通过 WSL 的网络入口访问 `dist/`。WSL2 较新版本支持 `localhost` 自动转发到 WSL，但镜像网络模式（`networkingMode=mirrored`）与默认 NAT 模式行为不同，本机环境不确定时优先用 WSL 的 IP 访问。
- **WSL IP 查询**：在 WSL 内执行 `hostname -I` 或 `ip -4 addr show eth0` 取到地址（如 `172.x.x.x`），把 `*实时修改.json` 与 `正则/状态栏界面.html` 中的 `localhost` 一并替换为该 IP。IP 在 WSL 重启后可能变化，每次切换需重新确认。
- **socket.io 端口**：webpack watch 的 socket.io（`6621`）需同样能被 Windows 侧酒馆助手建立 WebSocket 连接，否则即使 HTML 加载成功也不会触发自动重载。把 `ws://localhost:6621` 改成 `ws://<WSL-IP>:6621`，并确认无防火墙拦截这两个端口。
- **Live Server CORS**（WSL/跨端口场景同样适用）：把 `host` 改 `0.0.0.0` 只解决可达性问题；若 iframe 仍界面不显示且 console 报 CORS 相关错误，确认 `.vscode/settings.json` 已配置 `liveServer.settings.cors: true` 与 `liveServer.settings.headers`（配置值见 §4.2）。
- **Windows 防火墙**：若用 WSL IP 仍连不上，检查 Windows Defender 防火墙入站规则是否放行了 `5500` / `6621`，必要时为 WSL 的 vEthernet 网卡加白名单。

**源码引用**：`.vscode/launch.json`、`tasks.json:33`、各 `*实时修改.json` 中 `localhost:5500` 路径。

### 4.2 跨端口 CORS

Live Server（5500）与酒馆（8000）不同端口，跨端口取 HTML 必须有 CORS 头，**新版 Live Server 默认不注入**。若没配置，iframe 内 `$('body').load(...)` 会被 CORS 拦截，**console 会报 CORS 相关错误**（`dist/...` 为实际预览路径）：

```text
Access to XMLHttpRequest at 'http://localhost:5500/dist/...' from origin 'http://127.0.0.1:8000/' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

iframe 界面不显示（其他 DOM 元素照常渲染，只是该 iframe 的 src 资源被拦）。

需在 `.vscode/settings.json` 显式开启：

```json
{
  "liveServer.settings.cors": true,
  "liveServer.settings.headers": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*"
  }
}
```

**预览 URL 与工作区**：Live Server 根目录固定为当前 VS Code 工作区目录。工作区为 tavern_helper_template 时用 `dist/{ProjectName}/界面/状态栏/index.html`；工作区为父目录时 URL 需带 `tavern_helper_template/` 前缀，如 `tavern_helper_template/dist/{ProjectName}/界面/状态栏/index.html`。

---

## 5. TailwindCSS 配置

**PostCSS 链**（`postcss.config.js:2`）：`autoprefixer` → `@tailwindcss/postcss` → `postcss-minify`（TailwindCSS v4）。

**激活文件**（`tailwind.css:1`）：`@import 'tailwindcss'`。仅用于语法高亮，Vue 组件内用 `<style lang="scss" scoped>` 使用 tailwind。

**样式隔离**：
- 前端界面（iframe）：自动与父页面隔离。
- 流式楼层界面：`host: 'iframe'` → iframe srcdoc 隔离；`host: 'div'` → 嵌入父页面 DOM（需防冲突，`util/streaming.ts:52-56`）。
- 脚本：`teleportStyle()`（`util/script.ts:16-25`）或 `createScriptIdIframe()`。

---

## 6. Schema Dump 机制

将 Zod schema（`schema.ts`）转为 JSON Schema（`schema.json`），供配置校验使用。

**触发**（`webpack.config.ts:115-135`）：非 watch 模式 → 编译完成执行一次；watch 模式 → chokidar 监听 `src/**/schema.ts`，debounce 500ms 后执行 `pnpm dump`。

**核心逻辑**（`dump_schema.ts:12-27`）：`globSync('src/**/schema.ts')` → 设置 `globalThis.z` → import schema → 读取 `module.Schema`（ZodObject 或函数）→ `z.toJSONSchema()` → 写入同目录 `schema.json`。

**注意**：仅处理 `src/**/schema.ts`（不处理示例）；导出必须名为 `Schema`；使用 Zod v4 内置 `z.toJSONSchema()` 而非 `zod-to-json-schema`。

---

## 7. tavern_sync 机制

### 7.1 配置与集成

`tavern_sync.yaml` 定义同步配置（文件↔酒馆映射）。webpack hook（`webpack.config.ts:137-182`）在非 watch 模式执行 `pnpm sync bundle all`，watch 模式 spawn `pnpm sync watch all -f`。

`tavern_sync.mjs` 由 `bump_deps.yaml:33-36` 定期从 StageDog/tavern_sync 仓库下载覆盖。**不建议直接编辑**。

**命令**：`pnpm sync` → `node tavern_sync.mjs`；`pnpm sync bundle all` → 打包所有角色卡/世界书/预设。

### 7.2 与 tavern-cards-forge 的关系

tavern_sync 与 tavern-cards-forge 功能重叠：两者都是将项目文件打包为 SillyTavern 角色卡 PNG/JSON / 世界书 JSON / 预设。

| 维度 | tavern-cards-forge | tavern_sync |
|------|--------------------|-------------|
| 所属仓库 | `tavern-cards/`（skill 本体） | `tavern_helper_template/`（模板） |
| 驱动方式 | `.cardrc.json` 声明项目 | `tavern_sync.yaml` 声明文件↔酒馆映射 |
| 调用方式 | `node scripts/tavern-cards-forge.mjs <command>` | webpack watch 自动触发 / `pnpm sync` |
| 使用场景 | 主流程工具链：`init → configure → pack` | 开发期 CI 配套，watch 期间自动打包 |
| AI 介入 | **主动调用**（主线核心） | **不需要 AI 主动调用** |

**核心区别**：tavern-cards-forge 是 tavern-cards 仓库的工具链核心，覆盖角色卡从组织到产出的全过程；tavern_sync 是 tavern_helper_template 的 companion 工具，属于开发期 CI 维护的配套功能。

**tavern_ui 开发实践**：最终打包使用 tavern-cards-forge，而非 tavern_sync。tavern_sync 仅在模板仓库内作为 watch 期间的自动同步工具使用。运行时侧对照参见 `references/environments/tavern-helper-runtime.md`。

---

## 8. TypeScript 配置

### 8.1 `tsconfig.json`

关键设置：`types: [jquery, jqueryui, lodash, toastr, type-fest, yaml, zod]`、`target: ESNext`、`module: ESNext`、`moduleResolution: bundler`、`paths: { @/*: [./src/*], @util/*: [./util/*] }`、`strict: true`、`jsx: react-jsx`。

**webpack dev 模式**：`noUnusedLocals` 和 `noUnusedParameters` 被临时设为 `false`（`webpack.config.ts:243, 277, 311`），避免开发时报错。

### 8.2 `@types/` 目录

```
@types/
  function/  — 酒馆主页面 API 类型（24 个 .d.ts）
  iframe/    — iframe 隔离环境 API 类型（8 个 .d.ts）
```

来源：`bump_deps.yaml:28-31` 从 GitLab 下载 `@types.zip` 定期解压。类型报错如 `Cannot find name 'TavernHelper'` → 检查 `@types/` 完整性。

### 8.3 `global.d.ts` 模块声明（`global.d.ts:1-31`）

`declare module '*?raw'` / `'*?url'` / `'*.{css,html,md,yaml,vue}'` — 各类文件模块导入。`declare const YAML` / `declare const z` — 全局变量（与 externals 对应）。`declare module 'https://...*'` — CDN URL 模块声明。

常见问题：`Cannot find module '*.vue'` → 检查 `global.d.ts` 是否被 `tsconfig.json` 的 `include` 包含。

### 8.4 vue-tsc 静态类型检查

webpack 的 ts-loader 只转译不查类型（`transpileOnly: true`，见 §3.1），`tsc` 不解析 `.vue`。唯一在静态阶段完整覆盖 `.vue` + `.ts` 的检查是 `vue-tsc`。**`vue-tsc` 不在模板的 `dependencies` / `devDependencies` 中**（若本地 `pnpm why vue-tsc` 仍报 `the root project (devDependencies)`，那是早期 lockfile 残留，应 `git restore package.json pnpm-lock.yaml && pnpm install` 或 `git clean -xfd node_modules && pnpm install` 复位）。用 `npx vue-tsc --noEmit` 跑时，`npx` 先在本地 `node_modules/.bin/` 找，找不到再走 `npx -y` 临时下载。临时拉取会增加首次跑类型检查的时间与联网依赖；若 `npx -y` 无法联网（CI 受限 / 内网闸机），把 `vue-tsc` 加进本地 `devDependencies` 是项目层选择，不修改模板。编码完成后、预览与打包前先跑一次：

```bash
npx vue-tsc --noEmit 2>&1 | grep "error TS" | grep -E "^src/"
```

`grep -E "^src/"` 把检查范围限定在自己的源码：模板 `tsconfig.json` 的 `include` 同时含 `初始模板/`、`示例/`、`@types/`、`util`，这些目录自带基线噪音（示例代码的未用声明、CDN 副作用导入无类型声明、`@vueuse` 对 Web Bluetooth 的类型假设、`@types/function/` 的泛型实参缺省等），与自己的代码无关。按路径排除噪音比按报错编号过滤更稳：编号白名单必须随新编号手动扩列，漏掉新编号即漏报真错；路径前缀只有一个，新编号自动纳入。

vue-tsc 按 tsconfig 全量检查（`strict`、`noUnusedLocals`、`noUnusedParameters` 均开启；后两项在 webpack dev 模式下临时关闭，见 §8.1）。schema 漂移与组件接口错位的典型报错：`TS2339`（访问 schema 中不存在的字段）、`TS2345`（组件 props 传参不匹配，含 Vue 模板 `in-battle` → `inBattle` 自动映射错位）、`TS2322`（类型不兼容，如 `null` 传给 `Record<string, any>` props）、`TS1117`（schema 重复定义字段）、`TS6133`（声明未使用）。

**第二层过滤（仅在 `src/` 内出现可明确判定为工具链噪音的报错编号时再加）**：

```bash
npx vue-tsc --noEmit 2>&1 | grep "error TS" | grep -E "^src/" | grep -vE "TS2882"
```

`TS2882` 是 CDN `import 'https://…'` 副作用导入无类型声明的报错（如 MVU 脚本直接引用 jsdelivr 资源），语义上「我知道没有类型声明」，可安全忽略。`TS6133` 不入黑名单：自己代码里的未用声明恒为真错。

---

## 9. Auto-import 与代码混淆

**unplugin-auto-import**（`webpack.config.ts:444-457`）：自动导入 `vue`（ref/reactive/computed/onMounted）、`pinia`、`@vueuse/core`、`dedent`、`klona`、`useModal`、`z`、`type-fest`。

**unplugin-vue-components**（`webpack.config.ts:458-463`）：自动注册 `@vueuse/components` 和 `@vueuse/integrations` 指令。`components.d.ts` 被 `.gitignore` 排除。

**代码混淆**：入口首行 `// @obfuscate` 触发（`webpack.config.ts:188`）。WebpackObfuscator（`webpack.config.ts:474-480`）启用控制流扁平化等。Terser reserved（`webpack.config.ts:489-493`）：`['_', 'toastr', 'YAML', '$', 'z']`，确保 externals 全局变量不被 mangle。开发模式用 beautify 格式。

常见问题：auto-import 不生效 → 检查 `typescript.tsdk`（`settings.json:41`）。

---

## 10. 预注入全局变量（酒馆助手侧提供）

> 酒馆助手（Tavern-Helper，仓库名 JS-Slash-Runner，v4.8.17+）在 iframe 创建时同步加载以下全局变量。开发时直接使用，**无需 `import`、无需 `pnpm add`**。

### 10.1 全局变量清单

| 全局变量 | 对应包 | 版本策略 | 注入方式 |
|---------|--------|---------|---------|
| `Vue` | `vue` | 动态（jsdelivr `latest`，≈3.5.x） | CDN `<script>` 同步 |
| `VueRouter` | `vue-router` | 动态（jsdelivr `latest`，≈5.x） | CDN `<script>` 同步 |
| `$` / `jQuery` | `jquery` | 动态（jsdelivr `latest`，≈3.x） | 消息 iframe CDN / 脚本 iframe 从 parent 继承 |
| `_` | `lodash` | 从 parent 继承（≈4.17.21） | `predefine.js` |
| `showdown` | `showdown` | 从 parent 继承 | `predefine.js` |
| `toastr` | `toastr` | 从 parent 继承 | `predefine.js` |
| `YAML` | `yaml` | 固定（^2.9.0，酒馆助手声明） | `predefine.js` |
| `z` | `zod` | 固定（^4.4.3，酒馆助手声明） | `predefine.js` |
| `SillyTavern` | — | 代理 getter，每次返回新对象 | `predefine.js` |
| `TavernHelper` | — | v4.8.17，从 parent 拷贝 | `predefine.js` |
| `EjsTemplate` | — | 从 parent 拷贝 | `predefine.js` |
| `Mvu` | — | 条件性代理 getter | `predefine.js` |
| `hljs` | `highlight.js` | 动态（ST 内置） | 主界面全局 |
| `Popper` | `@popperjs/core` | 动态（ST 内置） | 主界面全局 |

### 10.2 运行时事实

- **Vue / Vue Router / jQuery**：用 jsdelivr `latest` 标签，无固定版本。如遇运行时问题，查 Tavern-Helper（仓库 [JS-Slash-Runner](https://github.com/N0VI028/JS-Slash-Runner)）当前 CDN 版本（`src/iframe/third_party_*.html`）。
- **lodash / showdown / toastr**：从 `window.parent` 继承，版本取决于 SillyTavern 主界面。
- **YAML / zod**：固定版本，更新需等酒馆助手升级。
- **`SillyTavern`**：代理 getter，**每次访问调用 `getContext()` 返回新对象**。缓存引用会导致状态不一致。
- **`Mvu`**：需要 `await waitGlobalInitialized('Mvu')` 确认就绪后再使用。未初始化时返回 `undefined`。

### 10.3 CDN 阻塞风险

所有 CDN `<script>` 为**同步加载**，不可达时 iframe 阻塞至超时（30-60s）。这是 iframe 白屏的最常见原因。不可达时走离线调试（见 §12.1）。

---

## 11. 依赖安装与打包（模板侧提供）

### 11.1 决策流程

`webpack.config.ts:522-575` externals 函数按顺序逐分支判断（遇到匹配即返回，不会越过）：

1. **[L524] 空检查**：无 context/request → `callback()`（跳过 external）
2. **[L528-538] 本地路径**：`request` 以 `.`/`/`/`-`/`!`/`http`/`@/`/`@util/` 开头，或 `path.isAbsolute`/`fs.existsSync` → `callback()`（跳过 external，webpack 从 node_modules 解析内联）
3. **[L541-546] 内联例外**：不是 `vue`/`vue-router` 但含 `pixi`/`react`/`vue` 字样 → `callback()`（内联打包）。命中：`@vueuse/core`、`vue-demi`、`vue-word-highlighter`、`pixi.js`、`react` 等。排除：`vue` 和 `vue-router` 本身（走分支 4）
4. **[L548-559] 预注入全局变量**：在 `{jquery→$, lodash→_, vue→Vue, vue-router→VueRouter, showdown, toastr, yaml→YAML, zod→z}` 表中 → `callback(null, 'var 变量名')`（运行时取 `window.xxx`）
5. **[L561-575] 默认 CDN**：默认走 `https://testingcf.jsdelivr.net/npm/{包名}@{版本}/+esm`（从 package.json 取版本号，无版本号则裸包名）；sass 特例走 `https://jspm.dev/sass`。

### 11.2 通常无需修改 `webpack.config.ts`

绝大多数情况：普通库（axios/gsap/pinia）自动走 CDN ESM；预注入全局变量自动走 `var`；`@vueuse/core` 等含 vue 字样的包虽被内联但功能正常。

**仅当出现以下症状时排查**：
1. 运行时 404 / 找不到导出 / 产物体积异常大 / 版本冲突
2. 排查顺序:查产物(内联还是 CDN URL)→ 按 §11.1 验证预期 → 修正

### 11.3 常见修正：CDN → 内联（最常见修复方向）

**典型场景**：CDN 上的包与预注入全局变量或 DefinePlugin 常量不兼容（如 ESM 版本未内联 webpack 编译期常量，而 UMD 版本已内联），导致运行时未定义错误。将此类包从 CDN 外联改为 bundle 内联可绕过 CDN 版本的不兼容问题。也适用于 CDN 不可达（404/超时）的情况。

**做法**：在 externals 函数开头插入 `if (['问题包名'].includes(request)) return callback()`，使其不进入后续分支，由 webpack 从 `node_modules` 解析内联。

**反向（内联 → CDN）**：较少需要。当 bundle 体积过大且 jsdelivr 有对应 ESM 版本时，在 `['vue', 'vue-router']` every 数组中追加该包名使其排除出内联例外分支。

---

## 12. 错误排查速查表

### 12.1 CDN 转内联

当 CDN 上的包与预注入环境不兼容或不可达时,让该包入 bundle。做法见 §11.3。

### 12.2 Live Server 端口冲突（5500）

检查 VSCode Live Server 是否运行、`lsof -i :5500`、系统代理是否拦截 localhost。若开发服务器在 WSL2、浏览器在 Windows，按 §4.1 把 Live Server 绑到 `0.0.0.0` 并用 WSL IP 替换 `localhost`。

端口没冲突但 iframe 界面不显示 / console 报 CORS 相关错误时，按 §4.2 跨端口 CORS 排查。

### 12.3 Socket.IO 连不上（6621）

确认 webpack watch 运行中、端口未被占用、酒馆助手「允许监听」已开启。控制台检查 `ws://localhost:6621` WebSocket 连接。

### 12.4 `dist/` 合并冲突

`.gitattributes:5` 设定 `dist/** merge=ours`，冲突时保留当前分支。手动合并后应重新 `pnpm build`。

### 12.5 Schema 构建失败

检查 `src/**/schema.ts` 是否有 `export const Schema = z.object({...})`、Zod v4 语法（`z.toJSONSchema()`）、函数类型 Schema 在 `dump_schema.ts:17-19` 的调用是否正确。

### 12.6 CI 失败

| 工作流 | 常见原因 |
|--------|---------|
`bundle.yaml`：Workflow permissions 未设 Read/write；Node 24 vs 22。`bump_deps.yaml`：外网不可达 `@types.zip`；仅 lock 变更时 skip commit 属正常。`sync_template.yaml`：仅分叉仓库执行；需 `GITHUB_TOKEN` 创建 PR。

### 12.7 类型错误

`Cannot find name '_'` / `'z'` → 检查 `tsconfig.json` 的 `types` 数组、`global.d.ts` 的 `declare const`、`@types/` 完整性。重启 TS server。

### 12.8 Webpack 编译缓存

`watchOptions.ignored` 含 `**/dist`（`webpack.config.ts:196-198`），dist/ 变更不触发重编。手动清 `node_modules/.cache/webpack` 或 `pnpm store prune`。

