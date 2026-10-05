# 变量结构脚本（schema.ts）

编写时遵循 `references/mvu/zod-rule.yaml` 中的 Zod 4 规则。

## 调用流程

1. 读取 `创作规划.yaml` 的 `mvu` 段，提取变量结构大纲
2. 向用户展示当前变量结构大纲，询问是否确认或需要补充调整
3. 若项目使用 EJS，读取 entryManifest 中含 EJS note 的条目，确认 schema 将覆盖所有条件引用的 `stat_data.xxx` 路径
4. 确认后调 `schema-agent` 编写 schema.ts

## 加载与 import 约束

`schema.ts` 由 forge 通过 jiti 在 Node 侧加载，运行时已注入全局 `z`（Zod v4）与 `_`（lodash）。

- pack 与 validate-mvu 会做预检（`checkSchemaTsContent`），命中即报错退出并列出违法语句
- 报错原文含「do NOT run `npm install`」「Cannot find module 'zod'」——遇到直接删除对应 import，**不要给项目 `npm install zod`/`lodash`**
- Zod 脚本由 pack 从 schema.ts 自动生成（通过 state.zod 驱动），CDN URL import（`import { registerMvuSchema } from 'https://...'`）自动追加，无需手写

**同一 `z.object({...})` 内不得重复字段键**（含嵌套对象与 `.prefault({...})` 默认值对象）。重复键在运行时会被 JS 静默覆盖——Zod 只保留最后一个，运行时校验检不出来，只有前端 vue-tsc（TS1117）会报。因此，forge 在源码层提前拦截：pack 与 validate-mvu 命中即报错。

## 产出

写入项目目录下的 `schema.ts`，导出 `Schema` 和对应类型。
