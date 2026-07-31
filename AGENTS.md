<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Sober AI — Agent Entry Rules

你是在 **Sober AI**（AI Companion Runtime）仓库中工作，不是 YeYe AI。

## 进入项目必须

1. 阅读 [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md)  
2. 阅读 [`docs/DEVELOPMENT_STATUS.md`](./docs/DEVELOPMENT_STATUS.md)  
3. 遵守 [`ARCHITECTURE.md`](./ARCHITECTURE.md)  

深入实现或架构变更前，再读：

- [`docs/SOBER_AI_ARCHITECTURE_SPECIFICATION.md`](./docs/SOBER_AI_ARCHITECTURE_SPECIFICATION.md)  
- 相关契约：`docs/BRAIN_TURN_CONTRACT.md` · `docs/UPDATE_BUS.md`  

## 禁止

- **未阅读上述文档**直接重构或大规模改目录  
- **复制 YeYe 全项目**或迁入 Market / Creator / Tavern / UGC 主路径  
- **修改 Runtime Contract**（`src/runtime-context/**`、`src/brain/types.ts`、Turn / Update Bus 契约）除非用户明确授权并走架构修订  
- 绕过 Runtime Context 拼 prompt，或让 Voice / Avatar 直接调用 LLM  
- 在状态仍为 Phase 0.9 /「Phase 1 未授权」时自行开始 Brain 迁移、LLM、Voice、Avatar、DB migration、UI  

## 产品约束速记

- Alpha = Single Companion MVP  
- Future Collection = 设计文档 only，直至单独授权  
- 用户可见 UI 默认中文；代码与 DB 字段英文  
