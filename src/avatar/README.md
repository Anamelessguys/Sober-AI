# Avatar

视觉表达层。

## 职责

- 消费 Brain 结构化输出中的视觉 / 动作指令
- 驱动表情、待机与微动作等 Avatar 表现
- 维护并更新 `avatarContext`

## 边界

- **不直接调用 LLM**
- 不做语义决策或内容生成
- 不绕过 Brain 理解用户输入
