import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import { ChatDeepSeek } from "@langchain/deepseek";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const model = new ChatDeepSeek({
    apiKey: DEEPSEEK_API_KEY,
    model: "deepseek-chat",
    temperature: 0.4,
});

/**
 * 根据文化标签等基础信息，生成阵营的「人物命名规范」三字段
 */
const prompt = PromptTemplate.fromTemplate(`
你是一个小说世界构建助手。请根据以下阵营基础信息，生成该阵营内人物/角色命名的「命名规范」三字段。

【基础信息】
- 文化标签：{cultureTags}
- 阵营名称：{factionName}
{factionCultureBlock}
{descriptionBlock}

【输出要求】
1. **人物·命名习惯**：风格、偏好、通用要求。根据文化标签推断人名风格（如：唐风姓+单字名、日耳曼多音节、和风姓+名、赛博朋克混搭编号等），1-3 句。
2. **人物·命名后缀**：尊称、辈分、职位后缀等约定。根据文化体系列出人名中常用的后缀或结构（如：字/号、君/殿、阁下、先生/女士；辈分用字；官职后缀等），要具体可操作。
3. **人物·命名禁忌**：严禁事项。根据文化标签推断应避免的人名用字或风格（如：禁现代网红名、禁与历史名人重名、禁某类谐音等），分条列举。

请严格按以下格式输出，不要添加其他内容：
【人物·命名习惯】
（此处填写，1-3 句）

【人物·命名后缀】
（此处填写，如：字（表字）、君（敬称）、辈分用字...）

【人物·命名禁忌】
（此处填写，分条列举）
`);

const generateChain = RunnableSequence.from([prompt, model]);

async function generateFactionPersonNamingRules(params: {
    cultureTags: string;
    factionName?: string;
    factionCulture?: string;
    description?: string;
}): Promise<{
    person_naming_habit: string;
    person_naming_suffix: string;
    person_naming_prohibition: string;
}> {
    const factionCultureBlock = params.factionCulture?.trim()
        ? `- 阵营文化：${params.factionCulture.trim()}`
        : "";
    const descriptionBlock = params.description?.trim()
        ? `- 阵营描述（节选）：${String(params.description).slice(0, 300).trim()}`
        : "";

    const response = await generateChain.invoke({
        cultureTags: params.cultureTags.trim(),
        factionName: params.factionName?.trim() || "（未指定）",
        factionCultureBlock: factionCultureBlock || "（未指定阵营文化）",
        descriptionBlock: descriptionBlock || "（未指定阵营描述）",
    });

    const text = (response.content as string) || "";

    const habitMatch = text.match(/【人物·命名习惯】\s*([\s\S]*?)(?=【人物·命名后缀】|$)/);
    const suffixMatch = text.match(/【人物·命名后缀】\s*([\s\S]*?)(?=【人物·命名禁忌】|$)/);
    const prohibitionMatch = text.match(/【人物·命名禁忌】\s*([\s\S]*?)$/);

    return {
        person_naming_habit: habitMatch?.[1]?.trim() || "",
        person_naming_suffix: suffixMatch?.[1]?.trim() || "",
        person_naming_prohibition: prohibitionMatch?.[1]?.trim() || "",
    };
}

/**
 * POST /api/web/aiNoval/llm/once/generateFactionPersonNamingRules
 *
 * 请求体：
 * - cultureTags: string (必需)
 * - factionName?: string
 * - factionCulture?: string
 * - description?: string
 *
 * 返回：
 * - data.person_naming_habit: string
 * - data.person_naming_suffix: string
 * - data.person_naming_prohibition: string
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<
        ApiResponse<{
            person_naming_habit: string;
            person_naming_suffix: string;
            person_naming_prohibition: string;
        }>
    >
) {
    if (req.method !== "POST") {
        res.status(405).json({
            success: false,
            error: "Method not allowed, only POST method is allowed",
        });
        return;
    }

    if (!DEEPSEEK_API_KEY) {
        res.status(500).json({
            success: false,
            error: "DEEPSEEK_API_KEY is not configured",
        });
        return;
    }

    try {
        const { cultureTags, factionName, factionCulture, description } = req.body;

        if (!cultureTags || typeof cultureTags !== "string" || !cultureTags.trim()) {
            res.status(400).json({
                success: false,
                error: "cultureTags is required and must be a non-empty string",
            });
            return;
        }

        const result = await generateFactionPersonNamingRules({
            cultureTags: cultureTags.trim(),
            factionName: factionName ? String(factionName).trim() : undefined,
            factionCulture: factionCulture ? String(factionCulture).trim() : undefined,
            description: description ? String(description).trim() : undefined,
        });

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error("[generateFactionPersonNamingRules] Error:", error);
        res.status(500).json({
            success: false,
            error: error?.message || "Failed to generate faction person naming rules",
        });
    }
}
