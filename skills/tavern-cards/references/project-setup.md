# 项目属性与项目创建

## 从 design-spec.md 读取属性与技术收尾

读 `design-spec.md` 中已记录的项目名称、形式、主题、体验目标、风格意向。以下技术细节需在本阶段与用户确认：

- **动态变化需求**：
  - 不需要 → 不使用 MVU 和 EJS
  - 需要追踪变量（区域切换、好感度、剧情进度等）→ 使用 MVU
  - 需要根据变量控制上下文（不同阶段加载不同内容等）→ 使用 MVU + EJS
- **MVU 和 EJS 仅支持角色卡形式**
- **EJS 需求细分**：哪些条目需要 EJS？常见组合：
  - 多区域/场景切换 → `["地理"]`
  - 角色阶段成长 → `["角色"]`
  - 特定条件触发事件 → `["事件"]`
  - 混合 → `["地理", "角色"]`
- **头像**（角色卡时）：是否有头像图片？路径是什么？
  - 有头像 → 打包为 `.png`（`artifact: cards/{Project}/{Project}.png`）
  - 无头像 → 打包为 `.json`（`artifact: cards/{Project}/{Project}.json`）
- **UI 模式**（使用 MVU 时）：状态栏采用纯文本版还是前端版？
  - `text` → 纯文本版状态栏
  - `frontend` → 前端版状态栏
  - `none` → 不需要状态栏
  - 未定 → 暂时缺省，必须在 UI 界面开发（步骤 9）前收敛

### typeLists 调整

typeLists 的三个位置通常各有侧重：`before_char` 放宏观条目，`after_char` 放人设类条目，`depth` 放运行时按需注入的条目。默认配置见下文。根据 `references/requirements/entry-types.md` 的条目类型说明和项目实际需求，确认默认配置是否需要调整。如需增添新条目类型，遵照从宏观到微观、从固定到动态的原则插入合适位置。不使用 MVU 时，`MVU` 不需要出现在列表中；EJS 条目内联 getvar，无需独立列表项。有固定玩法阶段时，可加入 `阶段指导`，且必须同时使用 EJS 控制。

调整 typeLists 时，必须同步调整 strategyThresholds。configure 只会为出现在 strategyThresholds 中的类型推导 strategy；字段含义见 `references/configuration.md`。

## 创建步骤

1. 复制 `assets/cardrc.json` 到工作区根目录为 `.cardrc.json`
2. 向 `.cardrc.json` 的 projects 添加项目注册：

```json
{
  "projects": {
    "MyCharacter": {
      "state_file": "cards/MyCharacter/tavern-cards-state.json",
      "artifact": "cards/MyCharacter/MyCharacter.png"
    }
  }
}
```

3. 运行 `node scripts/tavern-cards-forge.mjs init {project}`：自动创建项目目录和 `tavern-cards-state.json`，从 `.cardrc.json` 读取默认值写入 state（typeLists、strategyThresholds、partOrder、depth_defaults）。projectName 仅空时设置，create_date 仅空时设为当前时间。根据技术收尾确认结果附加选项：
   - 独立世界书 → 加 `--worldbook`（自动设置 `form: "worldbook"`, `mvu: false`）
   - 角色卡 + 需要 MVU → 加 `--mvu`（自动设置 `form: "charactercard"`, `mvu: true`）
   - 角色卡 + 不需要 MVU → 无选项即可（默认 `form: "charactercard"`, `mvu: false`）
   - `--worldbook` 和 `--mvu` 不能同时使用
4. 在 entryManifest 中预建类型 key（空对象，不添加条目）：

```json
{
  "entryManifest": {
    "世界观": {},
    "地理": {},
    "角色": {},
    "NPC": {}
  }
}
```

根据项目实际使用的类型决定需要哪些 key。条目在创作阶段逐条注册到对应类型下。

**约束**：初始化时不预填充条目骨架。`node scripts/tavern-cards-forge.mjs patch` 会进行 schema 校验，字段缺失的条目无法通过。条目在创作阶段逐条完成后，通过 `node scripts/tavern-cards-forge.mjs patch` 注册（见 `references/conventions.md`）。

5. 确认项目目录中的已有设计/转化文件：
   - `design-spec.md` 已由 tavern-design 创建，无需移动
   - 如有转化阶段的 `故事大纲.yaml` 和源材料文件，也已由 tavern-design 放在项目目录中，无需移动
   - 项目目录结构示例：
   ```
   cards/{Project}/
     design-spec.md         ← tavern-design 产出
     tavern-cards-state.json
     创作规划.yaml          ← 本阶段产出
     故事大纲.yaml          ← tavern-design 转化阶段产出（如有）
     source/                ← 源材料（如有）
       世界设定.yaml
       角色设定.yaml
       ...
   ```

6. **角色卡标签**（角色卡时）：向用户说明标签会显示在酒馆的角色列表里，方便按类型找到这张卡，并询问是否填写。用户同意后，根据 `design-spec.md` 已记录的主题、体验目标、风格意向、情感落点整理一组简短候选，供用户选择、改写或补充；选定后写入 state：

```bash
node scripts/tavern-cards-forge.mjs patch {project} '[{"op": "add", "path": "/tags", "value": ["标签1", "标签2"]}]'
```

## typeLists 默认配置

```json
{
  "before_char": ["世界观", "扮演准则", "时间线", "地理"],
  "after_char": ["角色", "NPC"],
  "depth": ["事件", "MVU"]
}
```

固定玩法阶段项目可调整为：

```json
{
  "typeLists": {
    "before_char": ["世界观", "扮演准则", "时间线", "地理"],
    "after_char": ["角色", "NPC"],
    "depth": ["阶段指导", "事件", "MVU"]
  },
  "strategyThresholds": {
    "世界观": "Infinity",
    "扮演准则": "Infinity",
    "时间线": {
      "history": { "required": false, "threshold": "Infinity" },
      "plot": { "required": false, "threshold": "Infinity" }
    },
    "地理": {
      "region": { "required": false, "threshold": 4 },
      "scene": { "required": false, "threshold": 4 },
      "faction": { "required": false, "threshold": 4 }
    },
    "角色": {
      "basic": { "required": true, "threshold": 5 },
      "personality": { "required": true, "threshold": 2 },
      "tri_faceted": { "required": false, "threshold": 2 },
      "other": { "required": false, "threshold": 2 }
    },
    "NPC": 0,
    "阶段指导": "Infinity",
    "事件": 0,
    "MVU": {
      "variable_list": { "required": false, "threshold": "Infinity" },
      "update_rules": { "required": false, "threshold": "Infinity" },
      "output_format": { "required": false, "threshold": "Infinity" },
      "initvar": { "required": false, "threshold": null }
    }
  }
```

`阶段指导` 通常是总指导条目，必须常驻后由 EJS 段落控制当前阶段内容，因此 strategyThresholds 设为 `"Infinity"`。

如果技术收尾时确认了调整，使用调整后的值。

状态文件的完整字段定义见 `references/type/state.ts`，配置文件见 `references/type/settings.ts`。

完成后返回 `references/requirements.md`，进入世界与角色信息收集，最终产出编写规划文档 `创作规划.yaml`。
