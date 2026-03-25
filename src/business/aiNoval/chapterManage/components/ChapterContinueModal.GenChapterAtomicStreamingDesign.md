# ChapterContinueModal：genChapter 单轮原子化 + Streaming 设计

## 一、目标

- **拆解**：把当前 `genChapterBlocking` 的“一把梭”后端流程拆为可组合的**原子步骤**（atomic steps）。
- **编排**：步骤顺序、循环、重试、终止由前端 `ChapterContinueModal.tsx` 控制。
- **体验**：每个步骤都以 **fetch ReadableStream** 方式流式回显（至少阶段进度；写作/改写步骤提供文本增量）。
- **兼容**：保留现有阻塞接口 `/api/aiNoval/chapters/genChapter` 不动，新增 streaming/step 端点。

## 二、原子步骤调用顺序（流程逻辑图）

> 说明：此图描述的是 **单轮章节生成（非分段）** 的原子化流程。分段续写请看 `ChapterContinueModal.SegmentedDesign.md`。

```mermaid
flowchart TD
  start([Start_ClickContinue]) --> prepareInputs[StepA_prepareInputs\n(frontend)\nloadRelatedChapters+summarize+buildPrevContent+buildReqObj]
  prepareInputs --> aggregateContext[StepB_aggregateContext\n(backend)\ngetAggregatedContext]
  aggregateContext --> writerDraft[StepC_writerDraft\n(backend)\nLLM_stream_draft]
  writerDraft --> critic2[StepD_critic2TaskUnderstanding\n(backend)\nOK_or_MISUNDERSTANDING]
  critic2 -->|MISUNDERSTANDING| endMisunderstanding([End_Error_Misunderstanding])
  critic2 -->|OK| critic1[StepE_critic1HardCheck\n(backend)\nPASS_or_FAIL+reason]
  critic1 -->|PASS| done([End_Success_FinalContent])
  critic1 -->|FAIL| critic3[StepF_critic3Advice\n(backend)\nadvice]
  critic3 --> decideModifier{StepI_loopControl\n(frontend)\nshouldRunModifier?}
  decideModifier -->|Yes| modifier[StepG_modifierRemoveCliches\n(backend)\nmaybe_stream_tunedDraft]
  decideModifier -->|No| rewrite[StepH_rewrite\n(backend)\nLLM_stream_rewrite]
  modifier --> rewrite
  rewrite --> roundsCheck{StepI_loopControl\n(frontend)\nrounds<critic_max_rounds?}
  roundsCheck -->|Yes| critic2
  roundsCheck -->|No| endMaxRounds([End_Error_MaxRounds_or_AcceptBestEffort])
```

## 三、边界约束（用于规范后续改动）

- **前端编排权**：循环次数、是否进入 modifier、是否接受当前稿、终止与重试均由前端决定。
- **步骤单一职责**：每个后端 step 只做一件事，不要在 step 内隐式触发别的 step（避免“半单体”回潮）。
- **Streaming 下限**：每步至少回显 `phase(start/end)`；写作类 step（draft/rewrite）回显 `delta(text)`。
- **可中止**：前端 `AbortController`；后端监听 `req.on('close')` 并停止后续计算/循环。

## 四、前端控制逻辑（ChapterContinueModal 编排器）

### 4.1 前端状态机（建议）

> 目标：把“单轮生成”拆成可观测、可终止、可重试的 step-runner；UI 只订阅状态与流事件。

- `idle`：未开始
- `preparing_inputs`：准备 `prev_content/curr_context/reqObj`（含前情缩写）
- `running_step`：正在跑某个后端 step（流式回显）
- `awaiting_decision`：拿到 critic 结果后等待前端决定（继续重写/接受/终止）
- `done`：结束（成功或 best-effort）
- `error`：失败（可从失败 step 重试）
- `aborted`：用户终止

### 4.2 前端的“步骤编排核心”

前端需要维护一份可序列化的运行上下文（用于重试/断点恢复/日志定位）：

- `inputs`（来自现有 `reqObj`）：
  - `prev_content`, `curr_context`
  - `role_group_names/role_names/faction_names/geo_names`
  - `draft_llm_type/polish_llm_type`
  - `attention/manual_section/chapter_style/...`
  - `critic_max_rounds` 等开关
- `runtime`：
  - `round`: number（当前重写轮次，从 0 起）
  - `context`: string（StepB 产物）
  - `draft`: string（StepC/StepH 产物：当前候选正文）
  - `critic2`: { misunderstood: boolean }
  - `critic1`: { pass: boolean; reason?: string }
  - `critic3`: { advice?: string }
  - `tunedDraft`: string（StepG 产物，可选）
  - `abortController`: AbortController（当前 fetch）

### 4.3 前端的“循环控制”（与后端整合点）

对应流程图里的 `StepI_loopControl`，前端做这些决定：

- **终止**：用户点击“终止续写” → `abortController.abort()` → 状态 `aborted`
- **是否继续循环**：当 `critic1.fail` 且 `round < critic_max_rounds` 时，进入 `rewrite`；否则结束并提示“达到上限/接受当前稿”
- **是否先跑 modifier**：`shouldRunModifierFromCritic1Reason(critic1.reason)`（沿用后端逻辑，或把判断留在后端 StepG 内部也可，但触发权在前端）
- **重试策略**：某 step 失败时，允许“从该 step 重试”（不必从头准备 inputs）

### 4.4 Streaming 消费与 UI 绑定（fetch ReadableStream）

- **传输协议建议**：NDJSON（JSON Lines）
  - 每行一个事件 JSON，前端按行解码并 dispatch
  - `AbortController` 取消时 reader 立刻结束，UI 进入 `aborted`

事件最小集合（所有 step 统一）：

- `phase`：`{ type: "phase", step, status: "start" | "end", ts?, meta? }`
- `delta`：`{ type: "delta", step, text }`（仅 writerDraft/rewrite 需要）
- `result`：`{ type: "result", step, data }`（结构化产物，如 context、pass/fail）
- `error`：`{ type: "error", step, message }`

UI 建议绑定（对应现有 `ChapterContinueModal.tsx` 的字段）：

- `autoWriteStatus`：由 `phase` 推导（例如 `writerDraft: start` → `processing`）
- `autoWriteResult`：聚合 `delta`（实时可见）+ 在 `result` 时校准全文
- `autoWriteError`：收到 `error` 或 `critic2.misunderstood` / `endMaxRounds` 时写入
- `autoWriteElapsed`：用 `phase` 的时间戳做前端统计（或后端 `result.meta.elapsedMs`）

## 五、后端原子步骤（API 契约 + 前端如何调用）

> 约定：每个 step 是独立端点；输入包含“原始 inputs + 必要的上一步产物”；输出用 NDJSON 流。

### 5.1 StepB：aggregateContext

- **Endpoint（新增）**：`POST /api/aiNoval/chapters/genChapterStep/aggregateContext?worldviewId=...`
- **输入**：`role_group_names/role_names/faction_names/geo_names`
- **输出（result.data）**：`{ context: string }`
- **前端调用点**：`prepareInputs` 完成后立即调用；将产物写入 `runtime.context`

### 5.2 StepC：writerDraft（流式）

- **Endpoint（新增）**：`POST /api/aiNoval/chapters/genChapterStep/writerDraft?worldviewId=...`
- **输入**：`prev_content/curr_context/attention...` + `context` + `draft_llm_type`
- **输出**：
  - `delta(text)`：正文增量
  - `result.data`: `{ draft: string }`
- **前端调用点**：写入 `runtime.draft`，UI 实时回显

### 5.3 StepD：critic2TaskUnderstanding

- **Endpoint（新增）**：`POST /api/aiNoval/chapters/genChapterStep/critic2?worldviewId=...`
- **输入**：`draft + prev_content + curr_context` + `polish_llm_type`
- **输出（result.data）**：`{ misunderstood: boolean }`
- **前端调用点**：若 `misunderstood=true` 直接结束并提示用户重试

### 5.4 StepE：critic1HardCheck

- **Endpoint（新增）**：`POST /api/aiNoval/chapters/genChapterStep/critic1?worldviewId=...`
- **输入**：`draft + prev_content + curr_context + context` + `polish_llm_type`
- **输出（result.data）**：`{ pass: boolean, reason?: string }`
- **前端调用点**：若 pass → `done`；否则进入 StepF

### 5.5 StepF：critic3Advice

- **Endpoint（新增）**：`POST /api/aiNoval/chapters/genChapterStep/critic3?worldviewId=...`
- **输入**：`draft + prev_content + curr_context + context + critic1Result`
- **输出（result.data）**：`{ advice: string }`
- **前端调用点**：合并到“重写约束”，并展示给用户（可选）

### 5.6 StepG：modifierRemoveCliches（可选）

- **Endpoint（新增）**：`POST /api/aiNoval/chapters/genChapterStep/modifier?worldviewId=...`
- **输入**：`draft`（以及触发依据，可选传入 `critic1.reason`）
- **输出（result.data）**：`{ tunedDraft: string }`
- **前端调用点**：如果启用，覆盖 `runtime.draft = tunedDraft`

### 5.7 StepH：rewrite（流式）

- **Endpoint（新增）**：`POST /api/aiNoval/chapters/genChapterStep/rewrite?worldviewId=...`
- **输入**：`prev_content/curr_context/context + rejectedDraft(draft) + mergedCriticReason + polish_llm_type`
- **输出**：
  - `delta(text)`：改写正文增量
  - `result.data`: `{ draft: string }`（新一轮候选稿）
- **前端调用点**：`round++`，回到 StepD

## 六、端到端整合（前端→后端）执行顺序

1. **StepA（前端）**：准备 inputs（前情摘要、reqObj）
2. **StepB**：拿到 `context`
3. **StepC**：流式生成 `draft`
4. **StepD**：若误解 → 回到StepC
5. **StepE**：若 PASS → 结束；若 FAIL → 继续
6. **StepF**：拿到补充建议，合并为 `mergedCriticReason`
7. **StepI（前端）**：决定是否走 modifier
8. **StepG（可选）**
9. **StepH（流式改写）**
10. **StepI（前端）**：判断轮次上限，回到 StepD 或结束

