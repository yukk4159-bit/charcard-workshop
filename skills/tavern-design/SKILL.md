---
name: tavern-design
description: "角色卡与世界书的叙事设计阶段：大方向讨论、世界观/角色头脑风暴、剧情设计、体验目标、风格意向，以及从小说/游戏脚本等现成材料转化为故事大纲并完成 design-spec.md。确保在以下情况也使用此 skill：用户提到'设计角色卡'、'设计世界书'、'从零创作'、'大方向'、'剧情设计'、'世界观构思'、'角色构思'、'头脑风暴'、'故事大纲'、'材料转化'、'轻小说改编'、'剧本改编'、'design-spec' 等关键词时，即使用户没有明确说'tavern-design'也应触发。完成叙事设计后由 tavern-cards 继续项目创建与创作规划。"
---

# SillyTavern 角色卡与世界书叙事设计

完成叙事设计阶段的大方向讨论、剧情设计与材料转化，产出跨 skill 交接物 `design-spec.md`（tavern-design 写入叙事设计段，tavern-ui 在 UI 开发阶段追加 UI 段，tavern-cards 消费它）。

## 适用场景

| 场景 | 流程 |
|------|------|
| 从零创建完整项目 | 询问项目名称 → 创建 `cards/{Project}/` → 大方向讨论 + 剧情设计 → 产出 `design-spec.md` → 用户确认 |
| 从现有材料转化 | 询问项目名称 → 先讨论素材未覆盖内容和转化侧重 → 转化（叙事材料产出 `故事大纲.yaml`）→ 结合成果完成 `design-spec.md` → 用户确认 |
| 只做叙事设计 / 大方向讨论 | 同上，产出 `design-spec.md` 即可 |
| 修改已有角色卡的叙事方向 | 读取已有 `design-spec.md` 和创作规划，讨论修改点，更新 `design-spec.md` 后回到 tavern-cards |

## 流程

### 1. 创建项目目录

询问用户项目名称，创建 `cards/{Project}/` 目录。后续 `design-spec.md` 和转化成果都保存在这里。

### 2. 大方向讨论

按 `references/design-guide.md` 的七个维度展开讨论：

1. 项目定位
2. 世界观构思
3. 角色构思
4. 互动与动态需求
5. 创作方向
6. 开场构思
7. SFW / NSFW

复杂剧情额外讨论暴露时机与控制策略。讨论过程忠实记录用户想法，不猜测、不代替用户决定。

### 3. 材料转化（从材料创建时）

- 先讨论素材未覆盖内容与转化侧重
- 执行 `references/conversion.md` 流程；叙事材料产出 `cards/{Project}/故事大纲.yaml`，结构化材料可直接提炼
- 结合转化成果完成 `design-spec.md`

从零创建时跳过本步骤。

### 4. 产出 design-spec.md

将大方向讨论结果整理为 `cards/{Project}/design-spec.md`。格式建议见 `references/design-guide.md`。

### 5. 用户确认

展示 `design-spec.md` 并暂停等待用户确认。用户确认后，告知用户接下来可交给 tavern-cards 进行项目创建与创作规划。

## 子代理

调用时由 Agent harness 注入任务，主代理在 task 字符串里携带下表「输入」一列的参数，并按下表「输出」一列处理返回。

| 子代理 | 作用 | 输入 | 输出 |
|--------|------|------|------|
| conversion-agent | 材料转化分片处理 | 源文件路径、行范围、输出路径；前序大纲片段路径（如有） | 按规范写入输出路径，并运行 `scripts/validate-conversion-outline.mjs` 自验片段；另返回 `missing_names` 供主代理合并 |

长文本分片调用与合并的衔接见 `references/conversion.md`、`references/conversion/outline.md`。

## 技术细节边界

`design-spec.md` 只记录大方向；MVU/EJS、typeLists、头像、UI 模式、变量结构、条目级规划等技术细节由 tavern-cards 项目创建步骤处理。

## 参考资料

此索引是 `references/` 文档列表的权威来源。

```
references/
├── design-guide.md             —— 大方向讨论指导与 design-spec.md 格式
├── conversion.md               —— 从材料转化流程（主文档）
└── conversion/
    ├── outline.md              —— 大纲构建指导（长文本处理、分卷、子代理分配）
    ├── outline-spec.md         —— 大纲规范（信息分类、记录原则、行号规范）
    ├── validation.md           —— 转化大纲验证脚本使用说明
    ├── assessment.md           —— 材料类型评估标准
    ├── source-chapters.md      —— source_chapters 标注标准
    ├── key-info.md             —— 关键信息确认流程
    └── error-handling.md       —— 转化错误处理（材料矛盾、信息缺失、转化失败）
```

工具脚本：

- `scripts/validate-conversion-outline.mjs`：验证故事大纲的 YAML 结构、章节引用、占位符和原文引用真实性。使用说明见 `references/conversion/validation.md`。
