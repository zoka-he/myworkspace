import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import { ChatDeepSeek } from "@langchain/deepseek";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-793d020ab6bf46f38ef40d3f3d5d544c';

const model = new ChatDeepSeek({
    apiKey: DEEPSEEK_API_KEY,
    model: "deepseek-chat",
    temperature: 0.3,
});

/**
 * 缩写小说章节到指定字数的提示模板
 */
const stripPrompt = PromptTemplate.fromTemplate(`
你是一个专业的小说编辑助手。请将以下小说章节内容缩写到指定的字数，同时保留核心情节和重要细节。

【任务要求】
1. 将章节内容缩写到约 {targetLength} 字（允许 ±50 字的误差）
2. **必须保留**所有核心情节、关键对话、重要转折点
3. **必须保留**主要角色的行为、情感变化和关键决策
4. 可以删除或简化：重复描述、冗余的环境描写、次要细节
5. 保持原文的叙事风格和语言特色
6. 确保缩写后的内容逻辑连贯，读起来自然流畅

【缩写原则】
- 优先保留推动情节发展的内容
- 保留角色之间的重要互动和对话
- 保留情感高潮和转折点
- 可以合并相似的情节描述
- 可以简化环境描写，但保留关键场景信息

【章节内容】
{paragraph}

请将以上章节内容缩写到约 {targetLength} 字，直接输出缩写后的内容，不要添加任何说明或注释：
`);

const stripChain = RunnableSequence.from([stripPrompt, model]);

async function stripParagraph(paragraph: string, targetLength: number): Promise<string> {
    try {
        const response = await stripChain.invoke({
            paragraph: paragraph || "",
            targetLength: targetLength || 1000,
        });
        return response.content as string;
    } catch (error) {
        console.error("缩写章节时出错：", error);
        throw error;
    }
}

/**
 * API 接口处理器
 * 请求体：{ text: string, targetLength: number }
 * 返回：data.strippedParagraph: string
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<{ strippedText: string }>>
) {
    if (req.method !== "POST") {
        res.status(405).json({
            success: false,
            error: "Method not allowed, only POST method is allowed",
        });
        return;
    }

    try {
        const { text, targetLength } = req.body;

        if (!text || typeof text !== 'string') {
            res.status(400).json({
                success: false,
                error: "paragraph is required and must be a string",
            });
            return;
        }

        if (!targetLength || typeof targetLength !== 'number' || targetLength <= 0) {
            res.status(400).json({
                success: false,
                error: "targetLength is required and must be a positive number",
            });
            return;
        }

        const strippedText = await stripParagraph(text.trim(), targetLength);

        res.status(200).json({
            success: true,
            data: { strippedText },
        });
    } catch (error: any) {
        console.error("[stripParagraph] Error:", error);
        res.status(500).json({
            success: false,
            error: error?.message || "Failed to strip paragraph",
        });
    }
}
