import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import { IRoleDraft, IRoleDraftCard, IRoleSeed } from "@/src/types/IAiNoval";
import BrainstormService from "@/src/services/aiNoval/brainstormService";
import { createDeepSeekModel } from "@/src/utils/ai/modelFactory";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { executeReAct } from "@/src/utils/ai/reactAgent";
import { mcpToolRegistry } from "@/src/mcp/core/mcpToolRegistry";
import { parseBrainstorm, buildBrainstormContextSummary, extractFinalAnswerText } from "@/src/business/aiNoval/brainstormManage/roleIdeationApiUtil";

const LOG_TAG = "[brainstormRoleDraftsGenerate]";
const service = new BrainstormService();

const CARD_KEYS = ["name", "gender", "age", "race_or_species", "faction_or_stance", "appearance", "strengths", "weaknesses", "resources", "behavior_style", "personality"];

const GATHER_CONTEXT_SYSTEM_PROMPT = `你是小说世界设定助手。任务：使用 MCP 工具查阅世界观，收集与角色设定相关的信息，在 Final Answer 中输出一份简明摘要。

工作步骤：
1. 按需调用 worldbook、world_state、magic_system、faction_structure、find_faction、find_geo、find_role 等工具。
2. 收集到足够信息后，给出 Final Answer，不要继续调用工具。

Final Answer 格式：输出一份「世界观设定摘要」，供后续生成角色草稿使用。需包含：世界观基调、主要势力/阵营、世界态要点、命名与文化风格等。不要输出「Final Answer:」以外的多余前缀，直接写摘要正文。`;

function extractCardFromText(text: string): IRoleDraftCard {
  const card: IRoleDraftCard = {};
  try {
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const obj = JSON.parse(jsonMatch[0]);
      CARD_KEYS.forEach((k) => {
        if (obj[k] != null && String(obj[k]).trim()) card[k] = String(obj[k]).trim();
      });
    }
  } catch (_) {}
  return card;
}

function extractBackgroundFromText(text: string): string {
  const idx = text.indexOf("---BACKGROUND---");
  if (idx >= 0) return text.slice(idx + "---BACKGROUND---".length).trim();
  const idx2 = text.indexOf("BACKGROUND:");
  if (idx2 >= 0) return text.slice(idx2 + "BACKGROUND:".length).trim();
  return text.trim();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ drafts: IRoleDraft[]; worldview_summary?: string }>>
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
    const body = (req.body || {}) as { seed_ids?: string[]; seeds?: IRoleSeed[]; worldview_summary?: string };
    const seedIds = Array.isArray(body.seed_ids) ? body.seed_ids : [];
    if (seedIds.length === 0) {
      res.status(400).json({ success: false, error: "seed_ids is required and must be non-empty" });
      return;
    }
    const incomingWorldviewSummary = typeof body.worldview_summary === "string" ? body.worldview_summary.trim() : "";

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

    let worldviewSummary = incomingWorldviewSummary;
    if (!worldviewSummary) {
      try {
        const modelForReAct = createDeepSeekModel({ model: "deepseek-chat", temperature: 0.4 });
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
          "【脑洞信息（供参考）】",
          brainstormContext.slice(0, 1500),
          "",
          "请先按需调用 MCP 工具查阅世界观，再在 Final Answer 中输出一份与角色设定相关的世界观摘要。",
        ].join("\n");
        const llmOutput = await executeReAct(modelForReAct, tools, toolExecutor, GATHER_CONTEXT_SYSTEM_PROMPT, userQuery, {
          maxIterations: 12,
          finalAnswerKeywords: ["世界观", "势力", "世界态", "命名"],
          logTag: LOG_TAG,
          verbose: true,
        });
        worldviewSummary = extractFinalAnswerText(llmOutput) || llmOutput;
      } catch (e) {
        console.warn(LOG_TAG, "ReAct gather context failed", e);
      }
    }

    const context = worldviewSummary
      ? "【世界观设定摘要（通过 ReAct+MCP 获取）】\n\n" + worldviewSummary + "\n\n---\n【脑洞信息】\n\n" + brainstormContext
      : brainstormContext;

    const seedsFromBody = Array.isArray(body.seeds) ? body.seeds : [];
    const seedsFromBrainstorm = Array.isArray(parsed.role_seeds) ? parsed.role_seeds : [];
    const seedMap = new Map<string, string>();
    seedsFromBody.forEach((s: IRoleSeed) => seedMap.set(s.id, s.content || ""));
    seedsFromBrainstorm.forEach((s: IRoleSeed) => { if (!seedMap.has(s.id)) seedMap.set(s.id, s.content || ""); });

    const model = createDeepSeekModel({ model: "deepseek-chat", temperature: 0.6 });
    const drafts: IRoleDraft[] = [];

    for (const seedId of seedIds) {
      const seedContent = seedMap.get(seedId) || "（无种子描述）";
      const systemPrompt = `你是小说角色设定助手。根据世界观设定、脑洞与角色种子，生成「角色卡」和「角色背景」。角色需符合世界观（势力、文化、命名等）。
角色卡为 JSON 对象，只包含以下键（均为字符串）：name, gender, age, race_or_species, faction_or_stance, appearance, strengths, weaknesses, resources, behavior_style, personality。未确定的字段可省略。
输出格式：先一行 JSON（角色卡），然后换行写 "---BACKGROUND---"，再写角色背景长文本（出身、经历、与脑洞的关联、角色弧线等）。`;
      const userPrompt = `脑洞与世界观上下文：\n${context}\n\n角色种子：\n${seedContent}\n\n请生成该角色的角色卡（JSON）与角色背景（---BACKGROUND--- 后的长文本）。`;

      const messages = [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)];
      const raw = (await model.invoke(messages)).content;
      const text = typeof raw === "string" ? raw : Array.isArray(raw) ? (raw as any[]).map((c: any) => (typeof c === "string" ? c : c?.text ?? "")).join("") : String(raw ?? "");
      const card = extractCardFromText(text);
      const background = extractBackgroundFromText(text) || "（暂无背景）";
      drafts.push({ seed_id: seedId, card, background });
    }

    res.status(200).json({ success: true, data: { drafts, worldview_summary: worldviewSummary || undefined } });
  } catch (error: any) {
    console.error(LOG_TAG, error?.message || error);
    res.status(500).json({
      success: false,
      error: error?.message || "生成角色草稿失败",
    });
  }
}
