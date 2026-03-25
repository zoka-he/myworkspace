---
name: genChapter 原子化+Streaming 方案
overview: 对现有 ChapterContinueModal→genChapterBlocking 的阻塞流程做回归分析，并给出将生成流程拆为原子步骤、由前端编排、且每步以 fetch streaming 输出的可行性与落地拆解。
todos:
  - id: regression-map
    content: 补齐 ChapterContinueModal 里 genChapter 相关 UI/状态与中止逻辑的回归说明（现状→痛点）
    status: pending
  - id: stream-protocol
    content: 确定 NDJSON 事件结构与前端解析封装（fetch ReadableStream）
    status: pending
  - id: api-split
    content: 按现有 genChapter.ts 拆出 atomic step API 列表与每步输入/输出契约
    status: pending
  - id: frontend-orchestrator
    content: 设计 ChapterContinueModal 的前端编排状态机（step 进度、可暂停/终止/重试）
    status: pending
  - id: phased-rollout
    content: 给出分阶段落地顺序：先写作 token stream，再把审稿/改写/聚合逐步流式化
    status: pending
isProject: false
---

## 现状回归（design regression）

- **前端入口**：`ChapterContinueModal.tsx` 里 `executeAutoWrite()` 组装 `reqObj`（包含 `prev_content/curr_context/角色阵营地理/文风对抗/critic_max_rounds` 等），然后一次性调用 `apiCalls.genChapterBlocking()`，等待后端完整返回。

```549:598:g:\workspace\next-framework\src\business\aiNoval\chapterManage\components\ChapterContinueModal.tsx
    const reqObj = {
      prev_content: latestStripReportList
        .filter(chapter => chapter.state === 'completed' && chapter.strippedContent)
        .map(chapter => chapter.strippedContent)
        .join('\n\n'),
      curr_context: prompt,
      role_group_names: roleGroupNames || '',
      role_names: roleNames || '',
      faction_names: factionNames || '',
      geo_names: geoNames || '',
      llm_type: draftLlmType,
      draft_llm_type: draftLlmType,
      polish_llm_type: polishLlmType,
      attention: attention || '',
      manual_section: manualSection || '',
      chapter_style: chapterStyle || '',
      extra_settings: extraSettings || '',
      anti_lovecraft_style: antiLovecraftStyle,
      anti_sweet_ceo_style: antiSweetCeoStyle,
      anti_fake_protocol_style: antiFakeProtocolStyle,
      anti_encrypted_channel_style: antiEncryptedChannelStyle,
      anti_wasteland_style: antiWastelandStyle,
      anti_enum_reactions_style: antiEnumReactionsStyle,
      anti_cliche_phrase_style: antiClichePhraseStyle,
      anti_plot_explanation: antiPlotExplanation,
      anti_speech_military_summary_style: antiSpeechMilitarySummaryStyle,
      critic_max_rounds: criticMaxRounds,
    };

    const res = await chapterApi.genChapterBlocking(selectedChapter.worldview_id, reqObj, store.getState().difySlice.frontHost || '');
```

- **前序章节处理**：`handleContinue()` 先拉取关联章节内容；若有 `summary` 直接用；否则走 `stripText()`（这是阻塞式 LLM 调用）。这块目前已有“先加载章节→并行缩写→再续写”的前端编排雏形，但「续写」仍是一把梭。
- **后端 genChapter（阻塞）**：`pages/api/web/aiNoval/chapters/genChapter.ts` 的 `handleGenChapter()` 是“单请求全流程”：
  - 聚合 context（embedding 检索角色/阵营/地理/关系）
  - writer 初稿（`callLLM(draftLlmType, ...)`）
  - critic2（任务理解检查，误解直接 early return）
  - critic1+critic3 审稿；失败则进入“修改员（可选）→重写”循环，最多 `critic_max_rounds`
  - 最后返回 `data.outputs.output`

```774:912:g:\workspace\next-framework\pages\api\web\aiNoval\chapters\genChapter.ts
        context = await getAggregatedContext(worldviewIdNum, role_group_names, role_names, faction_names, geo_names);
        const systemPrompt = buildPromptTemplate(attensionText);
        const userInput = buildUserInput(prev_content, curr_context);

        let output = await callLLM(draftLlmType, systemPrompt, userInput, context, { forWriting: true });

        const critic2Response = await callLLM(polishLlmType, CRITIC2_SYSTEM_PROMPT, critic2Input, '');
        if (critic2Result.misunderstood) {
            res.status(200).json({ data: { outputs: { output: '' }, status: 'error', error: '模型误解了续写任务…', elapsed_time } });
            return;
        }

        for (let i = 0; i < maxRewrites; i++) {
            const criticResponse = await callLLM(polishLlmType, CRITIC_SYSTEM_PROMPT, criticInput, context);
            const criticResult = parseCriticResponse(criticResponse);

            const critic3Response = await callLLM(polishLlmType, CRITIC3_SYSTEM_PROMPT, critic3Input, context);
            const critic3Advice = extractCritic3FinalSuggestion(critic3Response || '');

            if (criticResult.pass) break;

            if (shouldRunModifierFromCritic1Reason(criticResult.reason)) {
                output = await runSiliconFlowModifierRemoveCliches(output || '');
            }

            const rewriteUserInput = buildRewriteUserInput(prev_content, curr_context, mergedCriticReason, output);
            output = await callLLM(polishLlmType, systemPrompt, rewriteUserInput, context, { forWriting: true });
        }
```

- **项目已有 streaming 经验**：
  - `strip.ts` 已支持把上游 Dify streaming 直接 `pipe` 给前端（说明部署链路允许长连接/分块）。

```77:100:g:\workspace\next-framework\pages\api\web\aiNoval\chapters\strip.ts
        if (response_mode === 'streaming') {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            const response = await fetch(externalApiUrl, { ... });
            response.body?.pipe(res);
            req.on('close', () => { res.end(); });
        }
```

## 目标与约束（你提出的改进）

- **目标 1**：把 `genChapterBlocking` 拆成可组合的 **原子步骤**（atomic steps）。
- **目标 2**：流程编排由 `ChapterContinueModal.tsx` 控制（前端可暂停/终止/重试/跳步）。
- **目标 3**：每个原子步骤都以 **Streaming 输出**（你选择了 `fetch ReadableStream`）。
- **约束**：保留现有阻塞接口不动，新增 streaming 版本（你选择的策略）。

## 可行性分析（结论）

- **技术可行**：仓库里已存在 SSE 与 streaming pipe 的实践；前端已有“分段编排+多轮 history”模式（`genChapterSegmentMultiTurn`），证明“把大流程拆开并前端驱动”在产品形态上可行。
- **主要难点**（需要在方案里显式处理）：
  - **LLM token streaming**：当前 `callLLM()` 全是 `invoke()` 一次性拿全文；要做到“写作/审稿/改写都流式”，需要把模型调用改为可流式（LangChain `stream()` / 回调），或在步骤层至少做到“阶段进度 streaming + 最终结果一次返回”。若你坚持“每步都应有可见增量内容”，可以把审稿类步骤也做成“实时输出审稿员正在检查…/逐条产出意见”的流（即使底层仍是阻塞，也能先推阶段心跳与阶段开始/结束）。
  - **Next.js API Route 的流式兼容**：需要确保运行时是 Node（不是 Edge），并设置禁用缓冲头（参考 `mcp/sse.ts` 里的 `X-Accel-Buffering: no`）。
  - **中止与资源回收**：前端终止时要 `AbortController`，后端要监听 `req.on('close')` 并停止后续步骤（特别是循环重写）。
  - **状态一致性**：原本后端内循环做“审稿→重写”，拆到前端后，必须定义好“步骤输出结构、上下文输入、失败重试规则”，否则容易出现重试后上下文漂移。

## 原子步骤拆解（建议的 step list）

把现有 `genChapter.ts` 的单体流程拆成以下步骤（每步都可流式输出）：

- **Step A - prepareInputs（前端本地/轻后端）**
  - 拉取关联章节→缩写/汇总→拼 `prev_content`（你现有 `handleContinue()` 已做了 80%）。
  - Streaming：前端直接“边缩写边回显每章摘要的增量”；若要后端流式缩写，也可复用 `/api/aiNoval/chapters/strip?response_mode=streaming` 的模式。
- **Step B - aggregateContext（后端）**
  - 对 `role_group_names/role_names/faction_names/geo_names` 进行 embedding 检索与聚合（现有 `getAggregatedContext()`）。
  - Streaming：先推送阶段事件（开始/进行中/完成）+ 最终 context（通常较短，不一定需要 token 级别流）。
- **Step C - writerDraft（后端）**
  - 用 `buildPromptTemplate()` + `buildUserInput()` 生成初稿。
  - Streaming：对写作模型进行 token streaming，把正文增量直接推给前端（显著改善体验）。
- **Step D - critic2TaskUnderstanding（后端）**
  - 只判定 `OK/MISUNDERSTANDING`。
  - Streaming：可以边输出“检查中…/检查结论”，最终输出结构化结论。
- **Step E - critic1HardCheck（后端）**
  - 产生 `PASS/FAIL + reason`。
  - Streaming：同上（阶段流 + 最终 reason）。
- **Step F - critic3Advice（后端）**
  - 产生“最终建议”（不做 pass/fail）。
  - Streaming：同上。
- **Step G - modifierRemoveCliches（后端，可选）**
  - 依据 critic1 reason 触发（现有 `shouldRunModifierFromCritic1Reason()`）。
  - Streaming：阶段流 + 最终 tuned draft。
- **Step H - rewrite（后端）**
  - 用 `buildRewriteUserInput()` 进行“在糟糕底稿上重写”。
  - Streaming：token streaming 输出改写正文。
- **Step I - loopControl（前端）**
  - 前端根据 Step E 结果决定是否进入 Step G/H，循环最多 `critic_max_rounds`。
  - 前端可提供：暂停/继续、强制接受当前稿、只跑 critic 不重写、调整模型与开关等。



## Streaming 协议（fetch ReadableStream）

- **推荐协议：NDJSON（JSON Lines）**
  - `Content-Type: application/x-ndjson; charset=utf-8`
  - 每行一个 JSON event，例如：
    - `{ "type": "phase", "step": "writerDraft", "status": "start" }`
    - `{ "type": "delta", "step": "writerDraft", "text": "……" }`
    - `{ "type": "result", "step": "writerDraft", "content": "完整正文" }`
    - `{ "type": "error", "step": "critic1", "message": "..." }`
  - 前端用 `fetch()` + `response.body.getReader()` 按行解析，实时更新 UI。
- **取消机制**
  - 前端使用 `AbortController.abort()`。
  - 后端在 `req.on('close')` 时停止后续步骤（至少停止 loop）。

## 代码落地（文件级拆解）

- **新增后端 streaming 端点（不改旧接口）**
  - 在 `pages/api/web/aiNoval/chapters/` 下新增：
    - `genChapterStep.aggregateContext.ts`
    - `genChapterStep.writerDraft.ts`
    - `genChapterStep.critic2.ts`
    - `genChapterStep.critic1.ts`
    - `genChapterStep.critic3.ts`
    - `genChapterStep.modifier.ts`
    - `genChapterStep.rewrite.ts`
  - 每个端点只做一件事：读入上一步产物，流式写出事件。
  - 复用 `genChapter.ts` 内的纯函数：`buildPromptTemplate/buildUserInput/getAggregatedContext/parseCriticResponse/...`，把它们抽到可共享模块（或直接 import 复用，保持行为一致）。
- **新增前端 streaming client**
  - 在 `src/business/aiNoval/chapterManage/apiCalls.ts` 新增 `genChapterStepStream()`（封装 NDJSON 解析、onEvent 回调、AbortController）。
- **改造 `ChapterContinueModal.tsx` 的编排**
  - 将当前单次 `genChapterBlocking()` 改为：
    - 先准备 `prev_content`（保留现有缩写逻辑，后续可再做流式缩写）
    - 按步骤调用后端 streaming step，实时回填 `autoWriteResult/autoWriteStatus/autoWriteError` 与一个新的“步骤面板”（展示每步进度、耗时、产物）
    - 循环控制在前端（依据 critic1 结果与轮次上限）
- **复用既有“分段多轮”模式**
  - 如果你想更快落地体验提升：优先把 Step C/H（写作/改写）做 token streaming；critic 与 context 聚合先做阶段 streaming（即可见进度）。

## 验收标准（可操作）

- 前端点击“开始续写”后：
  - 1s 内能看到至少一个 streaming 事件（进入 `aggregateContext` 或 `writerDraft` 的 start）。
  - 写作正文能逐步出现（不是最终一次性跳出来）。
  - 可随时“终止续写”：前端停止更新，后端停止继续 loop（不再发新事件）。
  - 任一原子步骤失败：前端能明确定位到 step 与错误文本，并允许“从该 step 重试”。

## 风险与回退

- 若某些模型/SDK 无法稳定 token streaming：保持同一接口契约，但让该 step 退化为“阶段 streaming + 最终一次性 result”，不阻塞整体架构推进。
- 旧的 `genChapterBlocking` 完全保留，作为稳定回退路径。

