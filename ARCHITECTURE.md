# Sober AI Architecture

Sober AI 是 **AI Companion Runtime**。本文件定义项目级设计原则与已冻结契约。

**Phase**：0.9 — Runtime Contract Freeze  
**SSOT 文档**：`docs/SOBER_AI_ARCHITECTURE_SPECIFICATION.md`

---

## 设计原则

### 1. Single Brain Path

所有认知决策只走一条 Brain 路径。

- 不存在平行的“旁路 LLM 决策”
- Voice / Avatar / UI 不得自行调用 LLM 做语义决策
- 编排入口统一在 `brain/orchestrator`

### 2. Runtime Context as Source of Truth（SSOT）

运行时投影总线唯一落在：

```text
src/runtime-context/
├── types.ts       # SoberRuntimeContext V2
├── builder.ts     # buildSoberRuntimeContext
└── projectors/    # 只读投影 → Compiler
```

- Companion / User / Relationship / Memory / Emotion / Voice / Avatar 的**回合视图**汇聚为 `SoberRuntimeContext`
- 各 Context 切片可为 `null`；`debugMeta` 始终存在
- 禁止在 `src/lib/runtime-context` 或其他路径维护第二套 Context 类型
- 禁止跨模块直接读写对方内部私有状态

### 3. Single Prompt Compiler

提示词只由唯一的 Prompt Compiler 生成。

- 入口：`brain/prompt-compiler`
- 禁止各业务模块自行拼接 system/user prompt 并直接送 LLM
- Compiler 消费 Runtime Context（经 projectors），产出结构化 `messages[]`

### 4. Memory / Emotion / Relationship 职责分离

| 模块 | 负责 | 不负责 |
|------|------|--------|
| Memory | 记忆存取、检索、摘要写入 | 情绪推断、关系等级计算 |
| Emotion | 情绪状态建模与更新 | 长期事实记忆、关系策略 |
| Relationship | 关系阶段、亲密度、边界 | 逐条记忆存储、瞬时情绪渲染 |

### 5. Voice and Avatar 不直接调用 LLM

Voice 与 Avatar 是**表达层**，不是决策层。

- 输入来自 Brain 结构化输出（及 Context 中的 voice/avatar 切片）
- 不得绕过 Brain 发起对话理解或内容生成

---

## Brain Turn Contract

类型：`src/brain/types.ts`  
说明：`docs/BRAIN_TURN_CONTRACT.md`

**Input**

- `runtimeContext: SoberRuntimeContext`
- `userMessage: string`

**Output**

- `text`
- `emotion`
- `voiceStyle`
- `avatarInstruction`

---

## Update Bus

说明：`docs/UPDATE_BUS.md`

Brain 输出后，由 Update Bus 分发至 Memory / Emotion / Relationship / Voice / Avatar。  
**禁止模块互相直接修改状态。**

---

## 模块边界

| 模块 | 路径 | 边界 |
|------|------|------|
| Runtime Context | `src/runtime-context/` | 投影总线；不写 prompt；不调 LLM |
| Brain | `src/brain/` | 唯一认知路径；产出 Turn Output |
| Memory | `src/memory/` | 事实记忆真源 |
| Emotion | `src/emotion/` | 情绪真源 |
| Relationship | `src/relationship/` | 关系状态机真源 |
| Voice | `src/voice/` | 语音会话与 TTS；消费 `voiceStyle` |
| Avatar | `src/avatar/` | 2.5D 表现；消费 `avatarInstruction` |
| Companion | `src/companion/` | 单核心身份与知识 |
| Users | `src/users/` | 认证 / 画像 / 偏好 |

**明确不做（Alpha）**：多角色 UGC 市场、Creator 平台、Tavern / ST Dream 主路径、抽卡实现。

---

## 未来产品方向（设计 only）

详见：`docs/COMPANION_COLLECTION_DESIGN.md`、规范 §13。

| 项 | 摘要 |
|----|------|
| Alpha | 单 Companion 验证核心体验 |
| Future | Companion Collection；每 Companion 独立 Identity / Personality / Voice / Avatar / Skills / Relationship / Memory |
| CompanionCard | 产品层编目概念（非 Alpha DB） |
| R/SR/SSR | 由 Avatar / Voice / Personality / Skill / Relationship 潜力综合决定，非文案长度 |
| Runtime | Collection 只切换「当前 Companion」数据源，**不改** Context / Brain Turn / Update Bus 契约 |

### PRODUCT UI LANGUAGE RULE

所有用户可见 UI 默认使用**中文**（标题、按钮、导航、设置、状态与错误提示）。  
代码、变量、数据库字段继续使用英文。

---

## 控制流

```
User Input
    │
    ▼
buildSoberRuntimeContext()   ← Memory / Emotion / Relationship / Companion / User / Voice / Avatar
    │
    ▼
projectToCompilerInput()
    │
    ▼
Brain Orchestrator
    ├── Prompt Compiler
    ├── LLM
    └── Output Parser
    │
    ▼
BrainTurnOutput
    │
    ▼
Update Bus ──► Memory / Emotion / Relationship / Voice / Avatar
```

---

## 本阶段边界（Phase 0.9 + 未来方向文档）

已冻结：Runtime Contract + 架构文档；已补充 Future Product Model（仅文档）。

**仍禁止：**

- 数据库 migration
- API 开发
- UI 开发
- YeYe 业务代码复制 / 迁移
- LLM / Voice / Avatar 实际接入
- 修改 Runtime Contract 实现以「预埋」Collection / 抽卡
- 进入 Phase 1 实现
