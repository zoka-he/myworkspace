# ChapterContinueModal 新设计：MCP + 自动分段续写 + 流程可控

## 一、目标与 PRD 约定

- **组件形态**：采用**方案 B**，新建独立组件 `ChapterContinueSegmentedModal`，与现有 `ChapterContinueModal` 并列入口（如 Tab 切换）。
- **分段先回显、用户确认后再写**：先生成**分段提纲**并回显，用户确认后再按提纲逐段生成正文；流程可控、意图可预期。
- **MCP 集成**：续写前可选用 MCP 工具（worldbook、world_state、find_role、find_faction、find_geo、faction_structure 等）收集设定。
- **自动分段**：按段生成，每段 500–800 字（可配置），避免 deepseek-chat 单次输出 16K 限制。
- **自动续接**：每段严格接着上一段末尾续写，并可结合当前段提纲要点，保证衔接与不跑题。
- **流程可控**：用户可看到阶段与进度，支持**暂停**、**继续**、**停止**。
- **避免段落开头重复交代世界观**：现有单次续写常出现「每段开头再次声明世界观/时代背景/故事前提」的重复感。新模块通过**提纲约束 + 单段续写指令**一并解决：提纲阶段避免把「交代世界观」拆成多段重复要点，写作阶段明确禁止在本段开头重述背景，只接上一段末尾情境继续写。
- **注意事项支持由 AI 生成**：在表单中「注意事项」字段旁提供「AI 生成」入口；用户点击后，根据当前章节风格、要点、角色/阵营/地理等上下文，由 LLM 生成一段扩写注意事项（如语气、禁忌、侧重点），回填到注意事项输入框，用户可编辑后使用。

---

## 二、整体流程（状态机）

**约定**：采用**方案 B**，新建独立组件 `ChapterContinueSegmentedModal`；分段**先回显提纲、用户确认后再开始写**。

```
idle
  │
  │ 用户点击「生成分段提纲」
  ▼
[可选] mcp_gathering ──► 调用 MCP 收集设定，得到 mcpContext
  │
  ▼
segment_planning ──► 调用接口生成分段提纲（每段要点），得到 segmentOutlineList
  │
  ▼
awaiting_confirmation
  │  回显分段提纲（第 1 段：…，第 2 段：…，…），用户可查看、修改或确认
  │  用户点击「确认并开始续写」
  ▼
writing_segment (segmentIndex = 1, 2, 3, …)
  │  按提纲逐段：请求 genChapterSegment → 拼接到 segmentedContent
  │  用户点击「暂停」 → 本段完成后置为 paused
  │  用户点击「停止」 → 立即 abort，保留当前 segmentedContent
  │  达到提纲段数或模型输出结束标记 → done
  ▼
paused ──用户点击「继续」──► writing_segment (从下一段继续)
  │
  ▼
done / error
```

- **idle**：初始或续写结束/出错后。
- **mcp_gathering**：仅当「使用 MCP 收集设定」开启时存在；展示「正在通过 MCP 收集设定…」。
- **segment_planning**：生成分段提纲中；展示「正在生成分段提纲…」。
- **awaiting_confirmation**：分段提纲已回显，等待用户确认；展示提纲列表 + 按钮「确认并开始续写」「取消」。
- **writing_segment**：按提纲逐段写正文；展示「续写第 N 段」；可「暂停」或「停止」。
- **paused**：已暂停，已写内容保留；可「继续」或「停止」。
- **done**：全部段写完或命中结束标记；**error**：任一步骤报错。

---

## 三、前端状态与数据结构（ChapterContinueSegmentedModal）

组件为**新建独立 Modal**（方案 B），以下状态仅在该组件内使用。

### 3.1 配置

| 状态/配置 | 类型 | 说明 |
|-----------|------|------|
| `useMcpContext` | `boolean` | 是否先通过 MCP 收集设定。 |
| `segmentTargetChars` | `number` | 每段目标字数，如 600。 |
| `maxSegments` | `number` | 最大段数（提纲生成时的上限），如 20。 |
| `stopMarker` | `string` | 模型输出中视为「本章结束」的标记，如 `[本章完]`，可选。 |

### 3.2 流程控制与回显

| 状态 | 类型 | 说明 |
|------|------|------|
| `phase` | `'idle' \| 'mcp_gathering' \| 'segment_planning' \| 'awaiting_confirmation' \| 'writing_segment' \| 'paused' \| 'done' \| 'error'` | 当前阶段。 |
| `segmentOutlineList` | `Array<{ index: number, outline: string }>` | **分段提纲**（先回显）：每段要点，用户确认前可查看/编辑。 |
| `segmentIndex` | `number` | 当前写到第几段（从 1 开始）。 |
| `mcpContext` | `string` | MCP 阶段得到的设定文本。 |
| `segmentedContent` | `string` | 已生成的正文（各段拼接结果）。 |
| `segmentProgress` | `{ segmentIndex, status, chunk? }` | 当前段进度，用于展示「第 N 段生成中」。 |
| `pauseRequested` | `boolean` | 用户点了「暂停」，本段完成后不再请求下一段。 |
| `abortController` | `AbortController \| null` | 用于「停止」时取消当前请求。 |

### 3.3 与现有数据的衔接

- 复用表单数据：`selectedChapter`、`seedPrompt`、`roleNames`、`factionNames`、`geoNames`、`attention`、`extraSettings`、`llmType`、`stripReportList`（前情缩写）、`promptWorkMode` / `selectedPromptParts` 等。
- 最终生成的 `segmentedContent` 可提供复制、保存（与现有章节保存逻辑一致）。

---

## 四、API 设计

### 4.1 MCP 收集设定（新增）

- **路径**：`POST /api/aiNoval/chapters/collectChapterContext`（或放在 `llm/once` 下如 `collectChapterContext.ts`）。
- **入参**：`worldview_id`（必填）、`curr_context`（本章待写要点）、`prev_content_summary`（可选，前情摘要，控制 token）、`role_names` / `faction_names` / `geo_names`（可选，给 ReAct 的提示，便于优先查这些实体）。
- **逻辑**：复用 `mcpToolRegistry` + `executeReAct`，系统提示要求根据 `curr_context` 与可选前情摘要，按需调用 worldbook、world_state、find_role、find_faction、find_geo、faction_structure 等，输出「本章写作可用的设定摘要」。
- **返回**：`{ success, data: { context: string } }` 或 `{ context: string }`，供后续 `genChapterSegment` 使用。

#### 4.1.1 mcp_gathering 实现思路

前端在用户点击「生成分段提纲」且勾选「使用 MCP 收集设定」时，先请求本接口；请求期间 UI 处于 `mcp_gathering`，展示「正在通过 MCP 收集设定…」。后端实现可完全对齐现有 `brainstormExpandQuestions`，仅改系统提示与 Final Answer 用途。

1. **复用组件**
   - `mcpToolRegistry.getAllToolDefinitions()` 获取工具列表（worldbook、world_state、find_faction、find_geo、find_role、faction_structure、resolve_entity 等）。
   - `executeReAct(model, tools, toolExecutor, systemPrompt, userQuery, options)` 跑 ReAct 循环。
   - 模型：`createDeepSeekModel({ model: "deepseek-chat", temperature: 0.5 })`（与脑洞分析一致，保证工具调用稳定）。

2. **工具执行器（toolExecutor）**
   - 与脑洞分析一致：每次执行前将请求体中的 `worldview_id` 注入到工具参数中（`finalArgs = { ...obj, worldview_id: worldviewId }`），避免模型漏填或填错。

3. **系统提示（systemPrompt）**
   - 角色：本章续写前的**设定收集助手**，任务是根据「本章待写要点」和（可选）前情摘要，通过 MCP 查阅世界观与实体，输出一段**本章写作可用的设定摘要**，供后续分段提纲与逐段写作使用。
   - 建议步骤（与 brainstrom 类似，按需调整顺序）：
     1. 调用 **worldbook**：获取世界观基础设定（物理、规则、文化基调）。
     2. 调用 **world_state**：获取该世界观下的世界态列表。
     3. 调用 **faction_structure**：获取势力树结构。
     4. 若本章要点或表单中涉及势力/组织名，调用 **find_faction** 按关键词检索。
     5. 若涉及地理/地点名，调用 **find_geo** 检索。
     6. 若涉及角色名，调用 **find_role** 检索。
     7. 收集足够后给出 Final Answer，不再调用工具。
   - 约束：所有需要 `worldview_id` 的工具必须使用请求中提供的 `worldview_id`；Final Answer 仅输出设定摘要正文，不要多余前缀或解释。

4. **用户查询（userQuery）**
   - 拼接：世界观 ID、本章待写要点（`curr_context`）、前情摘要（`prev_content_summary` 若有）、表单中的角色/势力/地理名（若有，作为「可优先查阅的实体」提示）。若 `prev_content_summary` 较长，可截断或先做摘要再放入，控制 token。

5. **ReAct 参数**
   - `maxIterations`：如 15，避免死循环。
   - `finalAnswerKeywords`：如 `["角色", "阵营", "世界观"]` 或一段能表征「设定摘要」的短语，用于判断何时视为 Final Answer；或仅用 `Final Answer:` 检测。
   - `logTag`：便于日志排查。

6. **输出解析与返回**
   - 从 ReAct 最后一轮 LLM 输出中提取 Final Answer 正文（去掉 "Final Answer:" 及前缀），作为 `context` 字符串。
   - 若提取结果过短或为空，可退回：返回空字符串或带提示的占位，由下游 genChapterSegmentOutline / genChapterSegment 在无 `mcp_context` 时回退到表单聚合 context。

7. **错误与超时**
   - 超时或 ReAct 异常时返回 5xx 或 `{ success: false, error: message }`，前端将 `phase` 置为 `error`，并提示用户可关闭 MCP 后重试（仅用表单设定生成提纲）。

### 4.2 分段提纲（新增）— 先回显，用户确认后再写

- **路径**：`POST /api/aiNoval/chapters/genChapterSegmentOutline`。
- **入参**：与 4.1、4.3 对齐的上下文（`worldview_id`、`curr_context`、`prev_content` 或摘要、`mcp_context?`、`role_names` 等），以及 `max_segments`、`segment_target_chars`（每段目标字数，用于提纲中的长度提示）。
- **逻辑**：根据前情 + 本章要点，生成「分段提纲」：每段一条简短要点（如「第 1 段：xxx；第 2 段：xxx；…」），便于用户一眼看清本章将如何分段、每段写什么。输出格式需约定为可解析结构（如 JSON 数组 `[{ "index": 1, "outline": "…" }, …]` 或按行/按标记解析的纯文本）。
- **返回**：`{ success, data: { outlines: Array<{ index: number, outline: string }> } }`。前端收到后**回显**为列表，进入 `awaiting_confirmation`，用户确认后再进入逐段写作。
- **避免重复交代世界观（提纲侧）**：系统提示中约定：若前情/本章要点里已包含世界观或背景，**仅在首段**可写「承接前情/点明场景」类要点；第 2 段及以后的要点必须是**具体情节、动作、对话、冲突**等，不得再写「交代世界观」「介绍时代背景」「说明故事前提」等重复性描述。这样从提纲层面就避免「每段开头都在交代世界观」的结构。

### 4.3 单段续写（新增）

- **路径**：`POST /api/aiNoval/chapters/genChapterSegment`。
- **入参**（与现有 genChapter 对齐并扩展）：
  - `worldview_id`、`llm_type`、`attention`、`extra_settings`；
  - `curr_context`：本章待写要点（种子提示）；
  - `prev_content`：前情（可做裁剪或摘要，建议按 16K 预算截断或只传最近若干字）；
  - `role_names`、`faction_names`、`geo_names`（表单值，用于 fallback 或与 MCP 结果合并）；
  - **新增**：`mcp_context?: string`（若走了 MCP 阶段则传入）；
  - **新增**：`segment_index: number`、`previous_content_snippet: string`（上一段末尾的 N 句或最近约 800 字，用于续接）；
  - **新增**：`current_segment_outline?: string`（本段在提纲中的要点，确认后再写时传入）；
  - **新增**：`segment_target_chars?: number`（如 600，提示模型本段长度）。
- **逻辑**：
  - 与 genChapter 类似：若无 `mcp_context` 则仍用现有 findRole/findFaction/findGeo 聚合 context；若有 `mcp_context` 则与表单聚合结果合并（或仅用 mcp_context，视产品决定）。
  - 系统提示在现有扩写指令基础上增加：「严格接着上一段最后一句续写，保持人称、时态、风格一致；本段约 N 字；仅输出本段正文，不要重复前文。」
  - **禁止段落开头重复交代世界观**：在系统提示或注意事项中明确写——**不得在本段开头再次交代世界观、时代背景、故事前提或前情总览**；前情与设定已在【前情】和【相关设定】中提供，读者已知。本段应直接接着「已写内容末尾」的情境（动作/对话/心理/环境）继续写，不要以「在这个世界里…」「故事发生在…」「如前所述…」等句式起头，除非提纲明确要求本段做一次性的场景锚定。
  - user 消息格式示例：「【前情】… \n【本章待写要点】… \n【已写内容末尾】… \n 请接着以上内容写下一段（约 N 字）。」
  - 对 `previous_content_snippet` 做长度上限（如按字符或 token 估算），避免总输入超 16K。
- **返回**：与现有 genChapter 一致，如 `{ data: { outputs: { output }, status, error }, elapsed_time }`，其中 `output` 为本段正文；可选解析 `stopMarker` 并返回 `ended: true`。

这样**自动续接**由「上一段末尾 + 本段提纲要点 + 明确指令」在单段接口内完成，前端只负责拼接和轮次控制；**避免段落开头重复世界观**通过提纲约束 + 本段写作禁令在新模块中一并落实。

### 4.4 前端调用顺序（分段流程）

1. 用户点击「生成分段提纲」→ 若 `useMcpContext`：`await collectChapterContext(...)` → 得到 `mcpContext`。
2. `await genChapterSegmentOutline(...)` → 得到 `segmentOutlineList`，设 `phase = 'awaiting_confirmation'`，**回显提纲**（列表展示每段要点）。
3. 用户查看/可编辑提纲后，点击「确认并开始续写」→ `phase = 'writing_segment'`，从 `segmentIndex = 1` 开始。
4. 循环（直到 `segmentIndex > segmentOutlineList.length` 或 本段返回 `ended` 或 用户暂停/停止）：
   - `previous_content_snippet = segmentedContent.slice(-snippetMaxChars)`（如取最后 800 字）；
   - `current_segment_outline = segmentOutlineList[segmentIndex - 1]?.outline`；
   - `res = await genChapterSegment(..., { segment_index: segmentIndex, previous_content_snippet, current_segment_outline, mcp_context })`；
   - 若 `res.data.status === 'error'` 则设 `phase = 'error'` 并退出；
   - 否则 `segmentedContent += res.data.outputs.output`，并检查是否包含 `stopMarker`；
   - 若用户已点「暂停」则设 `phase = 'paused'` 并退出循环；若用户已点「停止」则 `abortController.abort()` 并退出，保留当前 `segmentedContent`。
5. 正常结束或暂停/停止后，将 `segmentedContent` 展示并可复制/保存。

---

## 五、前端组件：方案 B（采用）

**采用方案 B**：新建独立组件 `ChapterContinueSegmentedModal.tsx`，与现有 `ChapterContinueModal` 并列；入口处用 Tab 或切换（如「经典续写」|「分段续写」）选择展示哪个 Modal。现有 `ChapterContinueModal` 不改动。

### 5.1 组件职责

- 仅实现「分段 + MCP + 先回显提纲、用户确认后再写」流程；状态见第三节。
- 表单与现有尽量复用：角色/势力/地理、种子提示词、注意事项、LLM、关联章节缩写、每段字数、最大段数、是否使用 MCP 等。

### 5.2 UI 要点（含分段回显与确认）

- **idle**：主按钮「生成分段提纲」；配置区：使用 MCP、每段字数、最大段数等；表单中**注意事项**旁提供「AI 生成」按钮，点击后请求接口生成注意事项并回填，用户可编辑。
- **mcp_gathering / segment_planning**：展示「正在通过 MCP 收集设定…」或「正在生成分段提纲…」。
- **awaiting_confirmation（回显）**：
  - **分段提纲回显**：列表或卡片展示 `segmentOutlineList`（第 1 段：xxx；第 2 段：xxx；…），支持只读或简单编辑（如可改某段要点文案）。
  - **操作**：「确认并开始续写」「取消」（取消则回到 idle，可重新生成提纲）。
- **writing_segment**：展示「续写第 {segmentIndex} 段」；按钮「暂停」「停止」；实时展示已生成的 `segmentedContent`。
- **paused**：展示「已暂停」；按钮「继续」「停止」。
- **done / error**：展示「已完成」或错误信息；已写内容可复制、保存。

---

## 六、流程可控性小结

| 需求 | 实现方式 |
|------|----------|
| 可见性 | 通过 `phase` + `segmentIndex` 展示当前阶段与段数。 |
| 暂停 | 用户点「暂停」设 `pauseRequested = true`，当前段请求完成后不再发起下一段，`phase = 'paused'`。 |
| 继续 | 用户点「继续」从 `segmentIndex + 1` 再进入 `writing_segment` 循环。 |
| 停止 | 使用 `AbortController` 取消当前 fetch，立即退出循环，保留当前 `segmentedContent`。 |
| 结束条件 | 达到 `maxSegments` 或本段输出包含 `stopMarker` 时置 `phase = 'done'`。 |

---

## 七、后端需新增/修改

1. **新增** `collectChapterContext`：ReAct + MCP，输入 worldview_id、curr_context、可选前情摘要与实体名，输出设定文本。
2. **新增** `genChapterSegmentOutline`：根据前情 + 本章要点（及可选 mcp_context）生成分段提纲，返回 `outlines: Array<{ index, outline }>`，供前端回显与用户确认。
3. **新增** `genChapterSegment`：在现有 genChapter 基础上接受 `mcp_context`、`segment_index`、`previous_content_snippet`、`current_segment_outline`、`segment_target_chars`，构造「续接 + 按提纲」型 prompt，返回单段正文；对 `previous_content_snippet` 做长度限制。
4. **新增（可选）** `genChapterAttention` 或 `genAttention`：根据本章待写要点（curr_context）、角色/阵营/地理、总体风格等，由 LLM 生成一段「扩写注意事项」文本，供前端回填到注意事项输入框；单次调用、使用MCP，可与现有 pick/优化类接口类似。
5. **可选**：在 genChapter 或公共层对 `prev_content` 做按 16K 的裁剪/摘要，供提纲与单段接口复用。

---

## 八、实现顺序建议

1. 后端实现 `genChapterSegmentOutline`：输入与前情/本章一致，输出结构化分段提纲。
2. 后端实现 `genChapterSegment`（先可不带 mcp_context、current_segment_outline），保证单段续接与长度控制。
3. 前端实现 **ChapterContinueSegmentedModal**（新建组件）：先实现「生成提纲 → 回显提纲 → 用户确认 → 逐段写作」流程，含暂停/继续/停止与进度展示。
4. 后端实现 `collectChapterContext`，前端增加「使用 MCP」选项并接入；`genChapterSegment` 支持 `mcp_context` 与 `current_segment_outline`。
5. **注意事项 AI 生成**：后端实现 `genChapterAttention`（或等价接口），前端在注意事项旁增加「AI 生成」按钮并调用，将返回文本回填到注意事项输入框。
6. 可选：prev_content 裁剪与 16K 预算控制。

按此设计即可在保证流程可控的前提下，实现**分段先回显、用户确认后再写**，并结合 MCP、自动分段、自动续接与**注意事项 AI 生成**，突破 16K 输出限制。
