# Runtime Context

Sober AI 的核心领域模块：**运行时投影总线（SSOT）**。

路径：`src/runtime-context/`（唯一权威位置；勿在 `src/lib/runtime-context` 另建副本）。

## 职责

- 定义 `SoberRuntimeContext` V2 类型契约
- 从各领域模块装载的切片 **组装** Context（`builder.ts`）
- 向 Prompt Compiler 提供 **只读投影**（`projectors/`）

## 布局

```text
runtime-context/
├── types.ts          # SoberRuntimeContext V2 + Alpha MVP 字段
├── builder.ts        # buildSoberRuntimeContext（契约桩）
├── projectors/       # 只读投影，不写 messages[]
└── README.md
```

## 不变式

1. Brain 只消费 Context（及 userMessage），不直接扫各模块私有存储拼 prompt
2. 新能力必须先写入 Context 字段，再经 Projector → Compiler
3. Context 切片可为 `null`；`debugMeta` 始终存在
4. 禁止 ST / opening / NPC / world 等 YeYe 双路径字段

## 非职责

- 不是 Prompt Compiler
- 不是 Memory / Emotion / Relationship 的持久化真源
- 不调用 LLM、Voice、Avatar 供应商
