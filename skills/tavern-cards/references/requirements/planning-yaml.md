# 创作规划.yaml

需求对齐完成后，在项目目录下产出 `创作规划.yaml`。

```yaml
project:
  name: xxx
  worldbookName: xxx
  form: charactercard
  mvu: true
  avatar: path/to/avatar.png
  ui_mode: text    # 有效值：text（纯文字版）/ frontend（前端版）/ none（不需要）/ 缺省表示待定

world:
  overview: 现代都市修仙世界，灵气复苏后修仙者融入现代社会…
  regions:
    - name: 华东区
      scenes: [学校, 商业街, 修仙协会分部]
      description: 经济发达的东部沿海区域，修仙协会总部所在地  # 可选
    - name: 西北区
      scenes: [荒漠秘境]
  factions:
    - name: 修仙协会
      description: 官方修仙管理组织，负责登记和监管修仙者
      territory: 华东区           # 可选：势力主要活动区域
      key_members: [张会长]       # 可选：关键成员
    - name: 暗月教
      description: 地下修仙势力，追求禁忌功法
      territory: 西北区

characters:
  - name: 苏云
    basic:
      age: 19
      gender: 女
      identity: 修仙协会华东分部见习执法者
      relationship: 协会派来监视<user>的搭档
    appearance: [左手腕有一道淡金色的灵纹疤痕，总是穿协会制服但会把袖口挽起来]
    personality:
      base: 冷静                        # 底色，不随阶段变化，写一次
      # stages 数组的顺序和数量与 ejs.entries 中对应条目的 stages 一一对应
      # 创作阶段时，base 写一次，各阶段的 main/accent 按 EJS 条件展开为完整调色盘
      stages:                      # 可选：多阶段调色盘
        - name: 初识期
          main: [警惕, 克制]
          accent: [好奇]
          description: 以公务态度对待<user>，保持职业距离，暗中观察
        - name: 熟悉期
          main: [坦率, 倔强]
          accent: [好奇]
          description: 开始分享修仙界的见闻，偶尔流露对<user>的好奇
        - name: 亲密期
          main: [温柔, 依赖]
          accent: [倔强]
          description: 信任建立，在<user>面前卸下职业面具，展现柔软一面
        - name: 深爱期
          main: [依赖, 占有]
          accent: [脆弱]
          description: 深度羁绊，占有欲显现，脆弱坦露不再隐藏
    tri_faceted: false
  - name: 季清寒
    basic:
      age: 23
      gender: 女
      identity: 修仙协会华东分部资深执法者，苏云的前辈搭档
      relationship: 苏云的导师，<user>的间接联络人
    appearance: [总把长发束成低马尾，右手无名指戴着协会指环]
    personality:
      base: 冷静
      main: [理性, 严苛]
      accent: [温柔]
    tri_faceted:
      needed: true
      facets:                    # 可选：如果用户已描述了各面
        - trigger: 执行公务时
          mode: 不苟言笑的资深执法者，决策果断不留情面
        - trigger: 独处或与苏云私下相处
          mode: 放下架子的前辈，偶尔流露对逝去搭档的怀念
        - trigger: 面对<user>暴露自身弱点时
          mode: 卸下所有防备，承认自己也会害怕
  - name: 王老师
    type: NPC
    function: 提供修仙界信息
    appearance: [总是穿深灰色西装，袖口沾粉笔灰]  # 可选

style:
  perspective: 第三人称
  tone: 口语化、轻松
  mood: 温馨
  reference: 参考村上春树的文风  # 可选

entries:                         # 数组顺序即创作顺序，项目级事实来源
  - name: 世界设定               # 必填：entryManifest 中的条目名
    type: 世界观                  # 必填：条目类型，见类型说明表
    path: 世界书/世界观/世界设定.yaml  # 必填
  - name: 华东区
    type: 地理
    path: 世界书/地理/华东区.yaml
  - name: 阶段指导
    type: 阶段指导
    path: 世界书/阶段指导/阶段指导.yaml
    purpose: 根据当前阶段渲染主持目标、互动方式和推进边界
  - name: 苏云_基础信息
    type: 角色
    path: 世界书/角色/苏云/基础信息.yaml
    part: basic                   # 可选：角色类型的 part 子分类
    scope: specific               # 可选
    rephrase: false               # 可选
    purpose: 苏云的基础档案       # 可选：给创作阶段用
    source_chapters: [第1章, 第5章] # 可选：转化项目
    keywords: [苏云, 小云]        # 可选：缺省时按 conventions 建议推导

mvu:                             # 可选段落，project.mvu=true 时出现
  structure: |
    顶层结构：
    ├── 世界
    │   ├── 当前时间
    │   ├── 当前区域
    │   ├── 天气与灵气浓度
    │   └── 近期事务
    ├── 苏云
    │   ├── 好感度
    │   ├── 信任度
    │   └── 任务进度
    └── 主角
        ├── 灵力值
        └── 物品栏
  variables:                     # 待细化：粗略规划时可省略或只写粗略结构
    # type 字段默认 string，可省略；需要其他类型时显式声明
    # ── 世界 ──
    - path: 世界.当前时间
      format: YYYY/MM/DD-HH:MM
      description: 当前场景时间
    - path: 世界.当前区域
      description: 角色当前所在区域
    - path: 世界.天气与灵气浓度
      type: object
      fields:
        weather: string          # 晴/阴/雨
        spiritual_density: number # 0-1，灵气浓度
    - path: 世界.近期事务
      type: z.array
      description: 进行中的主线事件标记
    # ── 苏云 ──
    - path: 苏云.好感度
      type: number
      range: 0~100
      check: 关键事件触发跳升，日常互动小幅增长，冷落则每日衰减2点  # 可选，仅特殊/复杂更新要求
    - path: 苏云.信任度
      type: number
      range: 0~100
      check: 与好感度独立；坦诚/帮助行为+5~10，欺骗行为-15~20，信任度影响苏云分享情报的深度
    - path: 苏云.任务进度
      enum: [待命, 调查中, 对峙, 结案]
      description: 协会执法任务阶段
    # ── 主角 ──
    - path: 主角.灵力值
      type: number
      range: 0~100
      description: 当前可用灵力
    - path: 主角.物品栏
      type: z.record

ejs:                             # 可选段落，有 EJS 需求时出现
  entries:
    - name: 华东区
      complexity: 条目显隐
      condition: "getvar('stat_data.世界.当前区域', { defaults: '' }).includes('华东区')"
    - name: 苏云_性格调色盘
      complexity: 段落控制
      stages:                        # 多阶段调色盘的阶段判定条件，与 characters 中 stages 一一对应
        - name: 初识期
          condition: "getvar('stat_data.苏云.好感度', { defaults: 0 }) < 10"
        - name: 熟悉期
          condition: "getvar('stat_data.苏云.好感度', { defaults: 0 }) >= 10 && getvar('stat_data.苏云.好感度', { defaults: 0 }) < 30"
        - name: 亲密期
          condition: "getvar('stat_data.苏云.好感度', { defaults: 0 }) >= 30 && getvar('stat_data.苏云.好感度', { defaults: 0 }) < 60"
        - name: 深爱期
          condition: "getvar('stat_data.苏云.好感度', { defaults: 0 }) >= 60"

first_messages:                  # 可选段落，角色卡时出现；数组顺序对应 state.first_messages
  - format: 叙事式
    word_count: 500~700          # 叙事式时的字数范围，大纲式不需要
    output_path: 开场白/0.txt    # 开场白文件写入路径；叙事式由子代理直接写入，大纲式由主代理保存
    scene: 协会分部门口，雨夜      # 待细化：粗略规划时可省略
    opening_situation: |         # 待细化：粗略规划时可省略
      苏云收到协会指令，前往华东分部报到时，在门口遇见<user>。
      她没想到这次任务的搭档竟是个看起来完全不像修仙者的人。
  - format: 叙事式
    word_count: 300~500
    output_path: 开场白/1.txt    # 额外开场白路径
    scene: 一周后的咖啡馆
    opening_situation: |
      苏云主动约你在一间安静的咖啡馆见面。
      她脱掉了协会制服，看起来比平时放松，但眼神里仍带着某种试探。
    initvar_override: 开场白/initvar/1.yaml  # 可选；该开场白需要不同的初始变量时填写
```
