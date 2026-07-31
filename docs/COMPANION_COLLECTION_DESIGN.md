# Companion Collection — Future Product Design

> **状态**：长期产品方向（设计冻结草案）  
> **非目标**：Alpha 实现、数据库 schema、抽卡系统、Runtime Contract 变更  
> **配套**：`SOBER_AI_ARCHITECTURE_SPECIFICATION.md` § Future Product Model  
> **日期**：2026-08-01

---

## 1. 定位

### Alpha（当前）

- **单 Companion** 验证核心体验：Brain · Memory · Relationship · Emotion · Voice · Avatar  
- 产品语义：「一个人」——进入唯一伴侣，跑通沉浸闭环  
- 不实现 Collection、不实现稀有度商店、不实现抽卡

### Future（方向）

在 **不破坏 Runtime Contract** 的前提下，演进为 **Companion Collection**：

- 用户可拥有 / 切换多个 Companion  
- **每个 Companion 独立拥有**完整陪伴资产与关系记忆，而不是共用一套人格壳  

这与 YeYe 式「多角色 UGC 市场 / Creator 经济 / Tavern」不同：

| | YeYe 市场 | Sober Companion Collection（未来） |
|--|-----------|-------------------------------------|
| 角色来源 | UGC / 创作者无限上传 | 系统策展或受控发行（产品层） |
| 会话模型 | 选卡开聊，偏 RPG | 独立 Companion 人生与关系 |
| Runtime | 可双路径 / 角色卡污染 | 仍单 Brain Path；回合只绑定当前 Companion |
| 变现隐喻 | 平台抽成 | 可选用稀有度叙事；**不做抽卡实现设计** |

---

## 2. Companion 独立资产模型

每个 Companion 作为一等产品对象，独立持有：

| 资产 | 说明 |
|------|------|
| **Identity** | 姓名、核心人设、边界、成人向能力策略 |
| **Personality** | 性格深度、说话风格、互动倾向 |
| **Voice Profile** | 音色、默认韵律、会话策略绑定 |
| **Avatar Asset Pack** | 2.5D 包、动作白名单、表情资产 |
| **Skills** | 能力配置（陪伴技能、工具权限等；未来扩展） |
| **Relationship** | 与**该用户**的独立关系状态机与里程碑 |
| **Memory** | 与**该用户×该 Companion** 的事实记忆空间 |

**关键约束**：切换 Companion = 切换整条关系/记忆/表达资产上下文；禁止「换皮共用记忆」。

---

## 3. CompanionCard（未来产品层概念）

`CompanionCard` 是 **产品展示与编目** 概念，不是 Alpha 数据库表，也不是 Runtime Context 字段。

### 概念组成

| 组成 | 含义 |
|------|------|
| Companion identity | 对外身份与人设摘要 |
| Personality profile | 性格/风格档位与深度说明 |
| Voice profile | 绑定的语音形象（展示用元数据） |
| Avatar asset pack | 视觉包标识与丰富度摘要 |
| Skill profile | 技能/能力清单摘要 |
| Rarity metadata | R / SR / SSR 等稀有度元数据 |

### 与 Runtime 的关系

```
CompanionCard          ← 产品层编目 / UI 展示
        │
        │ 选中 / 激活（未来）
        ▼
Companion 领域真源     ← Identity / Voice / Avatar / Skills / …
        │
        │ builder 投影
        ▼
companionContext + voiceContext + avatarContext + …
        │
        ▼
Brain Turn（契约不变）
```

Card **不进入** `BrainTurnInput`；Brain 只看见投影后的 Context。

---

## 4. R / SR / SSR 设计原则

稀有度是 **产品叙事与价值分层**，不是世界观文案长度竞赛。

### 禁止

- 仅用「设定字数 / lore 厚度」决定 R/SR/SSR  
- 用稀有度绑架 Runtime（例如 SSR 走第二条 LLM 路径）  
- 在本设计阶段展开抽卡、保底、扭蛋池实现  

### 价值因素（综合评估）

| 因素 | 说明 |
|------|------|
| **Avatar 资产丰富度** | 表情、动作、特殊演出、资产完成度 |
| **Voice 质量** | 音色辨识度、韵律表现、会话体验完成度 |
| **Personality 深度** | 性格一致性、可互动层次、边界与成长设计 |
| **Skill 能力** | 可感知的陪伴技能与差异化能力 |
| **Relationship 成长潜力** | 关系阶段、里程碑、长期陪伴可玩性设计空间 |

稀有度标签挂在 `CompanionCard.rarity metadata`；**不改变** Single Brain Path / Update Bus / Context 切片形状。

---

## 5. PRODUCT UI LANGUAGE RULE

### 规则

**所有用户可见 UI 默认使用中文。**

包括但不限于：

- 页面标题  
- 按钮  
- 导航  
- 设置  
- 状态提示  
- 错误提示  

### 仍使用英文

- 代码标识符、变量、类型名  
- 数据库字段与表名  
- 仓库路径、API 路由段（若未来存在）  
- 架构 / 契约文档中的类型名（如 `companionContext`）  

### 说明

- Alpha 未进入 UI 开发；本规则为 **未来实现约束**，提前冻结，避免英中混杂产品面  
- Companion 对白语言由 Companion / 用户偏好决定，不受本规则强制为中文（本规则管 **产品壳 UI**，不管角色台词）  

---

## 6. Runtime Contract 兼容性检查

结论：**未来 Companion Collection 不破坏已冻结的 Runtime Contract。**

### 兼容方式

| Context 切片 | Alpha | Collection 未来 | 是否破坏契约 |
|--------------|-------|-----------------|--------------|
| `companionContext` | 单一种子 Companion 投影 | **当前激活** Companion 的 Identity 投影 | 否 — 形状不变，换数据源 |
| `relationshipContext` | User↔唯一 Companion | User↔**当前** Companion 的关系投影 | 否 — 按 `(user, companionId)` 隔离真源 |
| `memoryContext` | 单记忆空间检索结果 | **当前** Companion 记忆空间检索结果 | 否 — 检索范围带 `companionId` |
| `avatarContext` | 单一资产包态 | **当前** Companion 的 Avatar pack 态 | 否 — 字段语义不变 |
| `voiceContext` | 单一 / 空 session | **当前** Companion 的 Voice profile + session | 否 — 字段语义不变 |
| `emotionContext` | 当前情绪 | 仍属当前 Companion 会话情绪 | 否 |
| `userContext` / `debugMeta` | 用户与排障 | 不变；`debugMeta` 可记录 `companionId`（扩展另议） | 否（扩展非破坏） |

### 必须保持的不变式

1. 每回合仍只有一个 `SoberRuntimeContext`、一条 Brain Path  
2. `BrainTurnInput` / `BrainTurnOutput` 形状不因 Collection 而分叉  
3. Update Bus 仍按模块分发；记忆/关系按 Companion 隔离写入  
4. 不引入第二条 Prompt Compiler，不引入 ST/市场角色卡主路径  
5. **不修改** Phase 0.9 已冻结的类型实现来「预埋」抽卡或 Card 表  

### 明确延后

- Collection UI、Card 仓库、稀有度运营后台  
- 多 Companion schema / migration  
- 抽卡、保底、碎片合成等获取玩法实现  

---

## 7. 与 Alpha 的边界

| 现在做 | 现在不做 |
|--------|----------|
| 文档记录未来模型与兼容性 | 改 `src/runtime-context/types.ts` |
| 产品 UI 中文规则冻结 | UI 开发 |
| 稀有度**原则** | 抽卡系统、商城、数据库 |

Alpha 成功标准仍是：单 Companion 沉浸闭环成立。  
Collection 仅在核心体验验证后再开独立产品阶段。

---

## 相关文档

- `docs/SOBER_AI_ARCHITECTURE_SPECIFICATION.md` — Future Product Model 章节  
- `ARCHITECTURE.md` — 仓库级摘要  
- `docs/BRAIN_TURN_CONTRACT.md` / `docs/UPDATE_BUS.md` — 不变契约  
