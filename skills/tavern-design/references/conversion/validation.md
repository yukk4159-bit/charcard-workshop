# 转化大纲验证脚本

`validate-conversion-outline.mjs` 用于在材料转化阶段验证故事大纲，覆盖 YAML 结构、章节引用、占位符和原文引用真实性。

## 使用位置

在以下两个位置必须运行：

1. `conversion-agent` 输出分片大纲后，立即验证该片段。
2. 主代理合并并整理深化出最终 `故事大纲.yaml` 后，再验证最终大纲。

验证通过后，主代理仍需执行语义复核：脚本只能证明引用存在，不能证明引用解释正确。

## 命令

```bash
node scripts/validate-conversion-outline.mjs 故事大纲.yaml 源文件.txt
```

如果只检查结构、不检查原文引用：

```bash
node scripts/validate-conversion-outline.mjs 故事大纲.yaml --no-quotes
```

输出 JSON 报告：

```bash
node scripts/validate-conversion-outline.mjs 故事大纲.yaml 源文件.txt --json
```

将 warning 也视为失败：

```bash
node scripts/validate-conversion-outline.mjs 故事大纲.yaml 源文件.txt --strict
```

## 检查内容

### 格式与结构

- YAML 是否能解析
- 缩进是否为 2 空格倍数
- 是否存在重复 key
- `chapters` 是否存在且非空
- `chapters[].name` / `chapters[].notes` 是否完整
- `important_chapters[].chapter` 是否存在于 `chapters[].name`
- `characters[].quotes[].chapter` 是否存在于 `chapters[].name`

### 内容质量

- `chapters[].notes` 是否为 50-100 字
- 是否存在占位或省略表述，如「某」「略」「待补充」「待定」「等」
- `quotes[].text` 是否过短

### 原文引用

脚本提取以下字段并在源文件中验证：

- `important_chapters[].quotes[].text`
- `characters[].quotes[].text`

匹配顺序：

1. 精确匹配
2. 归一化匹配：统一换行、连续空白、全角/半角空格
3. 模糊匹配：最长连续匹配率 ≥ 90%，差异字数 ≤ 3

精确匹配失败但归一化或模糊匹配通过时，脚本会给出 warning。精确匹配成功时，JSON 输出会记录到 `info`。整理大纲时应优先修成精确匹配。

## 结果处理

- `error`：必须修正后重跑
- `warning`：默认不阻断，但应确认；使用 `--strict` 时会阻断
- `info`：仅用于记录通过的精确引用匹配；不阻断，`--strict` 也不会因 `info` 失败
- 引用未匹配：回源文件复制原文，禁止凭记忆改写
- 章节引用不一致：统一为 `chapters[].name` 中的章节名
- 引用过短：删除或替换为更完整的原文句子

## 注意事项

- 源码使用 `yaml` 库解析；运行时可独立使用，无需额外安装 YAML 依赖。
- 脚本是只读验证工具，不会自动修改大纲。
- 脚本只能验证「原文中存在这句话」，不能验证 `context` 是否解释正确；这部分由主代理在转化质量检查中完成。
