# 脑洞分析前置 LLM 过程 — 设计分析

## 1. 目标与定位

本过程是**脑洞分析流水线的前置阶段**，不直接产出 `IBrainstormAnalysisResult`（影响分析、一致性检查、建议、机会等），而是：

1. **通过 MCP 查阅**：世界观、世界态、阵营等结构化信息；
2. **分析当前脑洞**需要探索的问题方向；
3. **在用户已提出问题的基础上**，补全潜在的相关问题；
4. **为后续“分析 LLM”** 输出**问题的限制性假设**，约束分析时的边界与前提。

因此整体是**两阶段**：

- **本阶段（问题扩展 + 约束生成）**：输入 = 脑洞 + 用户问题；输出 = 扩展问题列表 + 限制性假设（Restrictive Assumptions）；
- **后续阶段（分析 LLM）**：在限制性假设下，对脑洞做影响分析、一致性检查、建议与机会等，产出 `analysis_result`。

---

## 2. 输入与输出定义

### 2.1 输入

| 项 | 来源 | 说明 |
|----|------|------|
| `worldview_id` | 脑洞 / 上下文 | 世界观 ID，所有 MCP 工具必填 |
| 脑洞摘要 | `IBrainstorm` | 至少包含：`title`、`content`、可选 `analysis_direction`、`category`、`tags` |
| 用户提出的问题 | 用户输入或脑洞内显式问题 | 当前希望被回答/探索的“主问题” |
| 关联实体（可选） | `related_faction_ids`、`related_world_state_ids`、`related_geo_codes` 等 | 用于缩小 MCP 检索范围、提示重点 |

### 2.2 输出（建议结构化）

1. **扩展问题列表**  
   - 用户主问题 + 补全的潜在问题（与世界观/世界态/阵营/情节一致性等相关）。  
   - 可带简短理由（为何该问题与当前脑洞相关）。

2. **限制性假设（Restrictive Assumptions）**  
   供后续分析 LLM 使用的约束，例如：
   - **范围假设**：分析仅针对哪些阵营、哪些世界态、哪段时间线或地理范围；
   - **视角假设**：从哪个势力/角色视角看“影响”与“一致性”；
   - **禁止假设**：明确哪些事情“在本次分析中不讨论”或“视为不成立”；
   - **问题边界**：每个扩展问题对应的前提或边界，避免分析 LLM 过度泛化。

输出格式可以是 JSON（便于后续 API 直接消费），例如：

```json
{
  "expanded_questions": [
    { "question": "...", "source": "user|derived", "reason": "..." }
  ],
  "restrictive_assumptions": {
    "scope": { "factions": [...], "world_states": [...], "geo_or_timeline": "..." },
    "perspective": "...",
    "forbidden_assumptions": ["..."],
    "per_question_scope": { "question_id_or_index": "..." }
  }
}
```

也可先以“Final Answer”自然段形式输出，再由轻量解析或二次 LLM 抽成上述结构。

---

## 3. 过程设计：步骤与 MCP 使用

### 3.1 步骤概览

1. **查阅世界观（worldbook）**  
   - 调用 `worldbook`，传入 `worldview_id`。  
   - 目的：获得基础设定（物理、规则、文化基调），避免后续“补全问题”和“限制性假设”与世界观冲突。

2. **检索世界态（world_state）**  
   - 调用 `world_state`，同一 `worldview_id`，可按需传 `state_type`、`status`、`impact_level`。  
   - 若脑洞已带 `related_world_state_ids`，可在拿到列表后做过滤或高亮，用于“与哪些世界态相关”的假设。  
   - 目的：明确当前世界处于哪些宏观状态，问题补全与约束应落在哪些世界态范围内。

3. **分析阵营（faction_structure + find_faction）**  
   - `faction_structure`：获取势力树，了解阵营层级与名称。  
   - `find_faction`：若脑洞有关键词或 `related_faction_ids` 对应名称，用关键词检索相关阵营，获取描述与关系。  
   - 目的：补全“与哪些阵营相关”的问题，并写出范围假设（如“仅讨论 A、B 两阵营”）、视角假设（如“从 A 阵营视角”）。

4. **分析当前脑洞需要探索的问题**  
   - 基于：脑洞 title/content/analysis_direction、用户主问题、已获取的世界观/世界态/阵营信息。  
   - 输出：  
     - 当前脑洞**可能需要探索的问题**的列表（可合并到下面的“扩展问题”中）；  
     - 与“用户主问题”的关系（主问题 vs 衍生问题）。

5. **补全潜在问题**  
   - 在用户已提出问题的基础上，结合世界观/世界态/阵营，补全：  
     - 与一致性相关（与世界态、与阵营设定是否矛盾）；  
     - 与影响相关（对哪些势力、哪些世界态有影响）；  
     - 与情节/角色/地理相关（若脑洞涉及）。  
   - 每条可标 `source: user | derived` 及简短 `reason`。

6. **生成限制性假设**  
   - 为**后续分析 LLM** 写清：  
     - **范围**：本次分析涉及哪些阵营、世界态、地理/时间线（可引用 MCP 返回的 id 或名称）；  
     - **视角**：若适用，固定为某阵营或某类角色视角；  
     - **禁止假设**：明确“不可默认”的事项（避免分析 LLM 擅自扩展设定）；  
     - **每问题边界**：若某扩展问题只针对某子集（如只针对某世界态），在 `per_question_scope` 中注明。

7. **结构化输出**  
   - 将“扩展问题列表”与“限制性假设”按约定格式输出（如上面的 JSON 或自然段 + 小节标题），便于后续 API 或分析 LLM 的 system prompt 使用。

### 3.2 MCP 调用顺序建议

- **必选**：`worldbook` → `world_state`（至少各一次，建立基线）。  
- **必选**：`faction_structure`（阵营全图）。  
- **按需**：`find_faction`（当脑洞或用户问题中明显涉及某势力名/关键词时）。  
- **可选**：若脑洞强依赖地理或角色，可再调用 `find_geo` / `find_role`，以便在“限制性假设”中写清地理/角色范围。

顺序上建议：先 worldbook → world_state → faction_structure，再根据内容决定是否 find_faction / find_geo / find_role；这样 LLM 在“补全问题”和“写限制性假设”时已有完整上下文。

### 3.3 与现有实现的对照

- **MCP 工具**：`worldbook`、`world_state`、`faction_structure`、`find_faction` 等已存在，本过程只需在 ReAct 的 system prompt 中明确“必须为脑洞分析做世界观/世界态/阵营的查阅”。  
- **ReAct 模式**：可复用 `executeReAct` + `mcpToolRegistry` 的模式（参考 `minifyWorldRule`），工具执行时自动注入 `worldview_id`（从脑洞或请求体传入）。  
- **脑洞分析 API**：当前 `analyzeBrainstorm` 仍为“待实现”；本设计是“前置阶段”，后续可增加一档“仅做问题扩展+约束”的 API，或与“分析 LLM”组合成一条流水线（先调本过程拿假设与问题列表，再调分析 LLM 时把假设写入 system prompt）。

---

## 4. 限制性假设（Restrictive Assumptions）的用途

- **给后续分析 LLM 的 system prompt**：把 `restrictive_assumptions` 写进 system，例如“本次分析仅考虑以下阵营：…；仅针对以下世界态：…；不得假设…”。  
- **减少幻觉与泛化**：分析 LLM 只在这些边界内做影响分析、一致性检查、建议与机会，避免脱离设定乱发挥。  
- **可追溯**：假设与脑洞、用户问题、MCP 检索结果绑定，便于以后解释“分析是在什么前提下做的”。

---

## 5. 实现时可选的技术点

1. **ReAct 与工具集**  
   - 与 `minifyWorldRule` 类似：固定或传入 `worldview_id`，注册现有 MCP 工具，用 `executeReAct` 驱动；system prompt 中明确“步骤：先 worldbook、world_state、faction_structure，再根据脑洞内容决定是否 find_faction/…”。

2. **输出解析**  
   - 若 LLM 直接输出 JSON：可约定格式后 `JSON.parse` + 校验。  
   - 若输出自然段：可用小模型或正则抽取“扩展问题”与“限制性假设”小节，再转为结构化数据；或由后续分析 LLM 的 prompt 直接引用整段。

3. **与脑洞分析流水线衔接**  
   - 方案 A：单独 API，例如 `POST /api/web/aiNoval/llm/once/brainstormExpandQuestions`，请求体含 `brainstorm_id` 或脑洞摘要 + 用户问题，返回扩展问题 + 限制性假设；前端或后端再调“分析 LLM”时带入这些结果。  
   - 方案 B：分析 API 内部先调本过程，再把得到的假设写入分析 LLM 的 system prompt，一次请求完成“扩展+约束+分析”。

4. **错误与降级**  
   - 若某次 MCP 调用失败（如 world_state 超时）：可在 prompt 中允许 LLM 在“部分信息缺失”下仍输出假设，并标记“未包含世界态”等，供后续分析时谨慎使用。

---

## 6. 小结

| 维度 | 建议 |
|------|------|
| **角色** | 脑洞分析的前置阶段：问题扩展 + 约束生成，不直接产出 analysis_result |
| **输入** | worldview_id、脑洞摘要、用户提出的问题、可选关联实体 |
| **输出** | 扩展问题列表 + 限制性假设（范围/视角/禁止/每问题边界） |
| **MCP** | worldbook → world_state → faction_structure，按需 find_faction / find_geo / find_role |
| **执行模式** | ReAct + 现有 MCP 工具，与 minifyWorldRule 类似 |
| **与后续分析** | 限制性假设写入分析 LLM 的 system prompt，约束其回答范围与前提 |

按上述设计，先实现“前置 LLM 过程”并定义好输入输出与 MCP 调用顺序，再在实现分析 LLM 时把“限制性假设”接入 system prompt 即可形成完整脑洞分析流水线。
