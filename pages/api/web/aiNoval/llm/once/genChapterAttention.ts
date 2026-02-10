import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import { mcpToolRegistry } from "@/src/mcp/core/mcpToolRegistry";
import { executeReAct } from "@/src/utils/ai/reactAgent";
import { createDeepSeekModel } from "@/src/utils/ai/modelFactory";

const LOG_TAG = "[genChapterAttention]";

export interface GenChapterAttentionInput {
  /** 世界观 ID，MCP 工具必填 */
  worldview_id: number;
  /** 本章待写要点（种子提示） */
  curr_context: string;
  /** 角色名称，逗号分隔，可选 */
  role_names?: string;
  /** 阵营名称，逗号分隔，可选 */
  faction_names?: string;
  /** 地理/地点名称，逗号分隔，可选 */
  geo_names?: string;
  /** 章节总体风格（如第一人称、快节奏等），可选 */
  chapter_style?: string;
}

function buildReActSystemPrompt(): string {
  return `你是章节扩写前的「注意事项」生成助手。任务是通过 MCP 查阅世界观、世界态、势力与实体设定，然后根据本章待写要点，产出一份**严格的扩写注意事项**，供后续 AI 扩写本章时逐条遵守。

工作步骤（必须按顺序使用工具收集信息后再给出 Final Answer）：
1. 调用 worldbook：获取世界观基础设定（物理规则、文化基调、禁忌等）。
2. 调用 world_state：获取该世界观下的世界态列表，明确当前可用的宏观状态与边界。
3. 调用 faction_structure：获取势力树结构，了解势力关系与命名规范。
4. 若本章要点或用户填写的「涉及角色」中有具体人名，调用 find_role 按关键词检索，获取角色设定；为了确保角色能够搜索到，每次不宜搜索超过3名角色。
5. 若涉及势力/组织名，调用 find_faction 检索阵营详情（决策禁忌、地理命名规范、意识形态等）。
6. 若涉及地点/地理名，调用 find_geo 检索地理描述与约束。
7. 在收集到足够信息后，给出 Final Answer，不要继续调用工具。

**重要：必须进行逻辑推理（极其重要）**
在生成注意事项前，必须仔细分析「本章待写要点」，进行逻辑推理，识别以下重要信息：
- **角色状态**：角色在本章中的状态（如睡眠、昏迷、受伤、被束缚、不在场等），并据此推理限制（如角色在睡眠时不能发声、不能行动；角色不在场时不能参与对话或行动）。
- **场景限制**：场景环境对角色行为的限制（如密闭空间、危险环境、时间限制等）。
- **逻辑一致性**：识别明显的不一致性（如角色A在某个地点，但要点中要求角色A在另一个地点出现；角色处于某种状态，但要点中要求其执行该状态不允许的行为）。
- **物理/逻辑约束**：基于世界观设定和章节内容，识别物理或逻辑上的约束（如角色能力限制、时间线冲突、空间位置冲突等）。

Final Answer 必须是一份**严格的扩写注意事项**，将直接写入「注意事项」字段。格式要求：

---
【必须遵守】
- 基于你查到的世界观、势力、角色、地理，列出扩写时**必须遵守**的设定（如视角、称谓、地理命名规则、势力立场等），每条要具体、可执行。
- **必须包含基于章节内容的推理结果**：根据「本章待写要点」推理出的角色状态、场景限制、逻辑约束等，明确列出（如"角色X在本章中处于睡眠状态，不得让其发声或执行需要意识清醒的行动"）。

【禁止出现】
- 根据 worldbook/势力/角色的禁忌与设定，明确列出扩写时**不得出现**的内容（如禁止的假设、禁止的称谓、与设定相悖的情节等）。
- **必须包含基于推理的禁止项**：根据角色状态、场景限制等推理出的禁止项（如"角色X在睡眠中，禁止让其说话、思考或执行任何需要意识的行为"；"角色Y不在场，禁止让其参与对话或行动"）。

【语气与风格】
- 若用户提供了「总体风格要求」，在此重申并细化（如第一人称/第三人称、节奏、文风）；若未提供，根据世界观基调给出简短建议。

【与设定一致性】
- 强调扩写内容须与已查到的世界态、势力关系、角色设定保持一致，不得擅自发明未在设定中出现的能力、组织或地名。
- **必须强调逻辑一致性**：扩写时必须严格遵守基于章节内容推理出的角色状态、场景限制等，确保逻辑一致。
---

要求：
- 任何需要 worldview_id 的工具调用，必须使用请求中提供的 worldview_id。
- Final Answer 仅包含上述四部分的正文，不要输出「Final Answer:」或「注意事项：」以外的多余前缀或解释。
- 注意事项表述要**严格、具体、可执行**，避免空泛描述。
- **必须进行逻辑推理**：不要只是罗列设定，必须根据「本章待写要点」进行推理，识别角色状态、场景限制等明显但重要的信息。`;
}

/** 从 LLM 输出中提取 Final Answer 正文 */
function extractFinalAnswerText(raw: string): string {
  const markers = ["Final Answer:", "Final answer:", "final answer:"];
  let text = raw.trim();
  for (const m of markers) {
    const idx = text.indexOf(m);
    if (idx !== -1) {
      text = text.slice(idx + m.length).trim();
      break;
    }
  }
  return text.replace(/^[\s]*注意事项[：:]\s*/i, "").trim();
}

/**
 * POST /api/web/aiNoval/llm/once/genChapterAttention
 * 请求体：GenChapterAttentionInput（含 worldview_id）
 * 返回：{ success, data: { attention: string } }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ attention: string }>>
) {
  if (req.method !== "POST") {
    res.status(405).json({
      success: false,
      error: "Method not allowed, only POST is allowed",
    });
    return;
  }

  try {
    const body = req.body as GenChapterAttentionInput | undefined;
    if (!body || typeof body !== "object") {
      res.status(400).json({
        success: false,
        error: "请求体无效",
      });
      return;
    }

    const worldviewId = Number(body.worldview_id);
    if (!worldviewId || worldviewId < 1) {
      res.status(400).json({
        success: false,
        error: "worldview_id 必填且为正整数",
      });
      return;
    }

    let model;
    try {
      model = createDeepSeekModel({
        model: "deepseek-chat",
        temperature: 0.4,
      });
    } catch (e: any) {
      console.error(LOG_TAG, "DeepSeek 模型初始化失败", e?.message);
      res.status(503).json({
        success: false,
        error: "服务未配置（需配置 DEEPSEEK_API_KEY）",
      });
      return;
    }

    const tools = mcpToolRegistry.getAllToolDefinitions();
    const toolExecutor = async (name: string, args: Record<string, any> | string) => {
      let obj: Record<string, any> = {};
      if (typeof args === "object" && args !== null && !Array.isArray(args)) {
        obj = args;
      } else if (typeof args === "string") {
        try {
          const parsed = JSON.parse(args);
          if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed))
            obj = parsed;
        } catch {
          // ignore
        }
      }
      const finalArgs = { ...obj, worldview_id: worldviewId };
      return await mcpToolRegistry.executeTool(name, finalArgs);
    };

    const systemPrompt = buildReActSystemPrompt();
    const userQuery = [
      "输入：",
      `- 世界观 ID：${worldviewId}`,
      `- 本章待写要点：\n${(body.curr_context || "").trim() || "（未提供）"}`,
      `- 涉及角色（可优先查阅）：${(body.role_names || "").trim() || "（未提供）"}`,
      `- 涉及阵营（可优先查阅）：${(body.faction_names || "").trim() || "（未提供）"}`,
      `- 涉及地理/地点（可优先查阅）：${(body.geo_names || "").trim() || "（未提供）"}`,
      `- 总体风格要求：${(body.chapter_style || "").trim() || "（未提供）"}`,
    ].join("\n");

    console.log(LOG_TAG, "开始 ReAct，工具数:", tools.length);
    const llmOutput = await executeReAct(
      model,
      tools,
      toolExecutor,
      systemPrompt,
      userQuery,
      {
        maxIterations: 15,
        finalAnswerKeywords: ["必须遵守", "禁止出现"],
        logTag: LOG_TAG,
        verbose: true,
      }
    );

    const attention = extractFinalAnswerText(llmOutput || "");
    if (!attention || attention.trim().length < 10) {
      console.warn(LOG_TAG, "注意事项过短或为空，llmOutput 长度:", llmOutput?.length ?? 0);
    }

    res.status(200).json({
      success: true,
      data: { attention: attention || "(未生成有效内容，请查看服务端日志)" },
    });
  } catch (error: any) {
    console.error(LOG_TAG, error?.message || error);
    res.status(500).json({
      success: false,
      error: error?.message || "生成注意事项失败",
    });
  }
}
