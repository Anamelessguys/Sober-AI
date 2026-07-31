# Brain

Sober AI 的唯一认知与决策入口。

## 职责

- 编排一轮 Companion 响应（orchestrator）
- 编译提示词（prompt-compiler）
- 调用 LLM（llm）
- 解析结构化输出（output-parser）

## 子目录

| 目录 | 职责 |
|------|------|
| `orchestrator/` | 单脑路径编排入口 |
| `prompt-compiler/` | 唯一 Prompt Compiler，消费 Runtime Context |
| `llm/` | LLM 适配层 |
| `output-parser/` | Brain 输出结构化解析 |

## 契约

- 回合类型：`types.ts`（`BrainTurnInput` / `BrainTurnOutput`）
- 设计文档：`docs/BRAIN_TURN_CONTRACT.md`
- Context SSOT：`src/runtime-context/`

## 边界

- 不直接持有长期记忆存储
- 不直接驱动 TTS / Avatar 渲染实现
- 不存在第二条平行决策路径
