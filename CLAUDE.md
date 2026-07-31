@AGENTS.md

# Sober AI — Claude / Agent 入场规则

你在 **Sober AI**（AI Companion Runtime）仓库中工作，不是 YeYe AI。

## 1. 开始工作前必须阅读

1. [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md)  
2. [`docs/DEVELOPMENT_STATUS.md`](./docs/DEVELOPMENT_STATUS.md)  
3. [`docs/SOBER_AI_ARCHITECTURE_SPECIFICATION.md`](./docs/SOBER_AI_ARCHITECTURE_SPECIFICATION.md)  

并遵守根目录 [`ARCHITECTURE.md`](./ARCHITECTURE.md)。

## 2. 必须遵守

- **Runtime Context 是 SSOT**（`src/runtime-context/`；Brain 输入的唯一结构化来源）  
- **Single Brain Path**（无平行 LLM 决策栈）  
- **Single Prompt Compiler**（唯一 `messages[]` 构建点）  
- **Voice / Avatar 不调用 LLM**（只消费 Brain 结构化输出）  
- **Memory / Emotion / Relationship 不互相直接修改**（经 Update Bus 分发）  

## 3. 禁止

- 全量复制 YeYe AI  
- 引入 Market / Creator / Tavern 架构  
- 未经确认修改 Architecture Contract（Runtime Context / Brain Turn / Update Bus）  
- 绕过 Runtime Context 拼 prompt  
- 在未获授权时自行进入 Phase 1 实现（LLM / Voice / Avatar / DB migration / UI）  

## 产品速记

- Alpha = Single Companion MVP  
- Future Companion Collection = 设计文档 only，直至单独授权  
- 用户可见 UI 默认中文；代码与数据库字段英文  
