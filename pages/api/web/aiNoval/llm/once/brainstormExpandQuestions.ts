import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import { mcpToolRegistry } from "@/src/mcp/core/mcpToolRegistry";
import { executeReAct } from "@/src/utils/ai/reactAgent";
import { createDeepSeekModel } from "@/src/utils/ai/modelFactory";

export interface BrainstormExpandQuestionsInput {
    /** 世界观 ID，所有 MCP 工具必填 */
    worldview_id: number;
    /** 脑洞标题 */
    title: string;
    /** 脑洞内容 */
    content: string;
    /** 用户已提出的问题或当前分析方向（可选），将在此基础上补全 */
    analysis_direction?: string;
}

export interface BrainstormExpandQuestionsOutput {
    /** 可直接写入「分析方向」的完整文本：扩展问题 + 限制性假设 */
    analysis_direction: string;
}

const LOG_TAG = "[brainstormExpandQuestions]";

function buildReActSystemPrompt(): string {
    return `你是脑洞分析的前置助手。任务是通过 MCP 查阅世界观、世界态、阵营，然后基于用户给出的脑洞和（若有）已有问题，产出「扩展问题」与「限制性假设」，供后续分析 LLM 使用。

工作步骤（必须按顺序使用工具收集信息后再给出 Final Answer）：
1. 调用 worldbook：获取世界观基础设定（物理、规则、文化基调）。
2. 调用 world_state：获取该世界观下的世界态列表，了解当前有哪些宏观状态。
3. 调用 faction_structure：获取势力树结构。
4. 若脑洞内容或用户问题中涉及具体势力/组织名称，可调用 find_faction 按关键词检索相关阵营详情。
5. 若脑洞内容或用户问题中涉及具体地理/地点名称，可调用 find_geo 按关键词检索相关地理详情。
6. 若脑洞内容或用户问题中涉及具体角色名称，可调用 find_role 按关键词检索相关角色详情。
7. 在收集到足够信息后，给出 Final Answer，不要继续调用工具。

Final Answer 必须是一段完整文本，将直接写入脑洞的「分析方向」字段，供后续分析使用。格式要求：

---
【扩展问题】
- 列出用户已提出的问题（若输入中有 analysis_direction，则视为用户问题）。
- 在此基础上补全与当前脑洞相关的潜在问题（如：与世界观/世界态/阵营的一致性、影响范围、情节逻辑等），每条可简要说明理由。

【限制性假设】
- 范围：本次分析应限定的阵营、世界态、地理或时间线（根据你查到的信息具体写出名称或 ID）。
- 视角：若适用，固定从某一势力或角色视角进行分析。
- 禁止假设：明确后续分析中「不得默认」的事项，避免过度泛化。
- 问题边界：若某问题仅针对某一子集（如某一世界态），在此说明。
---

要求：
- 任何需要 worldview_id 的工具调用，必须使用请求中提供的 worldview_id。
- Final Answer 仅包含上述【扩展问题】与【限制性假设】两部分的正文，不要输出「Final Answer:」以外的多余前缀或解释。`;
}

/** 从 LLM 输出中提取 Final Answer 正文（去掉 "Final Answer:" 及前缀空白） */
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
    return text;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<BrainstormExpandQuestionsOutput>>
) {
    if (req.method !== "POST") {
        res.status(405).json({
            success: false,
            error: "Method not allowed, only POST is allowed",
        });
        return;
    }

    try {
        const body = req.body as BrainstormExpandQuestionsInput | undefined;
        console.log(LOG_TAG, "请求体:", body ? { worldview_id: body.worldview_id, titleLen: body.title?.length, contentLen: body.content?.length } : "null");
        if (!body || typeof body !== "object") {
            res.status(400).json({ success: false, error: "请求体无效" });
            return;
        }

        const { worldview_id, title, content, analysis_direction } = body;
        if (worldview_id == null || Number(worldview_id) < 1) {
            res.status(400).json({ success: false, error: "worldview_id 必填且为正整数" });
            return;
        }
        if (!title?.trim() && !content?.trim()) {
            res.status(400).json({ success: false, error: "title 与 content 至少填一项" });
            return;
        }

        const worldviewId = Number(worldview_id);

        let model;
        try {
            model = createDeepSeekModel({
                model: "deepseek-chat",
                temperature: 0.5,
            });
        } catch (e: any) {
            console.error(LOG_TAG, "DeepSeek 模型初始化失败", e?.message);
            res.status(503).json({
                success: false,
                error: "分析服务未配置（需配置 DEEPSEEK_API_KEY）",
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
            `- 脑洞标题：${title?.trim() || "（无）"}`,
            `- 脑洞内容：\n${(content || "").trim() || "（无）"}`,
            analysis_direction?.trim()
                ? `- 用户已提出的问题/分析方向：\n${analysis_direction.trim()}`
                : "- 用户已提出的问题/分析方向：（无，请根据脑洞内容自行提炼需要探索的问题并补全）",
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
                finalAnswerKeywords: ["扩展问题", "限制性假设"],
                logTag: LOG_TAG,
                verbose: true,
            }
        );

        console.log(LOG_TAG, "ReAct 完成，llmOutput 长度:", llmOutput?.length ?? 0, "前500字符:", (llmOutput || "").slice(0, 500));
        const analysisDirection = extractFinalAnswerText(llmOutput) || llmOutput;
        if (!analysisDirection || analysisDirection.trim().length < 10) {
            console.warn(LOG_TAG, "分析方向内容过短或为空，llmOutput 原始长度:", llmOutput?.length ?? 0);
        }

        res.status(200).json({
            success: true,
            data: { analysis_direction: analysisDirection || "(未生成有效内容，请查看服务端日志)" },
        });
    } catch (error: any) {
        const msg = error?.message ?? String(error);
        console.error(LOG_TAG, "Error", msg, error?.stack || "");
        if (!res.writableEnded) {
            res.status(500).json({
                success: false,
                error: msg || "生成分析方向失败",
            });
        }
    }
}
