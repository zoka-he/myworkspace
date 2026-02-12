import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import { IRoleSeed } from "@/src/types/IAiNoval";
import BrainstormService from "@/src/services/aiNoval/brainstormService";
import { createDeepSeekModel } from "@/src/utils/ai/modelFactory";
import { executeReAct } from "@/src/utils/ai/reactAgent";
import { mcpToolRegistry } from "@/src/mcp/core/mcpToolRegistry";
import { parseBrainstorm, buildBrainstormContextSummary, extractFinalAnswerText, stripSeedBlockPreamble } from "@/src/business/aiNoval/brainstormManage/roleIdeationApiUtil";

const LOG_TAG = "[brainstormRoleSeedsGenerate]";
const service = new BrainstormService();

function buildReActSystemPrompt(count: number): string {
  return `你是小说角色构思助手。任务：先使用 MCP 工具查阅世界观相关设定，再根据脑洞信息生成角色种子。

工作步骤（必须按顺序，按需调用工具后再给出 Final Answer）：
1. 调用 worldbook：获取世界观基础设定。
2. 调用 world_state：获取该世界观下的世界态列表。
3. 调用 magic_system：获取该世界观下的魔法、技术系统。
4. 调用 faction_structure：获取势力树结构。
5. 若脑洞或问题中涉及具体势力/地理/角色，可调用 find_faction、find_geo、find_role 按关键词检索。
6. 在收集到足够信息后，给出 Final Answer，不要继续调用工具。

Final Answer 格式要求：
- 直接输出恰好 ${count} 段「角色种子」正文，每段一段话（约 50～150 字），描述一个潜在角色的定位、核心特征、与当前剧情的钩子等；风格可多样（主角、配角、反派、导师等）。
- 段与段之间用单独一行的 "---" 分隔。
- 不要任何解释、标题或前缀（如「好的」「下面」「【角色种子1】」等），Final Answer 的第一行就是第一个种子的内容。

要求：任何需要 worldview_id 的工具调用，必须使用请求中提供的 worldview_id。`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ seeds: IRoleSeed[] }>>
) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const id = req.query.id;
    if (!id || typeof id !== "string") {
      res.status(400).json({ success: false, error: "brainstorm id is required" });
      return;
    }
    const brainstormId = Number(id);
    const body = (req.body || {}) as { count?: number; randomness?: string; adhere_worldview?: boolean };
    const count = Math.min(10, Math.max(1, Number(body.count) || 5));

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
      `请先按需调用 MCP 工具查阅世界观，再在 Final Answer 中直接输出恰好 ${count} 个角色种子，段间用 "---" 分隔，不要任何前言。`,
    ].join("\n");

    const llmOutput = await executeReAct(model, tools, toolExecutor, buildReActSystemPrompt(count), userQuery, {
      maxIterations: 15,
      finalAnswerKeywords: ["---"],
      logTag: LOG_TAG,
      verbose: true,
    });

    const text = extractFinalAnswerText(llmOutput) || llmOutput;
    const blocks = text
      .split(/\n---\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (blocks[0]) blocks[0] = stripSeedBlockPreamble(blocks[0]);

    const seeds: IRoleSeed[] = blocks.slice(0, count).map((content, i) => ({
      id: `ideation_seed_${i}_${Math.random().toString(36).slice(2, 10)}`,
      content,
      edited: false,
    }));

    res.status(200).json({ success: true, data: { seeds } });
  } catch (error: any) {
    console.error(LOG_TAG, error?.message || error);
    res.status(500).json({
      success: false,
      error: error?.message || "生成角色种子失败",
    });
  }
}
