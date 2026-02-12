import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import { IRoleSeed } from "@/src/types/IAiNoval";
import BrainstormService from "@/src/services/aiNoval/brainstormService";
import { createDeepSeekModel } from "@/src/utils/ai/modelFactory";
import { executeReAct } from "@/src/utils/ai/reactAgent";
import { mcpToolRegistry } from "@/src/mcp/core/mcpToolRegistry";
import { parseBrainstorm, buildBrainstormContextSummary, extractFinalAnswerText, stripSeedBlockPreamble } from "@/src/business/aiNoval/brainstormManage/roleIdeationApiUtil";

const LOG_TAG = "[brainstormRoleSeedsReroll]";
const service = new BrainstormService();

const REROLL_SYSTEM_PROMPT = `你是小说角色构思助手。任务：先使用 MCP 工具查阅世界观相关设定，再根据脑洞与当前种子重新生成一个「角色种子」。

工作步骤：
1. 按需调用 worldbook、world_state、magic_system、faction_structure、find_faction、find_geo、find_role 等工具查阅世界观。
2. 收集到足够信息后，给出 Final Answer，不要继续调用工具。

Final Answer 格式：只输出一段话，即新的角色种子内容（约 50～150 字），描述一个潜在角色的定位、核心特征、与剧情的钩子。不要任何解释或前缀（如「好的」「下面」等），Final Answer 的第一行就是种子正文。要求与当前种子风格或角度有所区分。`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<IRoleSeed>>
) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const id = req.query.id;
    const seedId = req.query.seedId;
    if (!id || typeof id !== "string" || !seedId || typeof seedId !== "string") {
      res.status(400).json({ success: false, error: "id and seedId are required" });
      return;
    }
    const brainstormId = Number(id);

    const brainstorm = await service.getBrainstormById(brainstormId);
    if (!brainstorm) {
      res.status(404).json({ success: false, error: `Brainstorm not found, id: ${brainstormId}` });
      return;
    }

    const parsed = parseBrainstorm(brainstorm);
    const brainstormContext = buildBrainstormContextSummary(parsed);
    const worldviewId = parsed.worldview_id != null ? Number(parsed.worldview_id) : 0;
    if (worldviewId < 1) {
      res.status(400).json({ success: false, error: "brainstorm 缺少 worldview_id，无法通过 MCP 查阅世界观" });
      return;
    }

    const seeds = Array.isArray(parsed.role_seeds) ? parsed.role_seeds : [];
    const current = seeds.find((s: IRoleSeed) => s.id === seedId);
    const currentContent = current?.content ? `当前种子内容：${current.content}` : "";

    const model = createDeepSeekModel({ model: "deepseek-chat", temperature: 0.8 });
    const tools = mcpToolRegistry.getAllToolDefinitions();
    const toolExecutor = async (name: string, args: Record<string, any> | string) => {
      let obj: Record<string, any> = {};
      if (typeof args === "object" && args != null && !Array.isArray(args)) obj = args;
      else if (typeof args === "string") {
        try {
          const parsed = JSON.parse(args);
          if (typeof parsed === "object" && parsed != null && !Array.isArray(parsed)) obj = parsed;
        } catch { /* ignore */ }
      }
      return await mcpToolRegistry.executeTool(name, { ...obj, worldview_id: worldviewId });
    };

    const userQuery = [
      `世界观 ID：${worldviewId}`,
      "",
      "【脑洞信息】",
      brainstormContext,
      "",
      currentContent,
      "",
      "请先按需调用 MCP 工具查阅世界观，再在 Final Answer 中直接输出一段话（新种子），不要任何前言。",
    ].join("\n");

    const llmOutput = await executeReAct(model, tools, toolExecutor, REROLL_SYSTEM_PROMPT, userQuery, {
      maxIterations: 12,
      logTag: LOG_TAG,
      verbose: true,
    });

    let content = extractFinalAnswerText(llmOutput) || llmOutput;
    content = stripSeedBlockPreamble(content.trim());

    const seed: IRoleSeed = { id: seedId, content: content || "（生成失败，请重试）", edited: false };
    res.status(200).json({ success: true, data: seed });
  } catch (error: any) {
    console.error(LOG_TAG, error?.message || error);
    res.status(500).json({
      success: false,
      error: error?.message || "重骰种子失败",
    });
  }
}
