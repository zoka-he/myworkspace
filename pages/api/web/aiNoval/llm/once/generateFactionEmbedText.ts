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
 * 生成阵营嵌入标签原文的提示模板
 * 嵌入标签专注于语义特征，用于 CHROMA 向量检索
 *
 * 原则：不包含具体阵营名称，但必须保留所有关键细节和具体特征
 */
const embedPrompt = PromptTemplate.fromTemplate(`
你是一个小说世界构建助手。请根据以下阵营设定信息，生成一个专注于语义特征的嵌入标签原文。

【重要约束】
1. **绝对禁止**在嵌入标签中包含任何具体阵营名称、标识符、人名、地名
2. 但**必须保留**所有关键细节：技术特点、军事装备、经济模式、人口规模、组织结构、内部矛盾、外交关系、最新状态等
3. 使用通用描述替代具体名称，例如用"某势力"、"该组织"、"该星球"、"某大陆"而非具体名称

【嵌入标签必须详细包含】
1. **制度与政体**：具体制度类型（君主立宪、长老制、公社制等）及权力结构
2. **位置与范围**：地理位置特征（星球、大陆、区域等，不提具体名称）、势力范围规模
3. **人口与种族**：人口规模、种族构成、特殊人口特征（如长生种、生育率等）
4. **信仰与价值观**：具体信仰内容、价值观倾向、对特定现象的态度
5. **科技特点**：具体科技路线（魔法+蒸汽、生物科技、赛博朋克等）、技术特色、科技水平
6. **军事力量**：军队名称（用通用描述）、装备类型、战术特点、特殊武器
7. **经济模式**：经济制度、主要产业、贸易关系、分配方式
8. **外交关系**：对不同势力的态度（友好、敌对、冷淡等，不提具体名称）
9. **内部矛盾**：具体矛盾点、冲突原因、对立势力（用通用描述）
10. **最新状态**：当前状态、重大事件、战争状态等
11. **上级关系**：如有上级阵营，描述层级关系特征（不提具体名称）

【输出要求】
- 语言简洁自然，适合向量嵌入和语义搜索
- **长度控制在 200-300 字**，确保关键细节不丢失
- 保留原文中的具体数字、技术术语、特征描述
- 完全避免提及任何具体阵营名称、人名、地名或标识符
- **不要过度概括**，尽量保留原文的详细程度

阵营设定信息：
- 描述：{description}
- 上级关系：{parentInfo}

请生成嵌入标签原文（不包含任何名称或标识符，但保留所有关键细节）：
`);

const generateEmbedChain = RunnableSequence.from([embedPrompt, model]);

function processParentInfo(hasParent: boolean): string {
    return hasParent ? "有上级阵营" : "无上级阵营";
}

async function generateFactionEmbedText(data: {
    description?: string;
    parentInfo?: string;
}): Promise<string> {
    try {
        const response = await generateEmbedChain.invoke({
            description: data.description || "无详细描述",
            parentInfo: data.parentInfo ?? "无上级阵营",
        });
        return response.content as string;
    } catch (error) {
        console.error("生成阵营嵌入标签时出错：", error);
        throw error;
    }
}

/**
 * API 接口处理器
 * 请求体：description?: string, hasParent?: boolean
 * 返回：data.embedText: string
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<{ embedText: string }>>
) {
    if (req.method !== "POST") {
        res.status(405).json({
            success: false,
            error: "Method not allowed, only POST method is allowed",
        });
        return;
    }

    try {
        const { description, hasParent } = req.body;

        const factionData = {
            description: description ? String(description).trim() : undefined,
            parentInfo: processParentInfo(Boolean(hasParent)),
        };

        const embedText = await generateFactionEmbedText(factionData);

        res.status(200).json({
            success: true,
            data: { embedText },
        });
    } catch (error: any) {
        console.error("[generateFactionEmbedText] Error:", error);
        res.status(500).json({
            success: false,
            error: error?.message || "Failed to generate faction embed text",
        });
    }
}
