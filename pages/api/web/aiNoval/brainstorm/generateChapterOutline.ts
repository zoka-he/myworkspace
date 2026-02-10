import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import BrainstormService from "@/src/services/aiNoval/brainstormService";
import { createDeepSeekModel } from "@/src/utils/ai/modelFactory";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const LOG_TAG = "[brainstormGenerateChapterOutline]";
const service = new BrainstormService();

/** 解析JSON字段的辅助函数 */
function parseJsonField(field: any): any {
    if (typeof field === 'string') {
        try {
            return JSON.parse(field);
        } catch {
            return field;
        }
    }
    return field;
}

/** 解析脑洞的JSON字段 */
function parseBrainstorm(brainstorm: any) {
    if (!brainstorm) return null;
    
    const parsed = { ...brainstorm };
    parsed.tags = parseJsonField(parsed.tags);
    parsed.analysis_result = parseJsonField(parsed.analysis_result);
    parsed.related_faction_ids = parseJsonField(parsed.related_faction_ids);
    parsed.related_role_ids = parseJsonField(parsed.related_role_ids);
    parsed.related_geo_codes = parseJsonField(parsed.related_geo_codes);
    parsed.related_event_ids = parseJsonField(parsed.related_event_ids);
    parsed.related_chapter_ids = parseJsonField(parsed.related_chapter_ids);
    parsed.related_world_state_ids = parseJsonField(parsed.related_world_state_ids);
    parsed.parent_ids = parseJsonField(parsed.parent_ids);
    parsed.expanded_questions = parsed.expanded_questions; // 保持字符串格式
    
    return parsed;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<{ chapter_outline: string }>>
) {
    if (req.method !== "POST") {
        res.status(405).json({
            success: false,
            error: "Method not allowed, only POST is allowed",
        });
        return;
    }

    try {
        const { id } = req.query;
        if (!id || typeof id !== 'string') {
            res.status(400).json({
                success: false,
                error: "brainstorm id is required",
            });
            return;
        }

        const brainstormId = Number(id);
        console.log(LOG_TAG, "开始生成章节纲要，ID:", brainstormId);

        // 获取脑洞信息
        const brainstorm = await service.getBrainstormById(brainstormId);
        if (!brainstorm) {
            res.status(404).json({
                success: false,
                error: `Brainstorm not found, id: ${brainstormId}`,
            });
            return;
        }

        const parsedBrainstorm = parseBrainstorm(brainstorm);

        // 初始化模型
        const model = createDeepSeekModel({
            model: "deepseek-chat",
            temperature: 0.7,
        });

        const systemPrompt = `你是小说章节规划助手。根据脑洞的元数据、用户问题、扩展问题和分析结果，生成该脑洞对应的章节纲要。

要求：
- 章节纲要应该是一个结构化的章节规划，可以包含章节标题、章节要点、情节发展等
- 基于脑洞内容、用户关注点、扩展问题以及分析结果中的建议和机会，设计合理的章节结构
- 输出格式：自然语言，可以使用 Markdown 格式（如 ## 章节标题、- 要点等）
- 如果信息不足，可以基于脑洞内容进行合理推断`;

        const userPrompt = [
            "请根据以下脑洞信息生成章节纲要：",
            "",
            "=== 元数据 ===",
            `标题：${parsedBrainstorm.title || "（无）"}`,
            `类型：${parsedBrainstorm.brainstorm_type || "（无）"}`,
            `状态：${parsedBrainstorm.status || "（无）"}`,
            `优先级：${parsedBrainstorm.priority || "（无）"}`,
            `分类：${parsedBrainstorm.category || "（无）"}`,
            "",
            "=== 内容 ===",
            (parsedBrainstorm.content || "").trim() || "（无）",
            "",
            parsedBrainstorm.user_question?.trim()
                ? [
                    "=== 用户原始问题 ===",
                    parsedBrainstorm.user_question.trim(),
                    "",
                ].join("\n")
                : "",
            parsedBrainstorm.expanded_questions?.trim()
                ? [
                    "=== 扩展后的问题 ===",
                    parsedBrainstorm.expanded_questions.trim(),
                    "",
                ].join("\n")
                : "",
            parsedBrainstorm.plot_planning?.trim()
                ? [
                    "=== 剧情规划 ===",
                    parsedBrainstorm.plot_planning.trim(),
                    "",
                ].join("\n")
                : "",
            parsedBrainstorm.analysis_result?.analysis_text?.trim()
                ? [
                    "=== 分析结果 ===",
                    parsedBrainstorm.analysis_result.analysis_text.trim().substring(0, 2000) + 
                    (parsedBrainstorm.analysis_result.analysis_text.trim().length > 2000 ? "..." : ""),
                    "",
                ].join("\n")
                : "",
            "请生成章节纲要（自然语言，可使用 Markdown 格式）。",
        ].filter(Boolean).join("\n");

        const messages = [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)];
        const rawContent = (await model.invoke(messages)).content;
        const response =
            typeof rawContent === "string"
                ? rawContent
                : Array.isArray(rawContent)
                    ? (rawContent as any[]).map((c) => (typeof c === "string" ? c : (c as any)?.text ?? "")).join("")
                    : String(rawContent ?? "");

        const chapterOutline = response.trim();

        if (!chapterOutline) {
            res.status(500).json({
                success: false,
                error: "生成章节纲要失败，未返回有效内容",
            });
            return;
        }

        // 保存章节纲要
        await service.updateBrainstorm(brainstormId, {
            chapter_outline: chapterOutline,
        });

        console.log(LOG_TAG, "章节纲要生成完成并保存，ID:", brainstormId);

        res.status(200).json({
            success: true,
            data: { chapter_outline: chapterOutline },
        });
    } catch (error: any) {
        const msg = error?.message ?? String(error);
        console.error(LOG_TAG, "Error", msg, error?.stack || "");
        
        if (!res.writableEnded) {
            res.status(500).json({
                success: false,
                error: msg || "生成章节纲要失败",
            });
        }
    }
}
