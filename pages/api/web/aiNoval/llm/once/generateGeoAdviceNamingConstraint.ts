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
 * 根据基础信息生成命名约束（阵营命名习惯、特殊要求、特殊后缀、严禁事项）
 */
const constraintPrompt = PromptTemplate.fromTemplate(`
你是一个小说世界构建助手。请根据以下基础信息，合成新地点的「命名约束」。

【基础信息】
- 地点类型：{locationType}
- 区域特征：{regionFeature}
- 命名背景：{namingBackground}
- 命名权来源：{namingSource}
{relatedFactionsBlock}
{adjacentGeosBlock}

【输出要求】
1. **阵营命名习惯**：根据相关阵营的命名规范（geo_naming_habit）合成。多阵营时合并共通点、保留差异点；若无阵营则根据命名背景、区域特征推断命名风格偏好。
2. **特殊要求**：针对该地点类型和区域特征，提出地名的特殊要求（如体现气候、地形、文化等）。
3. **特殊后缀**：根据阵营的 geo_naming_suffix 及地点类型，列出适用的后缀及层级对应（如：道/州/郡/市/县）。
4. **严禁事项**：根据阵营的 geo_naming_prohibition 合成；另需加入「与相邻地名区分、避免重名/谐音」的约束。若无阵营则根据设定推断禁忌。

请严格按以下格式输出，不要添加其他内容：
【阵营命名习惯】
（此处填写，1-3 句）

【特殊要求】
（此处填写，1-2 句）

【特殊后缀】
（此处填写，如：道（轨区）、州（星球级）...）

【严禁事项】
（此处填写，分条或分句列举）
`);

const generateChain = RunnableSequence.from([constraintPrompt, model]);

interface RelatedFactionInput {
    name: string;
    geo_naming_habit?: string;
    geo_naming_suffix?: string;
    geo_naming_prohibition?: string;
}

interface AdjacentGeoInput {
    name: string;
}

function buildRelatedFactionsBlock(relatedFactions?: RelatedFactionInput[] | null): string {
    if (!relatedFactions?.length) return "";
    const lines = relatedFactions
        .filter(f => f?.name)
        .map(f => {
            const parts: string[] = [`- ${f.name}：`];
            if (f.geo_naming_habit?.trim()) parts.push(`  命名习惯：${f.geo_naming_habit}`);
            if (f.geo_naming_suffix?.trim()) parts.push(`  命名后缀：${f.geo_naming_suffix}`);
            if (f.geo_naming_prohibition?.trim()) parts.push(`  命名禁忌：${f.geo_naming_prohibition}`);
            return parts.join("\n");
        });
    return `- 相关阵营及命名规范：\n${lines.join("\n")}`;
}

function buildAdjacentGeosBlock(adjacentGeos?: AdjacentGeoInput[] | null): string {
    if (!adjacentGeos?.length) return "";
    const names = adjacentGeos.map(g => g.name).filter(Boolean).join("、");
    return `- 相邻地点（需避免重名/谐音）：${names}`;
}

async function generateNamingConstraint(params: {
    locationType: string;
    regionFeature: string;
    namingBackground: string;
    namingSource: string;
    relatedFactions?: RelatedFactionInput[] | null;
    adjacentGeos?: AdjacentGeoInput[] | null;
}): Promise<{
    namingHabit: string;
    specialRequirement: string;
    specialSuffix: string;
    prohibition: string;
}> {
    const relatedFactionsBlock = buildRelatedFactionsBlock(params.relatedFactions);
    const adjacentGeosBlock = buildAdjacentGeosBlock(params.adjacentGeos);

    const response = await generateChain.invoke({
        locationType: params.locationType.trim(),
        regionFeature: params.regionFeature.trim() || "（未指定）",
        namingBackground: params.namingBackground.trim() || "（未指定）",
        namingSource: params.namingSource.trim() || "（未指定）",
        relatedFactionsBlock: relatedFactionsBlock || "（未指定相关阵营）",
        adjacentGeosBlock: adjacentGeosBlock || "（未指定相邻地点）",
    });

    const text = (response.content as string) || "";

    const habitMatch = text.match(/【阵营命名习惯】\s*([\s\S]*?)(?=【特殊要求】|$)/);
    const requirementMatch = text.match(/【特殊要求】\s*([\s\S]*?)(?=【特殊后缀】|$)/);
    const suffixMatch = text.match(/【特殊后缀】\s*([\s\S]*?)(?=【严禁事项】|$)/);
    const prohibitionMatch = text.match(/【严禁事项】\s*([\s\S]*?)$/);

    return {
        namingHabit: habitMatch?.[1]?.trim() || "",
        specialRequirement: requirementMatch?.[1]?.trim() || "",
        specialSuffix: suffixMatch?.[1]?.trim() || "",
        prohibition: prohibitionMatch?.[1]?.trim() || "",
    };
}

/**
 * POST /api/web/aiNoval/llm/once/generateGeoAdviceNamingConstraint
 *
 * 请求体：
 * - locationType: string
 * - regionFeature: string
 * - namingBackground: string
 * - namingSource: string
 * - relatedFactions?: Array<{ name, geo_naming_habit?, geo_naming_suffix?, geo_naming_prohibition? }>
 * - adjacentGeos?: Array<{ name }>
 *
 * 返回：
 * - data.namingHabit: string
 * - data.specialRequirement: string
 * - data.specialSuffix: string
 * - data.prohibition: string
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<
        ApiResponse<{
            namingHabit: string;
            specialRequirement: string;
            specialSuffix: string;
            prohibition: string;
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
        const { locationType, regionFeature, namingBackground, namingSource, relatedFactions, adjacentGeos } =
            req.body;

        if (!locationType || typeof locationType !== "string") {
            res.status(400).json({
                success: false,
                error: "locationType is required and must be a string",
            });
            return;
        }

        const result = await generateNamingConstraint({
            locationType: locationType.trim(),
            regionFeature: regionFeature ? String(regionFeature).trim() : "",
            namingBackground: namingBackground ? String(namingBackground).trim() : "",
            namingSource: namingSource ? String(namingSource).trim() : "",
            relatedFactions: relatedFactions || null,
            adjacentGeos: adjacentGeos || null,
        });

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error("[generateGeoAdviceNamingConstraint] Error:", error);
        res.status(500).json({
            success: false,
            error: error?.message || "Failed to generate naming constraint",
        });
    }
}
