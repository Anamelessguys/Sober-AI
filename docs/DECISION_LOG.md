# DECISION_LOG

> 关键架构与产品决策记录。新决策追加在文末，不改写历史条目（必要时用 supersede 注明）。  
> 格式：编号 · 日期 · Decision · Reason

---

## Decision 001

**Date:** 2026-08-01  

**Decision:** Sober AI does not copy YeYe full architecture.  

**Reason:** YeYe is an RP / multi-character platform. Sober is an AI Companion product. Extract Runtime Core only; rebuild Companion Layer. Never import Market / Creator / Tavern as the main path.

---

## Decision 002

**Date:** 2026-08-01  

**Decision:** Alpha uses Single Companion.  

**Reason:** Validate immersion and the core Brain · Memory · Relationship · Emotion · Voice · Avatar loop before scaling to Collection.

---

## Decision 003

**Date:** 2026-08-01  

**Decision:** Runtime Context is SSOT (`src/runtime-context/`).  

**Reason:** Future Brain / Voice / Avatar expansion requires a stable turn-scoped contract. Brain consumes structured Context only; no bypass prompt assembly.

---

## Decision 004

**Date:** 2026-08-01  

**Decision:** Avatar first version uses a 2.5D approach.  

**Reason:** Avoid full real-time 3D complexity for Alpha; prefer prefab motions, expression, and lipsync driven by Brain instructions.

---

## Decision 005

**Date:** 2026-08-01  

**Decision:** UI language default is Chinese.  

**Reason:** Target user experience consistency. User-visible copy (titles, buttons, nav, settings, status, errors) defaults to Chinese; code identifiers and database fields remain English.

---

## Decision 006

**Date:** 2026-08-01  

**Decision:** Future Companion Collection must not break Runtime Contract.  

**Reason:** Multi-companion is a product-layer activation of the same `companionContext` / relationship / memory / voice / avatar slices for the *active* companion. No second Brain path; no gacha design in Alpha.

---

## Related

- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md)  
- [`COMPANION_COLLECTION_DESIGN.md`](./COMPANION_COLLECTION_DESIGN.md)  
- [`SOBER_AI_ARCHITECTURE_SPECIFICATION.md`](./SOBER_AI_ARCHITECTURE_SPECIFICATION.md)  
