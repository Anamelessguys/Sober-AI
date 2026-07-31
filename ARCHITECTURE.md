# Sober AI Architecture

Sober AI 是 **AI Companion Runtime**。本文件定义项目级设计原则与模块边界。

## 设计原则

### 1. Single Brain Path

所有认知决策只走一条 Brain 路径。

- 不存在平行的“旁路 LLM 决策”
- Voice / Avatar / UI 不得自行调用 LLM 做语义决策
- 编排入口统一在 `brain/orchestrator`

### 2. Runtime Context as Source of Truth

运行时真相源是 `SoberRuntimeContext`，不是散落在各模块内部的临时状态。

- Companion / User / Relationship / Memory / Emotion / Voice / Avatar 的运行时视图汇聚于此
- Brain 读取 Context 做决策；模块写回各自切片
- 禁止跨模块直接读写对方内部私有状态

### 3. Single Prompt Compiler

提示词只由唯一的 Prompt Compiler 生成。

- 入口：`brain/prompt-compiler`
- 禁止各业务模块自行拼接 system/user prompt 并直接送 LLM
- Compiler 消费 Runtime Context，产出结构化 prompt

### 4. Memory / Emotion / Relationship 职责分离

三者协作，但边界清晰：

| 模块 | 负责 | 不负责 |
|------|------|--------|
| Memory | 记忆存取、检索、摘要写入 | 情绪推断、关系等级计算 |
| Emotion | 情绪状态建模与更新 | 长期事实记忆、关系策略 |
| Relationship | 关系阶段、亲密度、边界 | 逐条记忆存储、瞬时情绪渲染 |

### 5. Voice and Avatar 不直接调用 LLM

Voice 与 Avatar 是**表达层**，不是决策层。

- 输入来自 Brain 结构化输出（及 Runtime Context 中的 voice/avatar 切片）
- 可调用 TTS、动画、口型等外部能力
- 不得绕过 Brain 发起对话理解或内容生成

## 模块地图

```
User Input
    │
    ▼
Runtime Context  ◄──── Memory / Emotion / Relationship / Companion / User
    │
    ▼
Brain Orchestrator
    ├── Prompt Compiler
    ├── LLM
    └── Output Parser
    │
    ▼
Structured Brain Output
    ├──► Voice（表达）
    └──► Avatar（表达）
```

## 本阶段边界

当前仅建立项目骨架与类型占位。

**禁止（本阶段）：**

- 数据库 migration
- API 开发
- UI 开发
- YeYe 业务代码复制 / 迁移
- LLM / Voice / Avatar 实际接入
