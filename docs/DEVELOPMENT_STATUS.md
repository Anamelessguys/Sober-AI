# DEVELOPMENT_STATUS

> 当前开发状态看板。Agent / 开发者开工前与本文对齐。  
> 最后更新：2026-08-01

---

## Current Phase

**Phase 0.9 complete → Phase 1 is NEXT (not started).**

| Phase | Name | Status |
|-------|------|--------|
| Phase 0 | Architecture Foundation | **DONE** |
| Phase 0.9 | Runtime Contract Freeze | **DONE** |
| Phase 1 | Brain Core Extraction | **NEXT** |

---

## Completed

### Phase 0 — Architecture Foundation

- YeYe → Sober 迁移审计（`YEYE_TO_SOBER_MIGRATION_REPORT.md`）  
- Sober Architecture Specification（`SOBER_AI_ARCHITECTURE_SPECIFICATION.md`）  
- 仓库脚手架与模块边界（`src/brain` · `memory` · `relationship` · `emotion` · `voice` · `avatar` · `companion` 等）  
- 根 `ARCHITECTURE.md` / `README.md` 定位  

### Phase 0.9 — Runtime Contract Freeze

- `SoberRuntimeContext` V2 SSOT（`src/runtime-context/`）  
- Brain Turn Contract（`BRAIN_TURN_CONTRACT.md` · `src/brain/types.ts`）  
- Update Bus 设计（`UPDATE_BUS.md`）  
- Companion Collection Future Model（`COMPANION_COLLECTION_DESIGN.md` · Spec §13）  
- 项目上下文文档（`PROJECT_CONTEXT.md` · 本文 · `DECISION_LOG.md`）  

---

## In Progress

_无。_

---

## Not Started

- Phase 1：从 YeYe 提取可复用 AI Runtime → Sober Brain  
- LLM Integration  
- Prompt Compiler Companion 层序实现  
- Memory / Relationship / Emotion 实现与 Update Bus 实现  
- Voice Session / STT / TTS  
- Avatar 2.5D Driver  
- API / UI / 数据库 migration  
- Companion Collection 产品实现  

---

## Next Milestone

**Extract reusable AI Runtime from YeYe into Sober Brain.**

范围原则（提醒，非本文件授权开工）：

- 提取 Runtime Core（LLM 客户端纪律、Pipeline 模式、单 Compiler、Context、Jobs、Auth 概念）  
- **重建** Companion Layer；不复制 Market / Creator / Tavern  
- 不破坏已冻结 Runtime Contract  
- 开工前必须再读 `PROJECT_CONTEXT.md` 与 Architecture Spec  

正式进入 Phase 1 前，需有明确指令；**当前禁止自行开始实现。**

---

## Related

- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md)  
- [`DECISION_LOG.md`](./DECISION_LOG.md)  
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md)  
