# Sober AI

**AI Companion Runtime**

Sober AI 是以单一固定伴侣为核心的 AI 陪伴运行时，不是聊天机器人壳子，也不是角色平台。

## 定位

构建一条清晰、可演进的 Companion Runtime：

- 单脑决策（Single Brain Path）
- Runtime Context 作为运行时真相源
- Memory / Emotion / Relationship 职责分离
- Voice 与 Avatar 作为表达层，不直接调用 LLM

## 核心模块

| 模块 | 职责 |
|------|------|
| **Brain** | 唯一认知与决策入口：编排、提示编译、输出解析 |
| **Memory** | 记忆检索与写入，不负责情感或关系推断 |
| **Relationship** | 关系状态与亲密度演进 |
| **Emotion** | 情绪状态建模与更新 |
| **Voice** | 语音表达层（TTS / 口型等），消费 Brain 输出 |
| **Avatar** | 视觉表达层（表情 / 微动作），消费 Brain 输出 |

## 明确不是

本项目**不是**：

- 多角色市场
- Creator 平台
- UGC 系统
- Tavern 系统

## 技术栈

- Next.js (App Router)
- TypeScript
- React
- Tailwind CSS
- Supabase
- Vercel 兼容部署

## 开发

```bash
npm install
npm run dev
```

**产品 UI 语言**：用户可见文案默认中文；代码与数据库字段保持英文。

---

## Documentation Index

### 必读（入场）

| | 文档 | 用途 |
|---|------|------|
| ⭐ | [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md) | 项目身份 · Agent / 新人第一阅读 |
| ⭐ | [`docs/DEVELOPMENT_STATUS.md`](./docs/DEVELOPMENT_STATUS.md) | 当前 Phase · 里程碑 |
| ⭐ | [`docs/DECISION_LOG.md`](./docs/DECISION_LOG.md) | 关键架构决策 |

### 架构与契约

| 文档 | 用途 |
|------|------|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | 仓库级架构摘要与模块边界 |
| [`docs/SOBER_AI_ARCHITECTURE_SPECIFICATION.md`](./docs/SOBER_AI_ARCHITECTURE_SPECIFICATION.md) | 架构 SSOT |
| [`docs/YEYE_TO_SOBER_MIGRATION_REPORT.md`](./docs/YEYE_TO_SOBER_MIGRATION_REPORT.md) | YeYe 迁移审计 |
| [`docs/BRAIN_TURN_CONTRACT.md`](./docs/BRAIN_TURN_CONTRACT.md) | Brain 回合契约 |
| [`docs/UPDATE_BUS.md`](./docs/UPDATE_BUS.md) | 回合后更新总线 |
| [`docs/COMPANION_COLLECTION_DESIGN.md`](./docs/COMPANION_COLLECTION_DESIGN.md) | 未来 Companion Collection（设计） |

### 代码边界说明

- Runtime Context SSOT：`src/runtime-context/`
- 各模块 README：`src/<module>/README.md`
- Agent 规则：[`AGENTS.md`](./AGENTS.md)
