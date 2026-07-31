# PROJECT_CONTEXT

> **第一阅读文件**：所有 AI Agent、新开发者进入本仓库时先读本文。  
> 配套：`DEVELOPMENT_STATUS.md` · `DECISION_LOG.md` · `SOBER_AI_ARCHITECTURE_SPECIFICATION.md`

---

## Project Identity

**Sober AI = AI Companion Runtime。**

以单一（Alpha）固定伴侣为核心，提供可演进的陪伴运行时：文本/语音回合、情绪与关系、长期记忆、Voice 与 Avatar 表达。

### 明确不是

- YeYe AI 多角色平台  
- UGC 角色市场  
- Tavern / SillyTavern 双栈系统  
- Creator 经济平台  

YeYe AI 仅作 **AI Runtime Core 架构参考**；禁止全量复制或迁移业务壳。

---

## Core Concept

| 模块 | 职责摘要 |
|------|----------|
| **Brain** | 唯一认知路径：编排、Prompt Compiler、LLM、Output Parser |
| **Memory** | 事实记忆存取与检索 |
| **Relationship** | 关系阶段与亲密度状态机 |
| **Emotion** | 瞬时情绪真源与衰减 |
| **Voice** | 语音会话与 TTS 表达层（不调 LLM） |
| **Avatar** | 2.5D 视觉表达层（不调 LLM） |

回合投影总线：`src/runtime-context/` → `SoberRuntimeContext`。

---

## Product Strategy

| 阶段 | 策略 |
|------|------|
| **Alpha** | Single Companion MVP — 验证沉浸与核心闭环 |
| **Future** | Companion Collection — 多 Companion，各自独立 Identity / Voice / Avatar / Skills / Relationship / Memory |

详见：[`COMPANION_COLLECTION_DESIGN.md`](./COMPANION_COLLECTION_DESIGN.md)

稀有度（R/SR/SSR）仅为未来产品叙事原则；**不做抽卡实现**，且不得破坏 Runtime Contract。

---

## Architecture Rules

1. **Runtime Context** 是 Brain 输入的唯一结构化来源（经 builder / projectors；禁止旁路拼 prompt）。  
2. **Single Brain Path** — 无平行 LLM 决策栈。  
3. **Single Prompt Compiler** — 唯一 `messages[]` 构建点。  
4. **Voice / Avatar 不调用 LLM** — 只消费 Brain 结构化输出。  
5. **Memory / Emotion / Relationship 不互相直接修改** — 经 Update Bus 分发；各模块单写自己的真源。

仓库级摘要：根目录 [`ARCHITECTURE.md`](../ARCHITECTURE.md)。

---

## Current Phase

**Phase 0.9 — Runtime Contract Freeze：已完成。**

### 已完成

- Architecture Specification  
- Runtime Context Contract（SSOT：`src/runtime-context/`）  
- Brain Turn Contract  
- Update Bus 设计  
- Companion Collection Future Model（文档）  
- 项目上下文文档体系（本文等）  

### 未开始

- Brain Core Migration（从 YeYe 提取可复用 Runtime）  
- LLM Integration  
- Voice 实现  
- Avatar Implementation  

状态机详情：[`DEVELOPMENT_STATUS.md`](./DEVELOPMENT_STATUS.md)

---

## Development Rules

### 修改代码前必须阅读

1. `docs/PROJECT_CONTEXT.md`（本文）  
2. `docs/DEVELOPMENT_STATUS.md`  
3. `docs/SOBER_AI_ARCHITECTURE_SPECIFICATION.md`  

并遵守根目录 `ARCHITECTURE.md` 与 `AGENTS.md`。

### 禁止

- 全量复制 YeYe AI  
- 引入 Market / Creator / Tavern 架构  
- 绕过 Runtime Context 直接拼 prompt 或旁路调用 LLM  
- 未获架构修订批准即修改 Runtime Contract（`SoberRuntimeContext` / Brain Turn / Update Bus）  
- 在 Alpha 阶段实现 Collection / 抽卡 / UGC 市场  

### 产品 UI 语言

用户可见 UI 默认**中文**；代码、变量、数据库字段使用**英文**。

---

## Documentation Map

| 文件 | 用途 |
|------|------|
| `PROJECT_CONTEXT.md` | 项目身份与 Agent 入场（本文） |
| `DEVELOPMENT_STATUS.md` | 当前 Phase / 里程碑 |
| `DECISION_LOG.md` | 关键架构决策 |
| `SOBER_AI_ARCHITECTURE_SPECIFICATION.md` | 架构 SSOT |
| `YEYE_TO_SOBER_MIGRATION_REPORT.md` | YeYe 迁移审计 |
| `BRAIN_TURN_CONTRACT.md` | Brain 回合契约 |
| `UPDATE_BUS.md` | 回合后更新总线 |
| `COMPANION_COLLECTION_DESIGN.md` | 未来 Collection 设计 |
| `../ARCHITECTURE.md` | 仓库级架构摘要 |
