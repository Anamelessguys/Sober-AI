# Update Bus

> Phase 0.9 — Runtime Contract Freeze  
> 配合：[BRAIN_TURN_CONTRACT.md](./BRAIN_TURN_CONTRACT.md)

## 目的

定义 Brain 产出 `BrainTurnOutput` 之后，各领域模块如何接收更新。

**核心纪律：模块之间禁止互相直接修改状态。**

所有回合后写回只通过 Update Bus（逻辑总线）分发；各模块只消费自己订阅的载荷，只写入自己的真源。

---

## 原则

1. **Brain 不写库**：Orchestrator / Parser 产出结构化输出，不直接 `UPDATE emotion` 进别的模块私有 API 乱调  
2. **Bus 只分发**：按字段切片投递；不合并职责  
3. **单写者**：每个真源只有一个写入模块  
4. **Context 是投影**：下一回合的 `SoberRuntimeContext` 由各真源再投影，不在 Bus 里互相改 Context 对象当持久化  
5. **Voice / Avatar 不调 LLM**：只消费指令与事件  

---

## 分发矩阵

| 输出切片 | 接收模块 | 模块行为 | 禁止 |
|----------|----------|----------|------|
| `text` | （会话/消息持久化，属 Backend） | 存 assistant message | Memory/Emotion 不因文本自行改关系 |
| `emotion` | **Emotion** | 更新情绪真源（label / valence / arousal / intensity）；启动衰减时钟 | 不写 memories；不改 relationship metrics |
| `voiceStyle` | **Voice** | 映射到本回合 TTS 参数 / 韵律 | 不改 Emotion 真源；不拼 prompt |
| `avatarInstruction` | **Avatar** | 驱动 state / expression / motion（校验白名单） | 不调 LLM；不改 Relationship |
| （可选扩展）记忆候选 | **Memory** | 去重、入库 Companion Memory | 不推断情绪；不算亲密度 |
| （可选扩展）关系 hints | **Relationship** | 按状态机规则缓慢更新 metrics / stage | 不写逐条记忆；不直接驱动 Avatar |

Alpha MVP：Bus **必须**分发 `emotion` / `voiceStyle` / `avatarInstruction`（及消息 `text`）。  
记忆候选与关系 hints 可后置；未冻结进 `BrainTurnOutput` 前，禁止模块从 `text` 里私自正则「猜」关系。

---

## 目标流

```
BrainTurnOutput
      │
      ├─► Message Store     ← text
      ├─► Emotion Engine    ← emotion
      ├─► Voice Runtime     ← voiceStyle (+ session 事件)
      ├─► Avatar Driver     ← avatarInstruction (+ emotion/voice 播放事件可合成)
      ├─► Memory Pipeline   ← memoryCandidates（若启用）
      └─► Relationship SM   ← relationshipHints（若启用）
```

合成规则（Avatar）：

- Avatar **主指令**来自 `avatarInstruction`  
- 可叠加 Emotion / Voice 播放事件做表情/口型微调  
- **不得**向 Emotion / Relationship 回写  

---

## 禁止的反模式

| 反模式 | 原因 |
|--------|------|
| Voice 调用 Emotion 私有 `setState` | 跨模块直改 |
| Avatar 根据文本自行「理解情绪」再改 Emotion | 旁路 Brain / 双写 |
| Memory 提取器直接改 `affection` | 职责吞并 |
| Relationship 直接发 TTS | 表达层越权 |
| 模块 A `import` 模块 B 的 store 并 mutate | 破坏单写者 |

正确方式：A 产出事件/候选 → Bus → B 自己的 apply 函数。

---

## 与 Runtime Context 的关系

```
各模块真源  --load-->  builder  -->  SoberRuntimeContext  -->  Brain
                                      ▲
BrainTurnOutput --Bus--> 各模块真源 ──┘（下一回合）
```

Bus 更新的是**模块真源**，不是让模块互相改对方的 Context 切片。

---

## 本阶段状态

- 仅设计冻结  
- 无 API、无 DB、无实现类  
- 实现落位建议（未来）：`src/brain/orchestrator` 在 parse 成功后调用 bus；各 `apply*` 留在对应模块目录  

---

## 相关文档

- [BRAIN_TURN_CONTRACT.md](./BRAIN_TURN_CONTRACT.md)
- [SOBER_AI_ARCHITECTURE_SPECIFICATION.md](./SOBER_AI_ARCHITECTURE_SPECIFICATION.md)
- `ARCHITECTURE.md`（仓库根）
