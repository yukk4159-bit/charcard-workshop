---
name: tavern-ui
description: "SillyTavern 前端界面开发（HTML/CSS/JS/Vue 3）。当用户需要开发酒馆消息楼层内渲染的前端 UI（状态栏、复杂交互界面、Vue 3 组件、CSS 布局与动画），或处理界面正则占位、tavern_helper_template 构建打包与 jsdelivr 部署、本地实时预览时调用。涵盖设计原则、色彩变量规范与 MVU 变量读取。"
---

# SillyTavern 前端开发

SillyTavern 本身不提供定制化的前端界面渲染能力。本 skill 的前端开发借助第三方扩展**酒馆助手**（[Tavern-Helper](https://github.com/N0VI028/JS-Slash-Runner)，旧名 JS-Slash-Runner）：它会渲染消息楼层里的 HTML 代码块，并向前端预注入 Vue、jQuery、lodash、zod 等全局变量。状态栏等界面通过占位符（如 `<StatusPlaceHolderImpl/>`）让正则替换出 HTML 代码块，再被酒馆助手渲染。

## 设计原则

- **ICON 优先**：前端版面向复杂界面，ICON 在不同主题/尺寸下表现一致，且支持 CSS 调色，与状态栏视觉风格统一
- **低耦合**：每个组件只负责一件事，变量读取集中在 store，业务逻辑抽离为独立模块，确保组件可复用、可单独测试

## 常用资源

- **图标（ICON）**：FontAwesome 免费图标，前端界面直接用 `fa-*` 类
- **字体**：ZeoSeven Fonts（如 Sarasa 更纱黑体），复制其 CSS 引入链接即可
- **CDN（jsdelivr）**：**必须用国内可达的 `testingcf.jsdelivr.net` 镜像**，而不是 `cdn.jsdelivr.net`
- **第三方库**：用 `pnpm add` 添加，模板打包时会自动将其转为 jsdelivr 链接，避免在多个界面中重复打包
- **可读性**：用 Adobe 色彩对比度检查器确保背景色与文字色对比足够强

## 前端界面的正则：只定位、不解析

**该原则仅针对「前端界面」的正则。**

前端界面的正则只负责**定位界面应在的位置**（如把 `<StatusPlaceHolderImpl/>` 替换为 HTML 代码块），**不处理输出数据**——不要在正则替换串里用 `$1` 取字段。界面需要的数据应由前端代码自行获取：

- **MVU 变量**：通过 `defineMvuDataStore` 读取，正则只需替换纯占位符（如状态栏使用的 `<StatusPlaceHolderImpl/>`），不需要捕获组
- **消息原文**：通过 `getChatMessages(getCurrentMessageId())[0]` 取整条消息，再在代码里 `.match()` 分析

正则越简单、容错率越高：只要能定位到这段文本即可，不必关心内部具体是什么格式。

> 注：MVU 的「变量更新」类正则（解析 `<update>...</update>` 内容、捕获 `$2` 更新变量）正常依赖捕获组提取，与上述原则无关。

## 开发方式

使用 [tavern_helper_template](https://github.com/StageDog/tavern_helper_template) 开发消息楼层内渲染的前端界面。
常见界面类型：**状态栏**（常驻界面，占位符 `<StatusPlaceHolderImpl/>`）与**开局表单**（交互表单开局，自定义占位符，见 `references/interactive-opening-form.md`）。

## 开发流程

### 1. 准备开发环境

先询问用户是否已克隆过 tavern_helper_template 仓库。如已有，确认仓库位置后直接使用；如没有，执行以下步骤：

```bash
# 克隆模板仓库
git clone https://github.com/StageDog/tavern_helper_template.git
cd tavern_helper_template

# 安装依赖
pnpm install
```

克隆后先阅读模板根目录的 `README.md`，其中包含教程链接、CI 工作流配置、jsdelivr 自动更新、克隆冲突处理等完整流程说明。

建议安装 chrome-devtools-mcp（模板已配置但各 agent 工具配置可能不同），方便 AI 查看浏览器控制台报错。

### 2. 设计构思

这一步把故事翻译成视觉与组件决策，向已有 `design-spec.md` 追加 UI 设计段，供后续编码（开发状态栏界面、CSS 色彩变量）消费。完整指引见 `references/design-thinking.md`。

**命中下列任一条件时必须走**：

- 界面承载双线叙事（明线/暗线切换）
- 有非标准交互（折叠、阈值触发、情境覆盖等）
- 用户对视觉风格有明确期待
- 用户指定了参考角色卡

仅当状态栏只展示几个数值时，可跳过直接进入导入变量结构。

### 3. 导入变量结构

将项目的 `schema.ts` 复制到模板仓库的 `src/{ProjectName}/schema.ts`。

**注意**：两个仓库的 schema.ts 结构互通，可直接复用。

### 4. 开发前端界面

消费 `design-spec.md`（tavern-design 的叙事段 + 本阶段追加的 UI 设计段）：**视觉基调**（感官词/交互人格/语义配色）落到 CSS 与交互反馈，**组件树草图**落到 Vue 子组件拆分与 `components/` 目录规划，**信息优先级**决定哪些区块进标题栏、哪些进展开区。

#### 准备素材

根据 `design-spec.md` 的视觉基调，从「常用资源」里选定具体素材并确认接入位置：

- **图标**：按组件树草图中的区块语义选 `fa-*` 类（如好感度→心形、侵蚀度→眼/裂纹）
- **字体**：按调性选 ZeoSeven Fonts 中的字族（柔和圆润系选 Sarasa，锐利科技系选等宽字）
- **图像（可选）**：若接入生图功能，按 `design-spec.md` 的语义配色与感官词生成背景/装饰图，产出的图片以 HTTPS URL 引用，避免内联 base64 加重代码块体积

素材选定后再开始编码，避免边写边选打断组件拆分节奏。

#### 目录骨架

在 `src/{ProjectName}/界面/状态栏/` 中开发：

```
界面/状态栏/
├── index.ts        # 入口文件，等待 MVU 初始化
├── index.html      # HTML 模板
├── App.vue         # 主组件
├── store.ts        # 数据存储，使用 defineMvuDataStore
├── global.css      # 全局样式
└── components/     # 子组件
```

**关键代码**：

```typescript
// store.ts - 连接 MVU 变量
import { defineMvuDataStore } from '@util/mvu';
import { Schema } from '../../schema';

export const useDataStore = defineMvuDataStore(Schema, {
  type: 'message',
  message_id: getCurrentMessageId()
});
```

```vue
<!-- App.vue - 读取变量 -->
<script setup lang="ts">
import { useDataStore } from './store';

const store = useDataStore();
// store.data 即为 schema.ts 定义的 stat_data 变量结构
</script>
```

> **变量访问方式**：读写 MVU `stat_data` 有三种等价写法（推荐 `useDataStore`，响应式 + zod 校验），三者关系、同步机制与迁移注意点详见 `references/mvu-variables.md`。

### 5. CSS 色彩变量命名规范

CSS 色彩变量必须使用**功能语义**命名，禁止使用视觉描述命名。

```css
/* ✓ 正确：功能语义 */
:root {
  --c-primary: #4a90d9;
  --c-danger: #e74c3c;
  --c-surface: #f5f5f5;
  --c-text-muted: #888;
  --c-border: #ddd;
}

/* ✗ 错误：视觉描述 */
:root {
  --c-blue: #4a90d9;
  --c-red: #e74c3c;
  --c-light-gray: #f5f5f5;
  --c-gray: #888;
  --c-light-border: #ddd;
}
```

### 6. 本地测试

#### 静态类型检查

编码完成后、启动预览与打包前，先跑一次 vue-tsc 静态类型检查，通过后再进入本地预览与打包（命令与噪音处理见 `references/environments/tavern-helper-template.md` 的「8.4 vue-tsc 静态类型检查」）：

```bash
npx vue-tsc --noEmit 2>&1 | grep "error TS" | grep -E "^src/"
```

报「前端引用了 schema 中不存在的字段」类错误时，先判断该字段是设计内状态（补 schema 字段）还是前端临时内部状态（改前端引用），无法判断时询问用户以哪一侧为准，确认后再修改。

> `schema.ts` 的修改按 tavern-cards skill 的 `references/mvu/guide.md#修改流程` 执行，并保持模板仓库与用户项目两处副本一致。

#### 启动本地预览

先询问用户是否安装了 VS Code 的 Live Server 扩展。

如已安装，指导用户以 tavern_helper_template 为 VS Code 工作区打开（**根目录固定为当前工作区目录**）。

> **新版 Live Server 默认不注入 CORS 头**，症状细节与 `.vscode/settings.json` 配置见 `references/environments/tavern-helper-template.md` 的「跨端口 CORS」。

如未安装，自行启动一个带 CORS 头的静态文件服务器，工作目录为 tavern_helper_template 根目录。

> **WSL 环境**：开发服务器跑在 WSL2、浏览器/酒馆跑在 Windows 时，直接用 `localhost` 可能加载空白页。需把 Live Server 绑到 `0.0.0.0` 并用 WSL 的 IP 替换 `localhost`，处理步骤见 `references/environments/tavern-helper-template.md` 的「WSL 环境的端口转发」。

同时运行以下命令监听文件改动并自动重新编译：

```bash
pnpm watch
```

#### 配置预览正则

将项目中的 `正则/状态栏界面.html` 临时改为加载本地服务器。该文件首尾各占一行纯三反引号（` ``` `，不带语言标记）作为代码块标记，修改时需保留这两行。

````
```
<body>
<script>
$('body').load('http://localhost:5500/dist/{ProjectName}/界面/状态栏/index.html')
</script>
</body>
```
````

> `dist/{ProjectName}/` 是 `pnpm watch` 的编译输出路径。端口号按实际使用的服务器端口调整。

修改预览正则后，按 `references/packaging.md` 的打包流程生成预览版角色卡，指导用户导入酒馆并在酒馆助手的 `开发` 选项中勾选 `允许监听`，即可实时预览修改效果。

> WSL 环境下 socket.io 自动重载端口（`6621`）同样需可被 Windows 侧访问，处理步骤同上「WSL 环境的端口转发」。

> **开发/生产切换**：本地测试时使用上述 localhost 地址；部署前需将 `正则/状态栏界面.html` 改回 CDN 地址（见步骤 8）。

> 预览不刷新、白屏、端口冲突、iframe 高度异常等运行时错误，查 `references/environments/tavern-helper-runtime.md` 的隔离边界与 iframe 高度自适应；watch 模式不编译、入口扫描问题，查 `references/environments/tavern-helper-template.md` 的实时预览机制与 webpack 构建链路。

### 7. 前端打包与部署

```bash
# 打包到 dist 文件夹
pnpm build
```

**部署方式**：

- **GitHub + jsdelivr**（推荐）：推送到 GitHub 仓库，通过 jsdelivr CDN 访问。CDN 方案让正则代码块只加载链接、不内联整段 HTML，显著减轻酒馆渲染代码块的负担（见步骤 8 后的「CDN 缓存与刷新」）
- **自托管**：部署到任意可访问的 URL

> 构建失败、产物异常、CI 未更新 dist、运行时报变量未定义等错误，查 `references/environments/tavern-helper-template.md` 的 webpack 构建链路、CI 工作流、预注入全局变量清单；运行时变量作用域与生命周期问题，查 `references/environments/tavern-helper-runtime.md` 的预注入机制与变量作用域链。

### 8. 更新占位符

部署完成后，修改项目中的 `正则/状态栏界面.html`（文件首尾各一行纯三反引号 ` ``` ` 作为代码块标记，须保留）。

**CDN / 自托管写法**（仅加载链接）：

````
```
<body>
<script>
$('body').load('https://testingcf.jsdelivr.net/gh/{GH_USER}/{GH_REPO}/dist/{ProjectName}/界面/状态栏/index.html')
</script>
</body>
```
````

替换：
- `{GH_USER}`：GitHub 用户名
- `{GH_REPO}`：仓库名
- `{ProjectName}`：项目名称

**全量内联写法**（无 CDN，直接贴入编译产物）：

源文件在模板仓库 `tavern_helper_template/dist/{ProjectName}/界面/状态栏/index.html`，目标文件在用户项目的 `正则/状态栏界面.html`，二者分处不同目录。在 `tavern_helper_template` 根目录执行以下命令，把编译产物连同首尾三反引号行写入目标文件（`{ProjectName}` 替换为真实项目名；目标路径按项目实际位置调整）：

```bash
{
  echo '```'
  cat "dist/{ProjectName}/界面/状态栏/index.html"
  echo '```'
} > "{ProjectName}/正则/状态栏界面.html"
```

> 注意：内联方案会让正则代码块体积显著增大（含全部 CSS/JS），酒馆渲染负担较重。仅在无 CDN 条件时使用。

#### CDN 缓存与刷新

jsdelivr 主服务器、镜像服务器与玩家浏览器都会缓存文件，推送后不会立即生效。以下几种方式可以解决：

- **等待自动刷新**：模板仓库已配置 `bundle.yaml`，打包时自动递增版本号，约 12h 后 jsdelivr 主服务器缓存自动更新
- **强制刷新**（二选一）：
  - **purge**：在 `https://www.jsdelivr.com/tools/purge` 中输入链接（`testingcf.jsdelivr` 换成 `cdn.jsdelivr`），可立即刷新主服务器缓存；镜像服务器不受影响
  - **换镜像域名**：临时改用 `fastly.jsdelivr.net` 或 `gcore.jsdelivr.net` 等尚未缓存的镜像网站
- **玩家清理缓存**：玩家主动清除浏览器缓存
- **自托管服务器**：必须配置 HTTPS，否则使用 https 的云酒馆玩家无法加载

### 9. 重新打包

按 tavern-cards skill 的 `references/packaging.md` 的打包流程生成正式角色卡。

## 模板已提供的内容

tavern_helper_template 仓库已自带以下内容：

- **编写规则**：`.cursor/rules/`（前端界面、酒馆助手接口、MVU 变量框架等）
- **接口类型定义**：`@types/`（酒馆与酒馆助手 API）
- **内置库**：Vue、Pinia、Vue Router、VueUse、GSAP、Tailwind CSS、jQuery、lodash、zod 等（见 `package.json`）
- **示例项目**：`示例/角色卡示例/界面/`

更多进阶用法参考 tavern_helper_template 根目录的 `README.md` 中的 `教程文档` 链接。

## 参考资料

此索引是 `references/` 文档列表的权威来源。标注「按需查阅」的为排错与深度参考文档，其余为主动加载文档。

```
references/
├── design-thinking.md                         —— 设计构思流程（感官词/交互人格/语义配色/组件构思）
├── mvu-variables.md                           —— MVU 变量读写方式（useDataStore / 酒馆助手接口 / Mvu 函数，三写法关系、同步机制、迁移注意点）
├── interactive-opening-form.md                —— 开局表单前端界面（交互表单开局：自定义占位符、读写 stat_data、提交触发生成与部署）
└── environments/
    ├── tavern-helper-template.md              —— tavern_helper_template 开发环境（目录骨架/webpack/CI/实时预览/预注入变量）（按需查阅）
    └── tavern-helper-runtime.md               —— Tavern-Helper 运行时（iframe 隔离/生命周期/变量作用域/错误排查速查表）（按需查阅）
```
