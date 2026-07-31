# Companion

伴侣身份与静态画像模块。

## 职责

- 定义单一固定伴侣的身份、人设与稳定属性
- 向 `companionContext` 提供运行时伴侣切片
- 作为 Runtime Context 的伴侣侧输入源之一

## 边界

- 不是多角色市场或角色卡仓库
- 不负责任务编排（编排在 Brain）
- 不直接调用 LLM
