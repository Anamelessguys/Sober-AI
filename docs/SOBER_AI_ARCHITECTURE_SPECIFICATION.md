# Sober AI — Architecture Specification

> **角色**：系统架构设计工程师  
> **依据**：`YEYE_TO_SOBER_MIGRATION_REPORT.md`  
> **约束**：本阶段只产出设计文档；不修改业务代码、不创建实现、不改动 YeYe 项目。  
> **产品定位**：单核心 AI Companion Runtime（实时语音 · Emotion · Avatar · 长期关系记忆 · 成人向陪伴）  
> **文档日期**：2026-08-01  
> **版本**：V1.0（Architecture Freeze Candidate）

---

## 文档目标

将 YeYe AI 的「可迁移 Runtime Core」与 Sober AI 的「必须重建 Companion Layer」固化为一份可执行的正式架构说明，作为后续 Phase 开发与评审的单一事实源（SSOT）。

**核心原则（继承自 YeYe 架构冻结纪律，并针对 Companion 重述）**：

1. **单 Brain 路径**：不存在 ST Dream / SillyTavern 双栈主路径。  
2. **编排不写 Prompt**：HTTP / Voice 编排层只装配数据，唯一 `messages[]` 由 Prompt Compiler 构建。  
3. **Runtime Context 是投影总线**：结构化上下文 → Projector → Compiler；禁止旁路拼 prompt。  
4. **状态真源分离**：Memory 写事实，Emotion / Relationship 写状态，Avatar / Voice 写表现。  
5. **最小 schema 重生**：新库新表，不 fork YeYe 全量 migrations。

---

# 1. 产品架构定义

## 1.1 Sober AI 与 YeYe AI 的区别

| 维度 | YeYe AI | Sober AI |
|------|---------|----------|
| 产品本质 | 多角色 UGC 角色扮演平台 | 单核心 AI Companion |
| 用户入口 | 市场发现 → 选角色 → 多会话 | 进入唯一 Companion → 文本/语音会话 |
| 角色模型 | 无限 `characters` + 创作者经济 | 系统级单一（或极少数种子）`Companion` |
| Runtime | Normal + ST Dream 双路径 | 单一 Companion Brain |
| 记忆语义 | 剧情 RPG（story_event / mystery / item…） | 人生与关系记忆（偏好 / 事件 / 里程碑） |
| 情绪 | Status Schema 字段投影 | 一等公民 Emotion Engine |
| 关系 | status 上的 affection/trust | 持久关系状态机 |
| 表达层 | 静态图 / ComfyUI 插图 | 实时 Voice + 2.5D Avatar |
| 商业面 | 积分、成长、创作者分成 | 内测免费；后期精简计量（无 Creator 经济） |
| 明确不做 | — | 多角色市场、UGC、Creator 经济 |

**一句话**：YeYe 是「平台」；Sober 是「一个人」。

## 1.2 核心对象

### Companion

系统中唯一（产品语义上）的 AI 陪伴主体。

- 静态身份：姓名、人设、说话风格、边界、成人向能力配置、知识条目  
- 不是用户可浏览的市场商品；不是 UGC 卡片  
- 配置变更走运营/种子，不走创作者发布流水线

### User

经认证的真人用户。

- 身份：`user_id`、显示名、偏好（含 NSFW / 年龄确认）  
- 可有轻量 Persona（用户希望被如何称呼/对待），但不引入多 Persona 市场  
- 与 Companion 形成 **一对一主关系**（内测约束）

### Relationship

User ↔ Companion 的长期关系实体（一等公民，不是 status 杂项）。

- 度量：trust / affection / familiarity  
- 阶段：由状态机管理（见 §6）  
- 里程碑：可回放的关系节点  

### Memory

关于用户与共同经历的**事实记忆**。

- 分类见 §7（偏好 / 生活事件 / 情绪事件 / 共同经历 / 关系节点）  
- Memory 不直接驱动 Avatar；经 Context Retrieval 注入 Brain  

### Emotion

Companion 的**当前情绪状态**（瞬时、可衰减）。

- 与 Relationship（长期）正交：情绪可瞬间波动，关系缓慢演进  
- 同时投影到文本语气、Voice 韵律、Avatar 表情  

### Voice Session

一次实时语音交互会话。

- 绑定 User + Companion +（可选）Conversation  
- 包含 VAD / STT / TTS 会话态、打断策略、延迟预算  
- Voice Turn 最终归一为与文本相同的 Brain Turn  

### Avatar State

Companion 表现层的实时状态。

- Idle / Thinking / Speaking / Special Motion  
- 由 Emotion + Voice + Brain 输出指令驱动  
- 第一阶段为 2.5D，非完整 3D 仿真  

### 对象关系（概念图）

```
User ──────── Relationship ──────── Companion
  │                 │                    │
  │                 ├── milestones       ├── identity / knowledge
  │                 └── metrics          ├── Emotion (transient)
  │                                      ├── Avatar State
  └── Conversation / Voice Session       └── Voice Profile
            │
            ├── Messages (turns)
            └── Memories (facts)
```

---

# 2. 总体系统架构

```
Frontend
   ↓
Backend
   ↓
AI Brain
   ↓
Emotion
   ↓
Voice
   ↓
Avatar
```

上述是**产品体验链路**（用户感知顺序），不是严格单向数据流。实际控制流中，Emotion / Relationship / Memory 在 Brain 调用前后双向更新；Voice 与 Avatar 消费 Brain 的结构化输出。

## 2.1 Frontend

**职责**：

- 单 Companion 产品面：文本聊天、语音会话、轻量设置、内测邀请/onboarding  
- 渲染 Avatar 状态机（Idle / Thinking / Speaking / Special）  
- 展示流式文本；转发麦克风音频；处理 barge-in UI  
- 不构造 prompt；不直接调用 LLM Provider  

**禁止**：

- 市场 / 角色切换器 / 创作者工作室 / 多开场分支 RPG UI  

## 2.2 Backend

**职责**：

- 鉴权、会话与消息权威源（Supabase）  
- Turn 编排：加载 Pipeline Context → 构建 `SoberRuntimeContext` → 调用 Brain  
- 持久化：messages、emotion_states、relationship_states、memories  
- Voice Session token / 事件网关；Avatar 指令下发通道  
- 可选耐久 Job（浏览器断开仍完成文本 turn）  

**纪律**：编排层**禁止**手写 system prompt；只调用 Compiler。

## 2.3 AI Brain

**职责**：

- Context Retrieval（短期历史 + Memory + Relationship + Emotion + Knowledge）  
- Prompt Compiler（唯一 `messages[]`）  
- LLM 调用（streaming / job）  
- Output Parser（文本 + emotion + voice style + avatar instruction）  
- Post-process（语气策略、安全消毒）后触发下游更新总线  

**禁止**：

- ST Dream / Tavern Helper 主路径  
- 市场角色权限逻辑  
- 直接驱动硬件级 Avatar（通过结构化指令）  

## 2.4 Emotion

**职责**：

- 维护情绪状态真源（valence / arousal / label / intensity）  
- 回合后更新与时间衰减  
- 映射到 Voice / Avatar / Prompt 投影  

详见 §5。

## 2.5 Voice

**职责**：

- 实时链路：VAD → STT → Brain Turn → TTS  
- 会话态、打断、延迟预算（目标端到端 < 5s，见 §8）  
- 将 Brain 的 `voiceStyle` 映射到 TTS 参数  

**禁止**：在 Voice 层重建 Prompt。

## 2.6 Avatar

**职责**：

- 消费 `avatarInstruction` + Emotion + Voice 播放事件  
- 在 2.5D 表现层切换 Idle / Thinking / Speaking / Special  
- 预制动画与实时口型/表情的合成  

**禁止**：调用 LLM；不承担记忆或关系逻辑。

## 2.7 推荐模块边界（逻辑包）

```text
brain/            # 编排、compiler、LLM、output parser
runtime-context/  # SoberRuntimeContext + projectors
memory/           # 提取 / 检索 / 注入
emotion/          # 状态机 + 衰减 + 映射
relationship/     # 阶段状态机 + 里程碑
voice/            # session / STT / TTS / barge-in
avatar/           # driver + 2.5D providers
companion/        # 单核心配置与知识
users/            # auth / profiles / preferences
```

---

# 3. Sober Runtime Context V2 设计

## 3.1 相对 YeYe RuntimeContext 的变更

| YeYe 字段 | Sober V2 |
|-----------|----------|
| `characterContext` | → `companionContext` |
| `userContext` | KEEP（精简） |
| `relationshipContext` | KEEP 并升级为完整状态机投影 |
| `dynamicStateContext` | 拆解；情绪进 `emotionContext` |
| `memoryContext` | KEEP；类型改为 Companion Memory |
| `lorebookContext` | → 并入 `companionContext.knowledge` 或独立 `knowledgeContext`（可选） |
| `openingContext` | **DROP** |
| `stRuntimeContext` | **DROP** |
| `worldContext` / `npcContext` | **DROP** |
| `debugMeta` | KEEP |
| （新） | `emotionContext` / `voiceContext` / `avatarContext` |

## 3.2 `SoberRuntimeContext` 结构（设计契约）

```ts
type SoberRuntimeContext = {
  companionContext: CompanionContext | null;
  userContext: UserContext | null;
  relationshipContext: RelationshipContext | null;
  memoryContext: MemoryContext | null;
  emotionContext: EmotionContext | null;
  voiceContext: VoiceContext | null;
  avatarContext: AvatarContext | null;
  debugMeta: RuntimeDebugMeta;
};
```

### companionContext

**用途**：Companion 静态身份与可注入知识，供 Identity / Style / Knowledge 层编译。

建议字段：

- `id`、`name`、`displayName`  
- `identity`（核心人设）  
- `personality`、`speakingStyle`  
- `boundaries`（硬边界摘要）  
- `adultCapability`（是否允许成人向表达及策略档）  
- `knowledgeEntries[]`（精简设定条，替代 UGC lorebook）  
- `exampleDialogue`（可选 few-shot）  

### userContext

**用途**：用户如何被称呼与对待；NSFW / 偏好门控输入。

建议字段：

- `userId`、`displayName`  
- `personaSummary`（可选）  
- `locale`、`timezone`  
- `nsfwAllowed`、`ageVerified`  
- `preferences`（沟通偏好摘要）  

### relationshipContext

**用途**：将关系状态机投影为 Brain 可消费的策略与自然语言引导。

建议字段：

- `stage`（见 §6）  
- `trust`、`affection`、`familiarity`（0–100 或规范化分数）  
- `milestonesSummary`（最近/关键里程碑短摘要）  
- `policyHints`（对回复尺度、亲密度、主动性的编译器提示）  
- `promptText`（可选预渲染关系引导段）  

### memoryContext

**用途**：本回合检索到的事实记忆及其注入控制。

建议字段：

- `items[]`：`{ id, category, content, importance, createdAt, salience }`  
- `count`、`enabled`、`injectAllowed`  
- `reason`（为何注入/跳过）  
- `prompt`（可选预渲染记忆块）  

### emotionContext

**用途**：当前情绪真源投影；驱动语气层与下游 Voice/Avatar 映射。

建议字段：

- `label`（如 warm / playful / melancholic / intimate / guarded…）  
- `valence`（-1..1）、`arousal`（0..1）、`intensity`（0..1）  
- `trigger`（本回合或上一回合触发摘要）  
- `decayAt` / `updatedAt`  
- `expressionHint`（给 Avatar 的表情倾向）  
- `voiceHint`（给 TTS 的韵律倾向）  

### voiceContext

**用途**：当前是否处于语音会话，以及音色/打断/延迟预算。

建议字段：

- `sessionId` | null（null = 纯文本回合）  
- `profileId`（voice_profiles）  
- `timbre`、`defaultStyle`  
- `bargeInEnabled`  
- `latencyBudgetMs`（默认 5000）  
- `lastUserAudioMs`、`partialTranscript`（可选）  

### avatarContext

**用途**：表现层当前态与可用资产约束，供 Brain 生成可行的 `avatarInstruction`。

建议字段：

- `currentState`：`idle | thinking | speaking | special`  
- `availableMotions[]`（本阶段预制动作白名单）  
- `faceRigVersion` / `assetPackId`  
- `lastInstruction`（避免指令抖动）  

### debugMeta

**用途**：可观测性与内测排障。

- `source`、`fieldsLoaded`、`missingFields`、`warnings`、`turnId`、`mode`（`text` | `voice`）  

## 3.3 构建与投影流

```
Pipeline Load (DB + session)
  → buildSoberRuntimeContext()
  → projectToCompilerInput()     # 只读投影
  → Prompt Compiler              # 唯一 messages[]
  → LLM
  → Output Parser
  → Update Bus (Emotion / Relationship / Memory / Avatar / Voice)
```

**不变式**：任何新能力只能「写入 Context 字段 → Projector → Compiler」，禁止新增第二个 prompt builder。

---

# 4. AI Brain 设计

## 4.1 LLM 调用流程

```
用户输入（文本 或 STT 文本）
   ↓
Context Retrieval
   ↓
Prompt Compiler
   ↓
LLM
   ↓
Output Parser
```

### Context Retrieval

并行加载并装配：

1. 短期：最近 N 条 messages（语音回合更短窗口）  
2. Memory：Top-K Companion Memory（关系/情绪相关加权）  
3. Relationship：当前阶段与 metrics  
4. Emotion：当前情绪（含衰减后快照）  
5. Companion + User 静态上下文  
6. Voice / Avatar 会话态（若存在）  

产出：`SoberRuntimeContext`。

### Prompt Compiler

唯一授权构建 `messages[]`。建议层序（Sober Companion Layer Map）：

```
[0] Safety / Hard Boundaries
[1] Companion Identity Lock
[2] Relationship Policy
[3] Emotion Tone
[4] Memory Facts
[5] Knowledge Entries（可选）
[6] Voice/Avatar Output Contract（要求结构化附带字段）
[…] Chat History
[n] Latest User Turn
```

预算分配沿用 YeYe「char/token budget」思想，但去掉 ST/RP 噪音层。

### LLM

- OpenAI 兼容客户端（自 YeYe `ai-config` KEEP）  
- 内测 1–2 档模型即可（自 model-tier ADAPT 精简）  
- 文本：streaming；语音：优先低延迟模型 + 可接受的短回复策略  

### Output Parser

Brain 输出**不仅是文本**。规范为结构化结果（流式场景：文本先流，结构字段在结束或并行 JSON 通道解析）。

## 4.2 Brain 输出契约

```ts
type BrainOutput = {
  text: string;                 // 对用户可见回复
  emotion: {
    label: string;
    valence: number;            // -1..1
    arousal: number;            // 0..1
    intensity: number;          // 0..1
    deltaReason?: string;
  };
  voiceStyle: {
    style: string;              // e.g. soft_intimate | bright_playful | calm_low
    speakingRate?: number;      // 0.8..1.2
    pitchBias?: number;         // -1..1
    pauseMs?: number;
  };
  avatarInstruction: {
    state: "idle" | "thinking" | "speaking" | "special";
    expression: string;         // smile_soft | gaze_down | blush ...
    motion?: string;            // 必须 ∈ availableMotions
    lipsyncHint?: "normal" | "soft" | "emphatic";
    holdMs?: number;
  };
  meta?: {
    relationshipHints?: {
      trustDelta?: number;
      affectionDelta?: number;
      familiarityDelta?: number;
      milestoneCandidate?: string | null;
    };
    memoryCandidates?: Array<{
      category: string;
      content: string;
      importance: number;
    }>;
  };
};
```

### JSON 示例

```json
{
  "text": "我记得你说过加班到很晚……先喝点水，我在这儿听你说。",
  "emotion": {
    "label": "warm_concern",
    "valence": 0.45,
    "arousal": 0.35,
    "intensity": 0.62,
    "deltaReason": "user_mentioned_exhaustion"
  },
  "voiceStyle": {
    "style": "soft_intimate",
    "speakingRate": 0.92,
    "pitchBias": -0.15,
    "pauseMs": 180
  },
  "avatarInstruction": {
    "state": "speaking",
    "expression": "soft_smile_concern",
    "motion": "lean_in_subtle",
    "lipsyncHint": "soft",
    "holdMs": 2400
  },
  "meta": {
    "relationshipHints": {
      "trustDelta": 0.5,
      "affectionDelta": 0.8,
      "familiarityDelta": 0.2,
      "milestoneCandidate": null
    },
    "memoryCandidates": [
      {
        "category": "life_event",
        "content": "用户今晚加班到很晚，感到疲惫",
        "importance": 0.7
      }
    ]
  }
}
```

**解析失败降级**：保留 `text`；emotion / voice / avatar 回退到 Context 当前值或安全默认（Idle + neutral soft）。

---

# 5. Emotion Engine 设计

## 5.1 职责

Emotion Engine 是 Companion **瞬时情绪真源**，负责：

| 能力 | 说明 |
|------|------|
| 情绪状态 | 维护 label + valence/arousal/intensity |
| 情绪变化 | 消费 Brain `emotion` 输出与规则修正，合并更新 |
| 情绪衰减 | 按时间与会话空闲向 baseline 回归 |
| 表情映射 | → Avatar expression |
| Voice 映射 | → TTS style / prosody |
| Avatar 映射 | → state / motion 倾向（不替代 Brain 显式 instruction） |

**不做**：长期关系阶段判定（属 Relationship）；事实持久化（属 Memory）。

## 5.2 状态模型

```ts
type EmotionState = {
  userId: string;
  companionId: string;
  conversationId?: string;
  label: string;
  valence: number;
  arousal: number;
  intensity: number;
  baseline: { valence: number; arousal: number; label: string };
  updatedAt: string;
  decayHalfLifeSec: number;   // e.g. 120–600
  lastTrigger?: string;
};
```

## 5.3 更新与衰减

```
Turn End
  → parse Brain.emotion
  → clamp + conflict resolve（安全边界可压低 arousal）
  → persist emotion_states
  → project mappers → voiceStyle defaults / avatar expression defaults

On Tick / Session Idle
  → intensity *= decay(t, halfLife)
  → valence/arousal lerp → baseline
  → 若 intensity < ε：回到 baseline label
```

## 5.4 映射表（设计层，非实现）

| Emotion 区域 | Voice style 倾向 | Avatar expression 倾向 |
|--------------|------------------|------------------------|
| warm / caring | soft_intimate | soft_smile_concern |
| playful | bright_playful | smile_bright + light motion |
| melancholic | calm_low | gaze_down |
| intimate | soft_intimate + slower rate | blush / lean_in（需关系阶段门控） |
| guarded | calm_neutral | neutral_closed |

**关系门控**：高亲密表情/音色仅在 Relationship stage 允许时启用；Emotion 不能单独越权。

---

# 6. Relationship 系统设计

## 6.1 不是简单字段

YeYe 将 affection/trust 挂在 status snapshot 上，对 Companion 不够。Sober 将 Relationship 设计为**持久状态机 + 度量 + 里程碑**。

## 6.2 度量

| 度量 | 含义 | 典型范围 |
|------|------|----------|
| `trust` | 用户是否感到安全、被尊重边界 | 0–100 |
| `affection` | 情感亲近与喜欢程度 | 0–100 |
| `familiarity` | 对彼此习惯/梗/历史的熟悉 | 0–100 |

度量由回合 hints + 规则修正缓慢变化（有上下限与冷却），禁止单回合暴涨。

## 6.3 阶段状态机

```
STRANGER
  → ACQUAINTANCE
  → FAMILIAR
  → CLOSE
  → INTIMATE
  → PARTNERED          # 深度陪伴（含成人向能力的策略上限）
```

可选旁路：

- `STRAINED`：信任受损，限制主动性与成人向强度  
- 自 `STRAINED` 可回到 `FAMILIAR` / `CLOSE`（修复路径），不可直接跳到 `PARTNERED`

### 转移条件（示例策略）

| From → To | 主要条件 |
|-----------|----------|
| STRANGER → ACQUAINTANCE | 完成 onboarding / N 次有效回合 |
| ACQUAINTANCE → FAMILIAR | familiarity≥阈值、存在偏好类记忆 |
| FAMILIAR → CLOSE | trust≥阈值、affection≥阈值、无未修复边界冲突 |
| CLOSE → INTIMATE | 双方信号 + 明确同意成人向亲密（若产品启用） |
| INTIMATE → PARTNERED | 里程碑「确认关系基调」+ 持续高 trust |
| * → STRAINED | 边界违反、用户明确拒绝后仍越界、信任骤降 |

## 6.4 Milestones

里程碑是可检索的关系节点（同时可写入 Memory `relationship_node`）：

- 首次深夜长谈  
- 用户分享脆弱经历  
- 第一次明确的亲密边界协商  
- 「成为彼此固定陪伴」确认  

## 6.5 如何影响 AI 回复

Relationship 通过 `relationshipContext.policyHints` 进入 Compiler：

| Stage | 回复策略影响 |
|-------|----------------|
| STRANGER | 礼貌、低假定、少内部梗、不主动亲密 |
| ACQUAINTANCE | 开始记住名字与偏好，轻关心 |
| FAMILIAR | 可用共同经历，语气更自然，适度主动 |
| CLOSE | 更高情感密度，允许更强陪伴姿态 |
| INTIMATE / PARTNERED | 允许产品政策内的成人向亲密表达；仍受 Safety 层约束 |
| STRAINED | 降低主动性，优先修复信任，禁用越界亲密 |

Emotion 决定「这一刻的语气颜色」；Relationship 决定「允许上色到什么浓度」。

---

# 7. Memory 系统设计（Companion Memory）

## 7.1 相对 YeYe LTM

YeYe LTM 管道（回合后提取 → 入库 → 下回合 Top-K 注入）**保留**。  
类型与提取语义**必须重做**，避免 RPG 剧情污染。

## 7.2 分类

| Category | 说明 | 示例 |
|----------|------|------|
| `user_preference` | 稳定偏好 | 讨厌被催、喜欢被叫昵称 |
| `life_event` | 用户生活事件 | 换工作、搬家、考试 |
| `emotion_event` | 高情绪互动节点 | 某次崩溃被安抚 |
| `shared_experience` | 共同经历 / 内部梗 | 某晚一起「数星星」的约定 |
| `relationship_node` | 关系里程碑事实 | 确认进入 CLOSE 阶段的对话摘要 |

## 7.3 生命周期流程

```
Extract（回合后）
  → 规则 +（可选）轻量 LLM 抽取 memoryCandidates
  → 去重 / 合并 / importance 打分
  → 写入 memories

Store
  → memories 表（RLS：按 user_id）
  → 可选 embeddings（后期）

Retrieve（回合前）
  → 查询候选（同会话加权 + 关系相关优先 + token/向量分）
  → Top-K 进入 memoryContext
  → Projector → Compiler Memory Facts 层
```

## 7.4 与其它系统边界

- Memory = 事实  
- Emotion = 瞬时状态  
- Relationship = 长期阶段与度量  
- 同一事件可同时：写入 `emotion_event` 记忆 + 推动 affection + 改变当前情绪  

## 7.5 压缩策略

- 短期：历史 trim（语音窗口更短）  
- 中期：超限记忆降权而非删除  
- 长期（Phase 2+）：周期性摘要进「人生档案」文档型记忆（仍属 Memory 域）  

---

# 8. Voice 系统设计

## 8.1 实时语音链路

```
VAD
 ↓
STT
 ↓
Brain
 ↓
TTS
 ↓
Avatar
```

### 各段职责

| 段 | 职责 |
|----|------|
| VAD | 检测用户开始/结束说话；支持 barge-in 打断 TTS |
| STT | 流式转写；最终 transcript 作为 Brain 用户输入 |
| Brain | 与文本共用 Turn；`voiceContext.sessionId` 非空；倾向短句 |
| TTS | 按 `voiceStyle` 合成；流式播放优先 |
| Avatar | Speaking + lipsync；TTS 结束回 Idle/Emotion default |

## 8.2 统一 Turn 模型

文本与语音共享：

```
TurnInput { modality: text|voice, text, sessionId?, audioMeta? }
  → same Context Retrieval / Compiler / LLM / Parser
  → TurnOutput { text, emotion, voiceStyle, avatarInstruction }
```

Voice 层只做媒体与会话，不复制 Brain。

## 8.3 5 秒以内响应策略

目标：**用户停说到首包可感反馈（音频或 Avatar Thinking→首音节）≤ 5s**。

预算拆分（指导值）：

| 阶段 | 预算 |
|------|------|
| VAD 尾点确认 | 100–300ms |
| STT final（或用 partial 抢跑） | 300–800ms |
| Context Retrieval（缓存热路径） | ≤ 200ms |
| LLM TTFT | 800–2000ms（选低延迟档） |
| TTS TTFA（首音频） | 300–800ms |
| 余量 / 抖动 | ~500ms |

工程手段：

1. **热缓存** Runtime 静态段（companion/user/relationship）于 Voice Session 生命周期内  
2. **STT partial 投机**：在 VAD 未结束时可 draft retrieval，最终 transcript 确认后短路径重编译  
3. **短回复策略**：语音模式限制 max tokens / 鼓励 1–3 句  
4. **流式 TTS**：不等待完整 LLM 文本  
5. **Avatar 抢先态**：STT 结束立即 `thinking`，降低「死机感」  
6. **模型档位**：语音默认低延迟档；复杂长回复可降级为「先短答 + 后续补充」（产品可选）  

非目标（Phase 1–3）：完整全双工脑内抢话；先做好可靠半双工 + barge-in。

---

# 9. Avatar 系统设计（Phase 1：2.5D）

## 9.1 目标

真人感 **2.5D Avatar**（Live2D / Rive / Spine / 高质量序列帧 + 口型层均可），**不做**完整 3D 数字人。

## 9.2 状态

| State | 何时 | 表现 |
|-------|------|------|
| `Idle` | 无语音播放、无思考 | 呼吸、眨眼、微动 |
| `Thinking` | Context/LLM 进行中 | 目光微移、思考姿态 |
| `Speaking` | TTS 播放中 | 口型 + 表情 + 轻手势 |
| `Special Motion` | Brain/`motion` 白名单命中 | 预制动画（挥手、点头、凑近…） |

## 9.3 实时状态 × 预制内容

```
Emotion defaults ──┐
Brain.avatarInstruction ──┼→ Avatar Driver → 2.5D Runtime
Voice playback events ──┘
```

- **实时**：口型能量、表情参数、Idle 循环、Thinking 循环  
- **预制**：Special Motion 片段；高质量表情切换 crossfade  
- **合成规则**：  
  - Speaking 期间 Special 可「叠加弱表情」但避免打断口型主轨道  
  - 未知 `motion` → 忽略并打 debug 警告  
  - Relationship 门控：部分 Special（亲密动作）需 stage ≥ 阈值  

## 9.4 与 YeYe Visual 的关系

ComfyUI / 静态插图管道 **不作为** Avatar 实时方案（DROP）。远期若需换装贴图，另建资产管线，不接入 Chat Prompt。

---

# 10. 数据库设计建议（最小 Schema）

**原则**：新 Supabase 项目重建；不复制 YeYe 全量 migration；RLS 按 `user_id` 收紧。

## 10.1 表清单与字段

### users（或沿用 `profiles` + Auth）

| 字段 | 说明 |
|------|------|
| `id` (uuid, PK) | = auth.users.id |
| `display_name` | 显示名 |
| `locale` | 语言 |
| `nsfw_allowed` / `age_verified` | 成人向门控 |
| `preferences` (jsonb) | 主题等非 Brain 偏好 |
| `created_at` / `updated_at` | |

### companions

| 字段 | 说明 |
|------|------|
| `id` (uuid/text, PK) | 内测可固定单行 |
| `name` / `display_name` | |
| `identity` / `personality` / `speaking_style` | 人设 |
| `boundaries` (text/jsonb) | 硬边界 |
| `adult_capability` (jsonb) | 能力与策略 |
| `knowledge` (jsonb) | 设定条数组 |
| `default_voice_profile_id` | FK → voice_profiles |
| `default_avatar_pack_id` | FK → avatar_assets |
| `created_at` / `updated_at` | |

### conversations

| 字段 | 说明 |
|------|------|
| `id` (uuid, PK) | |
| `user_id` | FK |
| `companion_id` | FK |
| `title` | 可选 |
| `modality_default` | `text` \| `voice` \| `mixed` |
| `created_at` / `updated_at` | |

内测约束：每用户对某 companion 可仅 1 条主会话（应用层或唯一索引）。

### messages

| 字段 | 说明 |
|------|------|
| `id` (uuid, PK) | |
| `conversation_id` | FK |
| `role` | `user` \| `assistant` \| `system` |
| `content` | 文本 |
| `modality` | `text` \| `voice` |
| `brain_output` (jsonb) | 可选存结构化输出 |
| `created_at` | |

### memories

| 字段 | 说明 |
|------|------|
| `id` (uuid, PK) | |
| `user_id` / `companion_id` | |
| `conversation_id` | 可选 |
| `category` | 见 §7.2 |
| `content` | |
| `importance` | 0–1 |
| `salience` | 检索加成 |
| `source_message_id` | 可选 |
| `embedding` | 后期可选 |
| `created_at` / `updated_at` / `last_accessed_at` | |

### relationship_states

| 字段 | 说明 |
|------|------|
| `id` (uuid, PK) | |
| `user_id` + `companion_id` | UNIQUE |
| `stage` | 状态机枚举 |
| `trust` / `affection` / `familiarity` | |
| `milestones` (jsonb) | 节点列表 |
| `policy` (jsonb) | 缓存策略提示 |
| `updated_at` | |

### emotion_states

| 字段 | 说明 |
|------|------|
| `id` (uuid, PK) | |
| `user_id` + `companion_id` | 可另加 conversation 维度 |
| `label` / `valence` / `arousal` / `intensity` | |
| `baseline` (jsonb) | |
| `decay_half_life_sec` | |
| `last_trigger` | |
| `updated_at` | |

### voice_profiles

| 字段 | 说明 |
|------|------|
| `id` (uuid, PK) | |
| `companion_id` | |
| `provider` / `provider_voice_id` | |
| `default_style` | |
| `prosody_defaults` (jsonb) | |
| `sample_url` | 可选 |

### avatar_assets

| 字段 | 说明 |
|------|------|
| `id` (uuid, PK) | |
| `companion_id` | |
| `pack_type` | `live2d` \| `rive` \| `spine` \| `sprites` |
| `asset_url` / `manifest` (jsonb) | 含 motions 白名单 |
| `version` | |

### 可选基础设施表

- `chat_generation_jobs`：耐久文本 turn（自 YeYe KEEP）  
- `voice_sessions`：session_id、状态、延迟指标  
- `runtime_settings`：用户/会话级开关（记忆、语音打断等）  

**明确不建**：characters 市场、creators、xuxu、likes/comments、Comfy image_jobs 等。

---

# 11. YeYe AI → Sober 迁移映射

| YeYe 模块 | Sober 对应模块 | 迁移方式 |
|-----------|----------------|----------|
| `ai-config` / OpenAI 兼容客户端 | `brain/ai-config` | **KEEP** |
| Model Tier Registry | `brain/model-registry`（1–2 档） | **ADAPT** |
| Adult / NSFW access gate | Safety + preferences | **ADAPT** |
| Chat Orchestration (`chat-api-route`) | `brain/chat-orchestrator`（瘦身） | **ADAPT** |
| Chat Pipeline Context | `brain/pipeline-context` | **ADAPT** |
| Prompt Compiler + Pipeline Contract | `brain/prompt-compiler` + Companion 层序 | **ADAPT** |
| Runtime Context | `runtime-context` → `SoberRuntimeContext` | **KEEP**（结构）/ **ADAPT**（字段） |
| Long-Term Memory 管道 | `memory/*` | **ADAPT** |
| Relationship prompt 投影 | `relationship/*` 状态机 | **ADAPT**（升级） |
| Character State / Status emotion 组 | `emotion/*` | **ADAPT** |
| Chat Generation Jobs | `brain/jobs` | **KEEP** |
| Auth / Profiles / Preferences | `users/*` | **KEEP** |
| Chat history / conversations / messages | 同名最小表 | **KEEP**（契约） |
| Lorebook retriever | Companion knowledge 检索 | **ADAPT** |
| Rule Engine | Companion Safety 规则 | **ADAPT** |
| Roleplay post-process | Companion tone post-process | **ADAPT** |
| Billing Gateway | 后期精简计量 | **ADAPT**（后期）/ 内测 **DROP** |
| ST Dream / SillyTavern / Tavern Helper | — | **DROP**（主路径） |
| Market / Characters UGC | — | **DROP** |
| Creator 经济 | — | **DROP** |
| Xuxu / Studio / Publish | — | **DROP** |
| Visual / ComfyUI | — | **DROP**（默认） |
| Admin 大后台 | 最小配置面板 | **DROP** / 少量 **ADAPT** |
| Opening / NPC / World ST 上下文 | — | **DROP** |

**总策略**：提取 AI Runtime Core，重建 Companion Layer；数据库最小重生。

---

# 12. 开发阶段规划

## Phase 0 — Architecture

- 冻结本文档为 SSOT  
- 仓库物理分离；DROP 域永不导入  
- 目录骨架与模块边界评审  
- 新 Supabase 最小 schema 草案确认  
- 验收：架构评审通过；无业务代码要求  

## Phase 1 — Brain 迁移

- 迁入 `ai-config`、精简 model registry  
- 瘦编排 + Prompt Compiler（Companion 层序）  
- `SoberRuntimeContext` builder / projector（可先无 Voice/Avatar 实装，字段占位）  
- 文本 Chat 端到端可对话（单 Companion）  
- 验收：单路径流式回复；编排层零手写 prompt  

## Phase 2 — Memory / Relationship

- Companion Memory 类型 + 提取/检索  
- Relationship 状态机 + `relationship_states`  
- Emotion Engine 基础态（可先服务文本语气）  
- 回合后 Update Bus  
- 验收：跨会话记住偏好；阶段变化可观测并影响语气  

## Phase 3 — Voice

- Voice Session API；VAD/STT/TTS 供应商选定  
- Voice Turn → Brain Turn 适配  
- barge-in；延迟指标埋点  
- 验收：半双工对话稳定；P50 首音频 < 5s（内测环境）  

## Phase 4 — Avatar

- 2.5D 资产包 + Driver  
- Idle / Thinking / Speaking / Special  
- Emotion + Brain instruction + TTS 事件合成  
- 验收：语音会话中表情/口型与内容一致；无 LLM 旁路  

## Phase 5 — Alpha 测试

- 邀请制、年龄/NSFW 门控、安全规则种子重审  
- 遥测：延迟、情绪分布、关系阶段、记忆质量  
- 小规模用户反馈 → 回写架构修订（V1.1）  
- 验收：完整闭环「文本 + 语音 + 情绪 + 关系记忆 + Avatar」可演示  

---

# 13. Future Product Model

> 详细草案：`COMPANION_COLLECTION_DESIGN.md`  
> **不改变** Phase 0.9 Runtime Contract；Alpha 仍以单 Companion 为唯一实现范围。

## 13.1 Alpha vs Future

| | Alpha | Future |
|--|-------|--------|
| 产品验证 | 单 Companion 跑通核心陪伴体验 | 在契约不变前提下扩展为 Companion Collection |
| 用户心智 | 「一个人」 | 「我的伴侣们」——每人独立人生与关系 |
| 实现范围 | 单一种子 Companion | 多 Companion；每回合仅激活其中一个 |

## 13.2 Companion Collection（方向）

未来支持多个 Companion。每个 Companion **独立拥有**：

- Identity  
- Personality  
- Voice Profile  
- Avatar Asset Pack  
- Skills  
- Relationship（相对该用户）  
- Memory（相对该用户×该 Companion）  

**不是** YeYe 式多角色 UGC 市场，也**不在本文设计抽卡系统实现**。

切换 Companion = 切换完整资产与关系/记忆空间；禁止换皮共用记忆。

## 13.3 CompanionCard（产品层概念）

`CompanionCard` 为未来产品编目 / 展示概念，**不是** Alpha 数据库实现，**不进入** Brain Turn Input。

组成：

- companion identity  
- personality profile  
- voice profile  
- avatar asset pack  
- skill profile  
- rarity metadata  

Card → 激活 Companion 真源 → `buildSoberRuntimeContext()` → 既有 Brain 契约。

## 13.4 R / SR / SSR 设计原则

稀有度 **不得** 仅由文字世界观长度决定。

价值因素：

- Avatar 资产丰富度  
- Voice 质量  
- Personality 深度  
- Skill 能力  
- Relationship 成长潜力  

稀有度不得引入第二条 LLM / Prompt 路径。本阶段不设计抽卡、保底或扭蛋池。

## 13.5 PRODUCT UI LANGUAGE RULE

**所有用户可见 UI 默认使用中文**（页面标题、按钮、导航、设置、状态提示、错误提示）。

代码、变量、数据库字段继续使用英文。  
角色对白语言由 Companion / 用户偏好决定，不受本规则强制。

## 13.6 Runtime Contract 兼容性

未来 Collection **不破坏** 已冻结切片：

- `companionContext` — 投影**当前激活** Companion  
- `relationshipContext` — 按 `(user, companionId)` 隔离  
- `memoryContext` — 按当前 Companion 记忆空间检索  
- `avatarContext` / `voiceContext` — 绑定当前 Companion 资产与会话  

`BrainTurnInput` / `BrainTurnOutput` / Update Bus / 单 Prompt Compiler 保持不变。  
扩展 Collection 时禁止修改 Phase 0.9 契约「预埋」Card 或抽卡字段。

---

## 附录 A：关键不变式（Architecture Freeze）

1. 只有一个 Prompt Compiler。  
2. `SoberRuntimeContext` 是 Brain 输入的结构化真源投影。  
3. Brain 输出必须可解析出 text + emotion + voiceStyle + avatarInstruction。  
4. Memory / Emotion / Relationship 职责不互相吞并。  
5. Voice 与 Avatar 不得重建 Prompt。  
6. 不引入多角色市场与 Creator 经济。  
7. 不 fork YeYe 全量数据库。  

## 附录 B：与迁移报告的关系

| 文档 | 角色 |
|------|------|
| `YEYE_TO_SOBER_MIGRATION_REPORT.md` | 源系统审计与迁移候选 |
| `SOBER_AI_ARCHITECTURE_SPECIFICATION.md`（本文） | 目标系统正式架构 SSOT |

后续实现与 PR 应以本文为准；若与迁移报告冲突，先修订本文再动代码。

## 附录 C：非目标清单（再次强调）

- 多角色市场 / UGC / Creator 经济（≠ 未来受控 Companion Collection）  
- SillyTavern 双栈主路径  
- 完整 3D 数字人（Phase 1–4）  
- 以 ComfyUI 冒充实时 Avatar  
- 内测阶段完整计费与成长体系  
- Alpha 阶段的 Collection / CompanionCard / 稀有度运营 / 抽卡实现  

## 附录 D：未来产品方向索引

| 文档 | 角色 |
|------|------|
| `COMPANION_COLLECTION_DESIGN.md` | Companion Collection / Card / 稀有度 / UI 语言 / 契约兼容性 |
| 本文 §13 | Future Product Model 摘要 |

---

*End of specification. Future Product Model is documentation-only; Runtime Contract implementation was not modified.*
