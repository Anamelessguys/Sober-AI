# Brain Turn Contract

> Phase 0.9 — Runtime Contract Freeze  
> 类型实现：`src/brain/types.ts`  
> 输入 Context：`src/runtime-context/types.ts`

## 目的

冻结 **单 Brain 回合** 的输入 / 输出形状。  
编排、LLM、Parser 实现一律后置；本文件只定契约。

## 不变式

1. 每回合只走一条 Brain 路径  
2. Prompt 只由 Prompt Compiler 生成（本契约不定义 `messages[]`）  
3. 输出必须可解析为 `text + emotion + voiceStyle + avatarInstruction`  
4. Voice / Avatar / UI 不得绕过本契约自行调用 LLM  

---

## Input

```ts
type BrainTurnInput = {
  runtimeContext: SoberRuntimeContext;
  userMessage: string;
};
```

| 字段 | 说明 |
|------|------|
| `runtimeContext` | 本回合投影总线（可为部分 `null` 切片；`debugMeta` 必有） |
| `userMessage` | 用户本回合文本（语音回合为 STT 归一后的文本） |

**禁止作为 Input 直接传入：**

- 原始 market / character 行模型  
- ST Dream / Tavern 预设包  
- 手写 system prompt 字符串  

---

## Output

```ts
type BrainTurnOutput = {
  text: string;
  emotion: {
    label: string;
    valence: number;     // -1..1
    arousal: number;     // 0..1
    intensity: number;   // 0..1
    deltaReason?: string;
  };
  voiceStyle: {
    style: string;
    speakingRate?: number;
    pitchBias?: number;
    pauseMs?: number;
  };
  avatarInstruction: {
    state: "idle" | "thinking" | "speaking" | "special";
    expression: string;
    motion?: string;     // ∈ avatarContext.availableMotions
    lipsyncHint?: "normal" | "soft" | "emphatic";
    holdMs?: number;
  };
};
```

| 字段 | 消费者 |
|------|--------|
| `text` | UI / TTS 文本源 |
| `emotion` | Emotion 模块（经 Update Bus）+ 语气映射参考 |
| `voiceStyle` | Voice 表达层 |
| `avatarInstruction` | Avatar 表达层 |

Alpha MVP **不要求** Output 内嵌 `meta.relationshipHints` / `memoryCandidates`；若后续需要，经架构修订后再扩展（仍由 Update Bus 分发，不由模块互改）。

---

## 回合流（契约层）

```
userMessage + loaded slices
        │
        ▼
buildSoberRuntimeContext()
        │
        ▼
projectToCompilerInput()     # 只读
        │
        ▼
Prompt Compiler → LLM → Output Parser
        │
        ▼
BrainTurnOutput
        │
        ▼
Update Bus → Memory / Emotion / Relationship / Voice / Avatar
```

本阶段不实现 Compiler / LLM / Parser / Bus。

---

## 相关文档

- [UPDATE_BUS.md](./UPDATE_BUS.md)
- [SOBER_AI_ARCHITECTURE_SPECIFICATION.md](./SOBER_AI_ARCHITECTURE_SPECIFICATION.md) §4
- `src/runtime-context/README.md`
