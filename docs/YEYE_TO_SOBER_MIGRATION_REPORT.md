# YeYe AI → Sober AI 迁移评估报告

> **审计角色**：软件架构审计工程师  
> **审计范围**：`g:\yeyeai\yeyeai`（YeYe AI 主应用）  
> **约束**：本报告阶段只读分析；不修改业务代码、不做重构、不提交。  
> **目标产品**：Sober AI（单核心 Companion Runtime）  
> **审计日期**：2026-08-01

---

# 1. 项目整体架构分析

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 / 全栈框架 | Next.js 16（App Router）、React 19、TypeScript 5 |
| UI | Tailwind CSS 4、Radix UI、lucide-react、react-hook-form + zod |
| AI SDK | Vercel AI SDK (`ai` v6)、`@ai-sdk/openai`、`@ai-sdk/react` |
| LLM 网关 | OpenAI 兼容 API（默认 OpenRouter；可切 SiliconFlow 等） |
| 后端形态 | Next.js Route Handlers（`src/app/api/**`），无独立 Nest/Express 服务 |
| 数据库 / 认证 | Supabase（Postgres + Auth + RLS + Storage） |
| 图像 | ComfyUI（本地/服务端工作流队列） |
| 测试 | Vitest |
| 内部包 | `@xuxuai/character-schema`、`@xuxuai/character-import`（角色卡导入） |

**产品本质**：YeYe AI 是「多角色 UGC 角色扮演平台」——市场、创作者、角色工作室、SillyTavern 预设兼容、计费与成长体系齐全。Sober AI 目标是「单核心 Companion」，二者产品面差异大于技术栈差异。

---

## 前端架构

```
src/app/          → App Router 页面（chat / market / studio / creator / xuxu / admin…）
src/components/   → UI 组件（chat、market、studio、admin、billing…）
src/contexts/     → 会话、偏好、侧栏、移动聊天布局
src/hooks/        → 客户端钩子（含 conversation status 等）
src/stores/       → 轻量 store（主要为 visual/image generation）
src/lib/          → 几乎全部领域逻辑（前端也会 import）
```

**模块职责（前端侧）**：

- **Chat UI**（`src/app/chat`、`src/components/chat`）：多会话聊天、流式输出、状态栏、剧情选项、背景图、rewinds。
- **发现 / 市场**（`market`、`home`、`favorites`、`search`）：多角色发现与互动（点赞/评论/收藏）。
- **创作侧**（`studio`、`characters/create`、`xuxu`、`creator`）：角色资产起草、导入、发布审核。
- **用户侧**（`me`、`settings`、`billing`、`personas`）：画像、Persona、积分、偏好（含 NSFW 展示开关）。
- **Admin**：模型预设、ST Dream、Prompt Control、计费、发布审核、AI 角色生成器。

状态管理偏「Context + 服务端真相（Supabase）」，不是重型全局 Redux。聊天历史以 `messages` 表为权威源。

---

## 后端架构

后端即 **Next.js API Routes + `src/lib` 领域层**：

| 层 | 路径 | 职责 |
|----|------|------|
| HTTP 入口 | `src/app/api/chat/**` 等 | 鉴权、参数校验、调用 lib |
| 编排层 | `src/lib/chat-api-route.ts` | Chat Pipeline 编排（禁止构造 prompt） |
| Prompt 编译 | `src/lib/prompt-compiler.ts` | **唯一授权**的 `messages[]` 构建 |
| Runtime 上下文 | `src/lib/runtime-context/**` | 结构化 RuntimeContext + projector |
| 模型层 | `src/lib/ai-config.ts`、`src/lib/model-tier/**` | Provider 客户端、Tier、Runtime Preset |
| 记忆 | `src/lib/long-term-memory/**` | 提取 / 检索 / 注入 |
| 状态 | `src/lib/character-state*`、`src/lib/character-status/**` | 动态状态 + Status Schema v2 |
| 计费 | `src/lib/billing/**` | reserve / commit / refund 网关 |
| 耐久任务 | `src/lib/chat-generation-jobs/**`、`image-queue` | 聊天/图像 job |

存在 **双 Runtime 路径**：

1. **Normal**：`prompt-compiler` → `streamText`
2. **ST Dream**：`resolveStRuntime` → `handleStDreamChatPost`（SillyTavern 预设顺序组装）

---

## 数据库架构

Supabase Postgres，约 50+ 业务表，RLS 普遍开启。核心域分组：

| 域 | 代表表 |
|----|--------|
| 用户 | `profiles`、`user_app_preferences`（经 migration）、`user_growth_*` |
| 角色 UGC | `characters`、`lorebooks`、`character_tags`、`character_cards`、`user_cards` |
| 聊天 | `conversations`、`messages`、`chat_runtime_settings`、`chat_generation_jobs` |
| Runtime 状态 | `character_states`、status snapshot（存于状态/消息元数据链路） |
| 记忆 | `long_term_memories` |
| Prompt 控制 | `system_rules`、`author_notes`、`prompt_presets`、`st_presets`、`st_runtime_global_settings` |
| 计费 | `user_wallets`、`credit_ledger`、`credit_holds`、`pricing_configs`、`credit_packages`… |
| 创作者经济 | `creators`、`character_creators`、`creator_earnings`、`creator_applications`… |
| 资产流水线 | `xuxu_*`、`character_asset_versions`、`character_publish_*`、`generation_*` |
| 视觉 | `image_jobs`、`image_generation_logs` |

认证走 Supabase Auth；业务用户扩展在 `profiles`。

---

## AI 调用流程

```
OPENAI_API_KEY + OPENAI_BASE_URL
        ↓
createChatOpenAIClient()          (ai-config.ts)
        ↓
model-tier 解析（quick|flow|soul|dream|myth → providerModel）
        ↓
streamText / generateText         (Vercel AI SDK)
        ↓
onFinish：polish → sanitize → expand → persist → billing settle → memory extract
```

要点：

- Provider 切换靠 **OpenAI 兼容 baseURL + 模型 ID**，不是多 SDK 抽象。
- SiliconFlow 特定模型会注入 `enable_thinking: false`。
- Token / 用量：`chat-token-usage-debug` 记录；计费走 `billing-gateway`（off / shadow / active）。
- 错误：`streamText.onError` 触发 billing refund；用户侧错误文案经 `formatChatStreamErrorForUser`。

---

## Chat Pipeline 流程

官方契约（`chat-api-route.ts` 注释 + `docs/architecture.md`）：

```
用户请求
  → resolveChatPipelineFromRequest()     # 鉴权、角色、历史、状态、lorebook、persona
  → loadValidatedChatRuntimeSettings()   # 模型档位、记忆开关、回复长度等
  → resolveStRuntime()                   # normal | st_dream 分发
  → [optional] prepareLongTermMemoryPrompt()
  → preset / rule-engine（输入侧）
  → buildChatMessagesFromPipeline()      # → prompt-compiler
  → injectRuntimeSettings / RuntimePreset / adult gates
  → streamText()
  → post-process（polish、expand、status sync、state merge）
  → persist messages + billing + LTM extract
```

并行耐久路径：`chat_generation_jobs` + `execute-regular-turn`（非流式 `generateText`，浏览器断开不取消生成）。

---

## Runtime Context 流程

```
ChatPipelineRawData
  → fromChatPipelineContext()     # runtime-context-builder
  → RuntimeContext {
        characterContext,
        userContext,
        relationshipContext,
        dynamicStateContext,
        memoryContext,
        lorebookContext,
        openingContext,
        stRuntimeContext,
        worldContext?,
        npcContext?,
        debugMeta
      }
  → projectNormalRuntimeContext() # 投影回 BuildChatMessagesInput
```

ST Dream 走 `fromStDreamContext()`，从 ST 组装上下文反填上述字段。

**现状**：RuntimeContext 是「结构化适配层」，真正注入模型的仍是 `prompt-compiler` / ST assembler。对 Sober 来说这是正确的抽象边界。

---

## Memory 流程

| 类型 | 实现 | 说明 |
|------|------|------|
| 短期记忆 | `messages` + `trimChatMessagesForModel` | 默认最近 ~10 条、字符预算压缩；runtime `memoryLength` 可调 |
| 长期记忆 | `long_term_memories` | 回合后规则提取 → 入库；下回合 token 检索 Top-K 注入 |
| 历史压缩 | `chat-context-trim` / prompt budget | 截断助手台词、去掉状态栏噪声；非 LLM summarizer |
| 动态状态 | `character_states` + Status Schema v2 | 情感/关系/场景等字段可演进 |

LTM 提取以 **中文剧情规则正则** 为主（`memory-extractor.ts`），类型偏故事 RPG（`story_event`、`mystery`、`item`…），不是 Companion「人生记忆」模型。

---

## 用户系统流程

```
Supabase Auth（email/OAuth）
  → profiles（role、ban、onboarding、persona 字段）
  → user_app_preferences（locale、theme、NSFW 展示/年龄确认）
  → chat_runtime_settings（用户默认 + 会话覆盖）
  → user_wallets / growth（商业化）
  → conversations ↔ messages（按 user_id RLS）
```

关键文件：`src/utils/supabase/*`、`src/lib/auth/*`、`src/lib/profiles.ts`、`src/lib/ban-guard.ts`、`src/contexts/user-session-context.tsx`。

---

# 2. 核心模块清单

## AI Config / LLM Client

路径：`src/lib/ai-config.ts`、`src/lib/ai-model-config-log.ts`

作用：OpenAI 兼容客户端、模型 ID、SiliconFlow thinking 关闭、Referer/Title 头。

主要依赖：`@ai-sdk/openai`、环境变量 `OPENAI_*` / `AI_MODEL`

是否适合迁移到 Sober AI：**KEEP**

原因：薄且通用，是 Runtime 底座；需改品牌头与默认模型即可。

---

## Model Tier Registry

路径：`src/lib/model-tier/**`

作用：产品档位（quick/flow/soul/dream/myth）→ 实际模型；Runtime Preset；成人内容注入门控；资源预算。

主要依赖：`ai-config`、chat settings、billing 定价元数据

是否适合迁移到 Sober AI：**ADAPT**

原因：Tier 产品合同与 YeYe 商业档位绑定；Sober 内测可简化为 1–2 档，保留 registry + adult gate + generation params 能力。

---

## Chat Orchestration

路径：`src/lib/chat-api-route.ts`、`src/app/api/chat/route.ts`（及 jobs/bootstrap/settings）

作用：聊天请求编排、ST Dream 分发、billing、流式与后处理。

主要依赖：pipeline、prompt-compiler、billing、LTM、character-status、preset

是否适合迁移到 Sober AI：**ADAPT**

原因：流程正确，但文件过重且耦合市场角色、ST Dream、计费、Tavern Helper；应拆成瘦 orchestration + Companion 插件点。

---

## Chat Pipeline Context

路径：`src/lib/chat-pipeline-context.ts`、`src/lib/chat-history.ts`、`src/lib/chat/chat-pipeline-cache.ts`

作用：统一拉取角色/状态/lorebook/persona/历史；产出 `ChatPipelineRawData`。

主要依赖：Supabase、characters、prompt-control、character-state、user persona

是否适合迁移到 Sober AI：**ADAPT**

原因：加载契约可复用；需去掉多角色权限/opening choice/市场角色字段，改为单 Companion 配置源。

---

## Prompt Compiler

路径：`src/lib/prompt-compiler.ts`、`src/lib/PromptPipelineContract.ts`、`src/lib/prompt-budget-allocator.ts`、`src/lib/prompt-control-context.ts`、`src/lib/global-rp-prompt.ts`

作用：唯一 `messages[]` 构建；层序锁定；预算与规则冲突解决。

主要依赖：lorebook、character-state、relationship、narrative perspective、ST/Tavern 可选注入

是否适合迁移到 Sober AI：**ADAPT**

原因：架构冻结点，必须保留「单编译器」原则；内容层需从「多角色 RP」改成「Companion Brain」层序（Emotion / Relationship / Memory）。

---

## Runtime Context

路径：`src/lib/runtime-context/**`

作用：结构化 RuntimeContext + Normal/ST 适配 + projector。

主要依赖：`ChatPipelineRawData`、LTM types、relationship metrics、ST types

是否适合迁移到 Sober AI：**KEEP**（结构） / **ADAPT**（字段）

原因：字段模型正是 Sober Brain 所需骨架；应删除 ST/NPC/opening 噪音，新增 emotion/voice/avatar 投影位。

---

## Long-Term Memory

路径：`src/lib/long-term-memory/**`

作用：提取、去重、检索打分、prompt 注入、回合后写入。

主要依赖：Supabase `long_term_memories`、chat 编排

是否适合迁移到 Sober AI：**ADAPT**

原因：管道可复用；类型体系与提取规则偏剧情 RPG，需改为 Companion Memory（偏好、约定、情绪事件、关系里程碑）。

---

## Relationship Context

路径：`src/lib/prompt/relationship-context.ts` + Status Schema relationship 字段

作用：从 status snapshot 读 affection/trust/stage，生成关系引导 prompt。

主要依赖：`character-status` snapshot

是否适合迁移到 Sober AI：**KEEP**（概念） / **ADAPT**（实现）

原因：Sober 需要一等公民 Relationship；当前只是 status 字段投影，应升级为独立状态机 + 持久化。

---

## Character State / Status Engine

路径：`src/lib/character-state*`、`src/lib/character-status/**`、`src/lib/character-state/`

作用：会话动态状态（appearance/emotion/scene）；Status Schema v2 与后台 LLM 更新。

主要依赖：`character_states`、chat onFinish、角色 schema

是否适合迁移到 Sober AI：**ADAPT**

原因：`emotion`/`relationship` group 已有，可作 Emotion Engine 起点；需剥离视觉/服装 RPG 噪音，强化情绪时间线。

---

## ST Dream / SillyTavern Preset

路径：`src/lib/st-preset/**`、`src/lib/preset/**`、`src/lib/tavern-helper/**`

作用：ST 预设导入、Dream 路径组装、相对/绝对注入、Tavern Helper。

主要依赖：`st_presets`、admin、chat 分发

是否适合迁移到 Sober AI：**DROP**（主路径） / **ADAPT**（可选高级预设）

原因：YeYe 兼容负担极大；Sober 内测应单 Brain Prompt 路径。若需 NSFW 写作能力，可后置引入「Preset 插件」而非默认双路径。

---

## Chat Generation Jobs

路径：`src/lib/chat-generation-jobs/**`、表 `chat_generation_jobs`

作用：耐久聊天回合，浏览器断开仍完成生成。

主要依赖：regular turn executor、billing idempotency

是否适合迁移到 Sober AI：**KEEP**

原因：语音/长回复场景同样需要 job 化；与产品形态无关的优质基础设施。

---

## Billing Gateway

路径：`src/lib/billing/**`、相关表 `user_wallets` 等

作用：积分预留/结算/退款、shadow/canary。

主要依赖：chat / image / visual 入口

是否适合迁移到 Sober AI：**ADAPT**（后期） / 内测可 **DROP**

原因：内测可免费；若保留，剥离创作者分成与成长等级。

---

## Auth / Profiles / Preferences

路径：`src/lib/auth/**`、`src/lib/profiles.ts`、`src/lib/user-preferences/**`、`src/utils/supabase/**`

作用：登录、画像、偏好、NSFW 开关、封禁。

主要依赖：Supabase Auth

是否适合迁移到 Sober AI：**KEEP**

原因：小规模内测仍需用户与偏好；NSFW age gate 可直接复用概念。

---

## Characters / Market / Creator / Xuxu / Studio

路径：`src/lib/characters/**`、`market/**`、`creator/**`、`xuxu/**`、`character-creation/**`、`character-assets/**`、`publish/**`

作用：多角色资产、市场目录、创作者经济、卡片导入转换、发布审核。

主要依赖：大量表与 admin UI

是否适合迁移到 Sober AI：**DROP**

原因：与「单核心 AI 角色」直接冲突；迁移会污染 Companion 模型。

---

## Visual / ComfyUI

路径：`src/lib/visual/**`、`src/lib/image-queue/**`、`src/lib/comfyui-client.ts`

作用：从聊天状态投影场景图；ComfyUI 队列。

主要依赖：`image_jobs`、character_states

是否适合迁移到 Sober AI：**DROP**（默认） / 远期 **ADAPT** 为 Avatar 贴图生成

原因：当前是静态插图管道，不是实时 Avatar 驱动；不要当作 Avatar 系统搬运。

---

## Lorebook / Worldbook

路径：`src/lib/lorebook-retriever.ts`、`src/lib/worldbook/**`

作用：关键词检索注入世界知识。

主要依赖：`lorebooks`、prompt-compiler

是否适合迁移到 Sober AI：**ADAPT**

原因：Companion 可用「人设知识库 / 设定条」；去掉全球 UGC lorebook 库与多角色绑定。

---

## Rule Engine

路径：`src/lib/rule-engine/**`

作用：输入仲裁、语义一致性、safety/regex 规则。

主要依赖：system_rules、pipeline

是否适合迁移到 Sober AI：**ADAPT**

原因：安全层有价值；需重写成 Companion 安全策略，避免 RP jailbreak 规则堆叠。

---

## Chat Client Helpers

路径：`src/lib/chat/**`、`src/components/chat/**`

作用：bootstrap、scroll、rewind、persona、rich text、token debug。

主要依赖：API、Supabase client

是否适合迁移到 Sober AI：**ADAPT**

原因：聊天 UX 部分可复用；市场/多会话角色切换 UI 不需要。

---

## Admin / Prompt Control Center

路径：`src/app/admin/**`、`src/lib/admin/**`

作用：运营后台、模型预设、ST inspector、角色生成器。

主要依赖：全平台数据

是否适合迁移到 Sober AI：**DROP**（大部分） / **ADAPT** 最小运营面板

原因：内测只需轻量配置面板（Companion 设定、模型、记忆开关）。

---

# 3. AI Runtime 迁移评估

## LLM Provider

| 能力 | 现状 | 可否作 Sober 核心 |
|------|------|-------------------|
| 模型调用 | `createChatOpenAIClient` + `openRouter.chat(modelId)` | ✅ 是 |
| Streaming | `streamText` + UI message stream | ✅ 是 |
| Provider 切换 | `OPENAI_BASE_URL` + env 模型 ID / Tier registry | ✅ 是（保持 OpenAI 兼容即可） |
| Token 处理 | usage 读取、debug 记录、billing 估算 | ✅ 保留；计费可后置 |
| 错误处理 | onError refund、用户可读错误 | ✅ 是 |
| Thinking 控制 | SiliconFlow `enable_thinking: false` | ✅ 保留小适配层 |

**结论**：LLM Provider 层 **可以作为 Sober AI 核心**。建议原样提取 `ai-config` + 精简 `model-tier`（单/双档），外挂 Voice Provider 接口，不把 ComfyUI/Xuxu 网关混入。

---

## Chat Pipeline

```
用户输入
  ↓
Context 构建（pipeline + runtime-context）
  ↓
Prompt Assembly（prompt-compiler / 未来 Companion compiler）
  ↓
LLM 调用（streamText / job generateText）
  ↓
输出处理（polish → sanitize → status/emotion update → persist → memory）
```

**可复用部分**：

| 阶段 | 复用策略 |
|------|----------|
| 鉴权 + 会话消息权威源 | KEEP（`chat-history`、`conversations`、`messages`） |
| Context 并行加载模式 | KEEP 模式；换数据源 |
| 单编译器架构 | KEEP 原则；重写层内容 |
| Runtime settings 注入 | ADAPT（减少 gameMode 等 RPG 旋钮） |
| Streaming + job 双通道 | KEEP |
| Post-process polish/expand | ADAPT（Companion 语气策略） |
| Billing / ST Dream / Tavern | DROP 或后置插件 |

**不可直接复制**：`chat-api-route.ts` 整文件（耦合过多）、ST Dream 分叉、市场角色权限逻辑。

---

## Runtime Context

| 字段 | Sober 建议 |
|------|------------|
| `characterContext` | **KEEP → 改名为 companionContext**；单角色静态人设 |
| `userContext` | **KEEP**；用户称呼 / persona / 叙事视角可简化 |
| `relationshipContext` | **KEEP 并升级为一等模块**；不只读 status |
| `dynamicStateContext` | **ADAPT** → Emotion + Scene 子集 |
| `memoryContext` | **KEEP**；类型改为 Companion Memory |
| `lorebookContext` | **ADAPT** → companion knowledge entries |
| `openingContext` | **DROP**（多开场分支 RPG） |
| `stRuntimeContext` | **DROP**（默认路径） |
| `worldContext` | **DROP/可选**（ST world info） |
| `npcContext` | **DROP** |
| `debugMeta` | **KEEP** |

**建议新增**：

- `emotionContext`：当前情绪向量、强度、触发原因、衰减
- `voiceContext`：音色、说话风格、实时会话状态
- `avatarContext`：表情/口型/姿态驱动指令
- `relationshipTimelineContext`：里程碑与阶段历史摘要

---

## Memory 系统 → AI Companion Memory

| 现有 | Companion 转换 |
|------|----------------|
| 短期：历史 trim | 保留；语音回合可更短窗口 + 摘要缓冲 |
| 长期：规则提取 9 类剧情类型 | 重设计类型：`preference`、`commitment`、`emotion_event`、`biometric_or_habit`、`shared_joke`、`boundary`、`milestone` |
| 检索：token overlap + importance | 升级：同会话加权 + 向量检索（可选后期）+ 关系相关优先 |
| 压缩：截断非摘要 | 新增：周期性 LLM 摘要进「人生档案」 |
| 与 status 分裂 | 合并：Memory 写事实，Emotion/Relationship 写状态 |

**判断**：Memory **管道（inject before rules / extract after reply）应保留**；**提取语义与 schema 必须重做**，否则会把 RPG 剧情记忆污染 Companion。

---

# 4. 数据库迁移分析

## 可以复用

| 表名 | 用途 | 迁移建议 |
|------|------|----------|
| `profiles` | 用户画像 / role / ban | KEEP；删掉 YeYe 品牌字段或映射 |
| Auth（`auth.users`） | 认证 | KEEP（新项目新 Supabase 也可） |
| `conversations` | 会话 | KEEP；可约束「每用户单 companion 主会话」 |
| `messages` | 消息 | KEEP |
| `chat_runtime_settings` | 运行时设置 | ADAPT 精简 settings jsonb |
| `chat_generation_jobs` | 耐久生成 | KEEP |
| `long_term_memories` | 长期记忆 | ADAPT：改 type check + 索引策略 |
| `character_states` | 动态状态 jsonb | ADAPT → `companion_states` |
| `system_settings` | 全局开关 | KEEP（精简） |
| `user_wallets` 等计费核心 | 积分 | 后期 ADAPT；内测可跳过 |

## 需要改造

| 表名 | 用途 | 迁移建议 |
|------|------|----------|
| `characters` | 多角色 UGC 卡 | 改为单表 `companions` 或种子单行；去掉 market 字段 |
| `lorebooks` | 多角色世界书 | 改为 companion knowledge；去掉 UGC 共享模型 |
| `system_rules` / `author_notes` / `prompt_presets` | Prompt 控制 | 精简为 Sober 安全/格式规则集 |
| `st_presets` / `st_runtime_global_settings` | ST Dream | 不迁主路径；归档参考 |
| Status Schema（角色字段） | 情绪/关系 | 升级为 Emotion/Relationship 专用表或强类型 jsonb |
| `user_app_preferences` | NSFW/主题 | KEEP NSFW gates；主题品牌化重做 |

## 不应该迁移

| 表名 | 用途 | 迁移建议 |
|------|------|----------|
| `character_cards` / `user_cards` | 市场卡片 | DROP |
| `character_likes` / `bookmarks` / `comments*` | 社交互动 | DROP |
| `tags` / `character_tags` | 发现标签 | DROP |
| `creators*` / `creator_*` / `character_creators` | 创作者经济 | DROP |
| `character_publish_*` / `character_asset_versions` | 发布资产 | DROP |
| `xuxu_*` | 导入工作室流水线 | DROP |
| `generation_history_records` / `generation_batches` | AI 角色生成器 | DROP |
| `image_jobs` / `image_generation_logs` | ComfyUI | DROP（除非另建 Avatar 资产管线） |
| `preset_usage_stats` | 预设统计 | DROP |
| `user_growth_*` | 付费成长等级 | DROP（内测） |
| `credit_packages` / `credit_orders`（未接支付） | 商城 | 后期再议 |

---

# 5. Sober AI 产品需求匹配分析

假设目标：单核心 AI、实时语音、长期关系记忆、Emotion Engine、Avatar、Voice、NSFW、小规模内测。

## 当前 YeYe AI 已经具备

- 完整 Chat Runtime（pipeline + 单编译器 + streaming + job）
- OpenAI 兼容多模型切换与 Tier/Preset 经验
- 长期记忆管道（存取注入）
- 关系/情绪字段（Status Schema v2 的 relationship/emotion groups）
- NSFW 偏好门控与成人 Runtime Preset 注入检查
- 用户认证、会话、消息持久化、RLS
- 耐久生成与中断恢复思维
- Roleplay 后处理（口吻 polish、长度策略）——可改造为 Companion 语气

## 缺少

- **实时语音交互**（无 TTS/STT/WebRTC/Realtime session）
- **Avatar 驱动**（无 Live2D/VRM/口型/表情实时通道；仅有静态 avatar_url + Comfy 插图）
- **Emotion Engine**（无独立情绪状态机、衰减、表达映射；仅有 status 字段更新）
- **单核心 Companion 产品模型**（系统假设多角色市场）
- **Companion 级人生记忆**（无里程碑档案、向量检索、跨会话人格连续性产品化）
- **Voice 人格配置**（音色、打断、 barge-in、情感韵律）
- **小规模内测运营面**（邀请码、设备会话、语音配额等）

## 需要重新设计

- 产品信息架构：从「选角色聊天」→「进入唯一 Companion」
- Prompt 层序：从 RP/ST/Lorebook → Brain + Emotion + Relationship + Memory + Voice style
- Relationship：从 status 投影 → 持久关系图 + 阶段策略
- Emotion：独立引擎，输出同时驱动文本 / Voice / Avatar
- Memory schema 与提取器
- 实时会话拓扑：文本 chat 与 voice session 统一 turn 模型
- 数据模型命名与表边界（companion 域）

---

# 6. 文件级迁移候选列表

## 第一优先级迁移（必须）

| 文件路径 | 原因 |
|----------|------|
| `src/lib/ai-config.ts` | LLM 客户端底座 |
| `src/lib/model-tier/registry.ts` + `contract.ts` + `tier-binding.ts` | 模型解析（可精简） |
| `src/lib/model-tier/runtime-preset-adult-access.ts` | NSFW 门控可复用 |
| `src/lib/chat-pipeline-context.ts` | Pipeline 数据契约模式 |
| `src/lib/chat-history.ts` | 消息权威源逻辑 |
| `src/lib/prompt-compiler.ts` | 单编译器架构（内容要改） |
| `src/lib/PromptPipelineContract.ts` | 层序稳定性锁 |
| `src/lib/prompt-budget-allocator.ts` | 上下文预算 |
| `src/lib/runtime-context/**` | RuntimeContext 骨架 |
| `src/lib/long-term-memory/**` | Memory 管道 |
| `src/lib/prompt/relationship-context.ts` | 关系注入起点 |
| `src/lib/character-status/types.ts` + snapshot/updater 核心 | Emotion/Relationship 字段基础 |
| `src/lib/chat-context-trim.ts` | 短期历史压缩 |
| `src/lib/chat-generation-jobs/**` | 耐久 turn |
| `src/lib/conversations.ts`（及消息 CRUD） | 会话/消息存储 API |
| `src/utils/supabase/**` | Supabase 客户端 |
| `src/lib/auth/**`、`src/lib/profiles.ts`、`src/lib/user-preferences/**` | 用户系统 |
| `src/lib/billing/billing-gateway.ts`（可选后期） | 若内测后要计量 |
| 相关 vitest：`src/tests/chat/**`、`runtime-context/**`、`long-term-memory/**`、`model-tier/**` | 保护 Runtime 不回归 |

## 第二优先级迁移（建议）

| 文件路径 | 原因 |
|----------|------|
| `src/lib/chat-api-route.ts`（拆分后） | 编排经验；勿整文件复制 |
| `src/lib/chat-settings/**` | runtime settings 校验/默认值可裁剪 |
| `src/lib/roleplay-post-process.ts`、`roleplay-dialogue-expand.ts`、`roleplay-turn-policy.ts` | 输出润色可改为 Companion tone |
| `src/lib/rule-engine/**` | 安全/输入仲裁 |
| `src/lib/lorebook-retriever.ts` | 知识检索算法 |
| `src/lib/narrative-perspective-prompt.ts`、`src/lib/chat/user-persona-settings.ts` | 用户人格 |
| `src/lib/chat/**` 客户端缓存与 bootstrap | 聊天 UX 性能技巧 |
| `src/components/chat/*`（精选） | 消息列表/流式渲染可参考 |
| `src/lib/ban-guard.ts` | 封禁 |
| `docs/architecture.md`、`architecture-freeze.md` | 架构约束文档应带到新仓 |

## 不迁移

| 文件路径 | 原因 |
|----------|------|
| `src/lib/xuxu/**`、`src/app/xuxu/**`、`src/app/api/xuxu/**` | 角色卡工作室流水线 |
| `src/lib/market/**`、`src/app/market/**` | 多角色市场 |
| `src/lib/creator/**`、`src/app/creator/**` | 创作者经济 |
| `src/lib/character-creation/**`、`character-assets/**`、`publish/**` | UGC 资产发布 |
| `src/lib/admin/ai-character-generator/**` | 批量角色生成 |
| `src/lib/st-preset/**`、`src/lib/tavern-helper/**`（主路径） | ST Dream 双栈 |
| `src/lib/visual/**`、`image-queue/**`、ComfyUI 相关 | 插图队列 ≠ Avatar |
| `src/app/studio/**`、`src/components/studio/**` | 多角色工作室 |
| `src/app/leaderboard/**`、`favorites/**`、`gallery/**` | 社区发现面 |
| 大部分 `src/app/admin/**` | 平台运营后台 |
| `packages/character-import` 主流程依赖（除非单卡导入人设） | UGC 导入产品 |

---

# 7. 风险分析

## 1. 高度耦合模块

- **`chat-api-route.ts`**：billing + ST Dream + preset + LTM + status + tavern + runtime preset 全揉在一处。
- **`prompt-compiler.ts`**：虽是正确单点，但已嵌入 ST/Tavern/DreamPlot/RP 层，迁移时容易「带着旧层走」。
- **`characters` 行模型**：几乎所有 Runtime 都依赖 `CharacterRow`；Sober 若不先替换 Companion 类型，会持续被 UGC schema 绑架。
- **Normal / ST Dream 双路径**：任何「先复制再删 ST」都会让行为分叉难测。

## 2. 旧逻辑污染风险

- 直接复制整个 `src/lib` → 市场/创作者/Xuxu 依赖链会跟着进来。
- 保留 `gameMode`、opening choices、NPC、worldInfo 等 RPG 旋钮 → Companion 体验漂移。
- LTM 现有 `story_event`/`mystery` 提取规则 → 记忆变成「剧本日志」而非「关系记忆」。
- NSFW：YeYe 的 jailbreak/override 规则文化与 Companion 安全策略可能冲突，需重审 `system_rules` 种子。

## 3. 应重新设计而非复制

- Emotion Engine（独立状态机 + 驱动总线）
- Voice Session Runtime
- Avatar Expression Mapper
- Companion Prompt Layer Map
- Relationship 持久化与阶段策略
- Memory 类型与检索（含可选 embeddings）
- 产品导航 IA（去掉市场）

## 4. 数据库迁移风险

- 不能「fork 全量 migrations」到 Sober：创作者/xuxu/市场表会固化错误域模型。
- `long_term_memories.type` check constraint 与 Companion 类型不兼容 → 需要新 migration，而非改生产 YeYe。
- RLS 策略绑定 `characters`/`conversations.character_id` → 改名或单 companion 时要整体重写策略。
- 建议：**新 Supabase 项目 + 最小 schema 重建**，只迁移必要种子规则与内测用户，不做整库搬迁。

## 5. 环境变量依赖

关键（来自 `.env.example` 与代码）：

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` / `OPENAI_BASE_URL`
- `AI_MODEL` / `NEXT_PUBLIC_AI_MODEL`（遗留）
- `DEFAULT_CHAT_TIER`、`QUICK_MODEL`/`FLOW_MODEL`/`SOUL_MODEL`/`DREAM_MODEL`/`MYTH_MODEL`
- `BILLING_MODE` 及 billing 汇率类
- `ENABLE_PRESET` / `ENABLE_TAVERN_HELPER`
- `COMFYUI_*`（Sober 默认不需要）
- 调试：`PROMPT_DEBUG`、`CHAT_RUNTIME_DEBUG`、`CHAT_ROUTE_TRACE` 等

Sober 新增预期：`VOICE_*`、`TTS_*`、`STT_*`、`AVATAR_*`、`SOBER_COMPANION_ID` 等。

## 6. 第三方服务依赖

| 服务 | YeYe 用途 | Sober |
|------|-----------|-------|
| Supabase | DB/Auth/Storage | 继续 |
| OpenRouter / SiliconFlow 等 | LLM | 继续 |
| ComfyUI | 图像 | 默认不迁 |
| Vercel（部署假设） | Next 托管 | 可选 |
| 支付提供商 | 未完全接通 | 内测不需要 |
| Voice/Avatar 供应商 | 无 | **必须新选**（Realtime API / TTS / Live2D 等） |

---

# 8. 给 Sober AI 的建议架构

目标分解：

```
Sober AI =
  AI Brain
+ Memory
+ Emotion
+ Voice
+ Avatar
+ Relationship
```

## 推荐目录结构

```text
sober-ai/
  src/
    app/                          # Next.js App Router（精简产品面）
      (app)/
        chat/                     # 主 Companion 文本会话
        voice/                    # 实时语音会话 UI
        onboarding/
        settings/
        invite/                   # 内测邀请
      api/
        chat/                     # 文本 turn
        voice/                    # session / token / events
        companion/                # 单角色配置读取
        memory/
        emotion/
        health/
      auth/
    components/
      chat/
      voice/
      avatar/
      emotion/                    # 调试/内测可视化（可选）
      ui/
    lib/
      brain/                      # AI Brain（原 Runtime Core）
        ai-config.ts
        model-registry.ts
        chat-orchestrator.ts      # 瘦编排（从 chat-api-route 重生）
        prompt-compiler.ts        # Companion 层序编译器
        prompt-layers/            # identity / safety / style…
        pipeline-context.ts
        output-postprocess.ts
      memory/
        types.ts
        extractor.ts
        retriever.ts
        summarizer.ts
        inject.ts
        service.ts
      emotion/
        types.ts
        engine.ts                 # 状态更新 / 衰减
        prompt-projector.ts
        avatar-mapper.ts
        voice-mapper.ts
      relationship/
        types.ts
        stage-machine.ts
        metrics.ts
        prompt-projector.ts
        store.ts
      voice/
        session.ts
        stt.ts
        tts.ts
        barge-in.ts
        turn-adapter.ts           # voice turn → brain turn
      avatar/
        driver.ts                 # 表情/口型/姿态指令
        providers/                # live2d | rive | video 等
      companion/
        config.ts                 # 单核心角色定义
        knowledge.ts              # 精简 lore/knowledge
      runtime-context/
        types.ts
        builder.ts
        projectors/
      users/
        auth/
        profiles/
        preferences/              # NSFW gates 等
      billing/                    # 可选，后期
      db/
        supabase/
    server/                       # 仅服务端边界（secrets、voice tokens）
      voice/
      llm/
    types/
    tests/
      brain/
      memory/
      emotion/
      relationship/
      voice/
  database/
    migrations/                   # 最小 schema（勿复制 YeYe 全量）
    seeds/
      companion.sql
      safety_rules.sql
  docs/
    ARCHITECTURE.md
    MIGRATION_FROM_YEYE.md
```

## 层职责建议

| 层 | 职责 | 禁止 |
|----|------|------|
| `brain` | 上下文装配、编译、LLM、流式/job | 不知市场/创作者 |
| `memory` | 事实记忆生命周期 | 不直接驱动 Avatar |
| `emotion` | 情绪状态真源 | 不写业务 SQL 散落各处 |
| `relationship` | 关系阶段与策略 | 不塞进 status 杂项 |
| `voice` | 实时音视频会话 | 不重建 prompt |
| `avatar` | 表现层驱动 | 不调用 LLM |
| `runtime-context` | 只读投影总线 | 不包含 YeYe ST 分叉 |

**关键原则**：YeYe 的「单编译器 + 编排不写 prompt」冻结纪律应原样带到 Sober；新增能力通过 **新层数据 → 投影进 compiler**，而不是新写第二个 prompt builder。

---

# 9. 最终输出总结

## YeYe AI → Sober AI

**迁移策略**：

不要复制整个 YeYe AI，而是提取 AI Runtime Core（LLM、Pipeline、Compiler 纪律、RuntimeContext、Memory 管道、Jobs、Auth），在新仓库中重建 Companion Layer（Emotion、Relationship、Voice、Avatar、单角色产品面），数据库用最小 schema 重生而非全量搬迁。

**一句话总结**：

> **不要复制整个 YeYe AI，而是提取 AI Runtime Core，重新构建 Companion Layer。**

## 下一阶段建议执行顺序

1. **冻结边界**：确认 Sober 仓库与 YeYe 仓库物理分离；本报告所列 DROP 域永不导入。  
2. **抽取 Runtime Core 清单落地**：按「第一优先级」建立 `lib/brain` + `lib/memory` + `lib/runtime-context` 骨架（先可运行文本 chat）。  
3. **重建最小数据库**：`profiles`、`companions`（单行）、`conversations`、`messages`、`companion_states`、`long_term_memories`（新类型）、`chat_runtime_settings`、`chat_generation_jobs`。  
4. **重写 Prompt 层序**：Companion Identity / Safety / Emotion / Relationship / Memory / Style；删除 ST Dream 主路径。  
5. **升级 Memory + Relationship + Emotion**：新 schema、新提取器、状态机；打通回合后更新总线。  
6. **接入 Voice**：选供应商 → session token API → voice turn 适配 brain turn。  
7. **接入 Avatar**：Emotion/Voice 事件 → 表情口型驱动；勿复用 ComfyUI 队列当实时方案。  
8. **NSFW / 安全策略**：复用 adult access 概念，重审规则种子；内测邀请制。  
9. **再考虑计费**：有留存后再引入精简 billing；不要带创作者经济。  
10. **对照测试**：移植/重写 `runtime-context`、`long-term-memory`、`chat` 核心测试，建立 Companion 黄金用例。

---

## 附录 A：YeYe AI Runtime 关键入口速查

| 主题 | 入口 |
|------|------|
| Chat 编排 | `src/lib/chat-api-route.ts` → `handleChatPost` |
| Pipeline 加载 | `src/lib/chat-pipeline-context.ts` |
| Prompt 编译 | `src/lib/prompt-compiler.ts` |
| RuntimeContext | `src/lib/runtime-context/runtime-context-types.ts` |
| LTM | `src/lib/long-term-memory/long-term-memory-orchestration.ts` |
| LLM Client | `src/lib/ai-config.ts` |
| Model Tier | `src/lib/model-tier/index.ts` |
| ST Dream | `src/lib/st-preset/st-dream-chat-route.ts` |
| Jobs | `src/lib/chat-generation-jobs/execute-regular-turn.ts` |
| 架构文档 | `docs/architecture.md`、`docs/architecture-freeze.md` |

## 附录 B：审计方法说明

- 阅读 `package.json`、`.env.example`、`docs/architecture*.md`
- 扫描 `src/lib`、`src/app/api`、`supabase/migrations`
- 通过 Supabase MCP `list_tables` 核对生产/连接库表清单
- 精读 Chat Pipeline、RuntimeContext、LTM、Model Tier、Billing 耦合点
- **未**修改任何业务代码；本文件为唯一新增交付物

---

*End of report.*
