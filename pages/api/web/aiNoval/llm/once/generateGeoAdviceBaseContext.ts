import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import { ChatDeepSeek } from "@langchain/deepseek";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const model = new ChatDeepSeek({
    apiKey: DEEPSEEK_API_KEY,
    model: "deepseek-chat",
    temperature: 0.6, // 略高以增强想象力，避免区域特征过于保守
});

/**
 * 根据地点、阵营上下文生成基础参数（区域特征、命名背景）
 */
const contextPrompt = PromptTemplate.fromTemplate(`
你是一个富有想象力的小说世界构建助手。请根据以下信息，生成新地点的「区域特征」和「命名背景」。

【输入信息】
- 地点类型：{locationType}
{parentGeoBlock}
{adjacentGeosBlock}
{relatedFactionsBlock}

【输出要求】
1. **区域特征**（2-4 句话）：
   - 描述该区域的地理、气候、环境、氛围等物理与感官特征
   - **大胆想象**：基于上级地点、相邻地点的设定推断，信息不足时充分发挥想象，避免泛泛而谈
   - **富有画面感**：加入具象化细节（如光线、声响、气味、质感、视觉奇观）、独特的景观或反常现象
   - 可融入科幻/奇幻/东方美学等风格，让该地点令人印象深刻
2. **命名背景**：1-2 句话说明命名的情境。若有相关阵营，采用「【阵营名】传统控制区内的…」或类似格式，体现命名权归属；若无阵营则描述文化/历史渊源。

请严格按以下格式输出，不要添加其他内容：
【区域特征】
（此处填写区域特征，2-4 句，富有画面感和想象力）

【命名背景】
（此处填写命名背景，1-2 句）
`);

const generateChain = RunnableSequence.from([contextPrompt, model]);

interface ParentGeoInput {
    name: string;
    description?: string;
}

interface AdjacentGeoInput {
    name: string;
    description?: string;
}

interface RelatedFactionInput {
    name: string;
    description?: string;
}

function buildParentGeoBlock(parentGeo?: ParentGeoInput | null): string {
    if (!parentGeo?.name) return "";
    const desc = parentGeo.description?.trim() ? `\n  - 描述：${parentGeo.description}` : "";
    return `- 上级地点：${parentGeo.name}${desc}`;
}

function buildAdjacentGeosBlock(adjacentGeos?: AdjacentGeoInput[] | null): string {
    if (!adjacentGeos?.length) return "";
    const lines = adjacentGeos
        .filter(g => g?.name)
        .map(g => {
            const desc = g.description?.trim() ? ` - ${g.description}` : "";
            return `  - ${g.name}${desc}`;
        });
    if (lines.length === 0) return "";
    return `- 相邻地点：\n${lines.join("\n")}`;
}

function buildRelatedFactionsBlock(relatedFactions?: RelatedFactionInput[] | null): string {
    if (!relatedFactions?.length) return "";
    const lines = relatedFactions
        .filter(f => f?.name)
        .map(f => {
            const desc = f.description?.trim() ? ` - ${f.description}` : "";
            return `  - ${f.name}${desc}`;
        });
    if (lines.length === 0) return "";
    return `- 相关阵营（命名权归属）：\n${lines.join("\n")}`;
}

async function generateGeoContext(params: {
    locationType: string;
    parentGeo?: ParentGeoInput | null;
    adjacentGeos?: AdjacentGeoInput[] | null;
    relatedFactions?: RelatedFactionInput[] | null;
}): Promise<{ regionFeature: string; namingBackground: string }> {
    const parentGeoBlock = buildParentGeoBlock(params.parentGeo);
    const adjacentGeosBlock = buildAdjacentGeosBlock(params.adjacentGeos);
    const relatedFactionsBlock = buildRelatedFactionsBlock(params.relatedFactions);

    const response = await generateChain.invoke({
        locationType: params.locationType.trim(),
        parentGeoBlock: parentGeoBlock || "（未指定上级地点）",
        adjacentGeosBlock: adjacentGeosBlock || "（未指定相邻地点）",
        relatedFactionsBlock: relatedFactionsBlock || "（未指定相关阵营）",
    });

    const text = (response.content as string) || "";

    const regionMatch = text.match(/【区域特征】\s*([\s\S]*?)(?=【命名背景】|$)/);
    const namingMatch = text.match(/【命名背景】\s*([\s\S]*?)$/);

    const regionFeature = regionMatch?.[1]?.trim() || "";
    const namingBackground = namingMatch?.[1]?.trim() || "";

    return { regionFeature, namingBackground };
}

/**
 * POST /api/web/aiNoval/llm/once/generateGeoContext
 *
 * 请求体：
 * - locationType: string (必需) - 地点类型
 * - parentGeo?: { name: string; description?: string }
 * - adjacentGeos?: Array<{ name: string; description?: string }>
 * - relatedFactions?: Array<{ name: string; description?: string }>
 *
 * 返回：
 * - data.regionFeature: string
 * - data.namingBackground: string
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<{ regionFeature: string; namingBackground: string }>>
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
        const { locationType, parentGeo, adjacentGeos, relatedFactions } = req.body;

        if (!locationType || typeof locationType !== "string") {
            res.status(400).json({
                success: false,
                error: "locationType is required and must be a string",
            });
            return;
        }

        const result = await generateGeoContext({
            locationType: locationType.trim(),
            parentGeo: parentGeo || null,
            adjacentGeos: adjacentGeos || null,
            relatedFactions: relatedFactions || null,
        });

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error("[generateGeoContext] Error:", error);
        res.status(500).json({
            success: false,
            error: error?.message || "Failed to generate geo context",
        });
    }
}
