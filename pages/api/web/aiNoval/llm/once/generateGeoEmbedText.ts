import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import { ChatDeepSeek } from "@langchain/deepseek";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-793d020ab6bf46f38ef40d3f3d5d544c';

// 创建 DeepSeek 聊天模型实例
const model = new ChatDeepSeek({
    apiKey: DEEPSEEK_API_KEY,
    model: "deepseek-chat",
    temperature: 0.3, // 较低的温度以获得更稳定的输出
});

/**
 * 生成地理设定嵌入标签原文的提示模板
 * 嵌入标签专注于语义特征，用于CHROMA向量检索，避免与DB精确匹配重叠
 * 
 * 重要原则：
 * - DB负责精确匹配：名称、编码等结构化标识符
 * - CHROMA负责语义匹配：特征、属性、描述等语义信息
 * - 嵌入标签必须不包含任何具体名称、编码，只包含语义特征
 */
const embedPrompt = PromptTemplate.fromTemplate(`
你是一个小说世界构建助手。请根据以下地理设定信息，生成一个专注于语义特征的嵌入标签原文。

【重要约束】
1. **绝对禁止**在嵌入标签中包含任何具体名称、编码、标识符
2. 只描述地理实体的**语义特征、属性、环境、功能**等可搜索的语义信息
3. 使用通用描述而非具体标识，例如用"首都城市"而非具体城市名

【嵌入标签应包含】
1. 地理类型及其特征（如：多恒星系统、类地行星、沿海城市等）
2. 物理属性（如：气候、地形、规模、结构等）
3. 环境特征（如：资源、生态、景观等）
4. 功能特征（如：交通枢纽、政治中心、资源基地等）
5. 位置关系特征（如：位于边缘、环绕关系等，但不提具体名称）

【输出要求】
- 语言简洁自然，适合向量嵌入和语义搜索
- 长度控制在80-150字
- 完全避免提及任何具体名称、编码或标识符

地理设定信息：
- 类型：{geoType}
- 描述：{description}
- 上级关系类型：{parentInfo}

请生成嵌入标签原文（不包含任何名称或编码）：
`);

// 创建生成链
const generateEmbedChain = RunnableSequence.from([embedPrompt, model]);

/**
 * 处理parentInfo，只保留关系类型，移除具体名称
 * @param parentInfo - 上级关系信息，可能包含冒号和具体名称
 * @returns 处理后的关系类型
 */
function processParentInfo(parentInfo: string | null | undefined): string {
    if (!parentInfo || parentInfo === "无上级关系") {
        return "无上级关系";
    }
    // 提取关系类型，如"所属星系"、"所属行星"等，移除冒号后的具体名称
    const processed = parentInfo.replace(/[：:].*$/, "").trim();
    return processed || "有上级关系";
}

/**
 * 生成地理设定嵌入标签的函数
 * @param geoData - 地理设定数据
 * @returns 生成的嵌入标签原文（不包含名称、编码）
 */
async function generateGeoEmbedText(geoData: {
    geoType?: string;
    description?: string;
    parentInfo?: string;
}): Promise<string> {
    try {
        const parentInfo = processParentInfo(geoData.parentInfo);

        const response = await generateEmbedChain.invoke({
            geoType: geoData.geoType || "地理单元",
            description: geoData.description || "无详细描述",
            parentInfo: parentInfo
        });

        return response.content as string;
    } catch (error) {
        console.error("生成嵌入标签时出错：", error);
        throw error;
    }
}

/**
 * API 接口处理器
 * 接收前端提交的地理单元信息，返回LLM生成的嵌入文本原文
 * 
 * 请求体参数：
 * - geoType: string (必需) - 地理类型，如："星系"、"恒星"、"行星"、"卫星"、"城市"、"大陆"等
 * - description: string (可选) - 地理单元的描述信息
 * - parentInfo: string (可选) - 上级关系信息，如："所属星系"、"所属行星"等（会自动移除具体名称）
 * 
 * 返回数据：
 * - success: boolean - 请求是否成功
 * - data.embedText: string - 生成的嵌入标签原文（不包含名称、编码等结构化标识符）
 * - error: string - 错误信息（如果失败）
 * 
 * 使用示例：
 * POST /api/web/aiNoval/llm/once/generateGeoEmbedText
 * {
 *   "geoType": "城市",
 *   "description": "首都城市，位于中央平原，是政治、经济和文化的中心",
 *   "parentInfo": "所属行星"
 * }
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<{ embedText: string }>>
) {
    // 只处理 POST 请求
    if (req.method !== 'POST') {
        res.status(405).json({ 
            success: false, 
            error: 'Method not allowed, only POST method is allowed' 
        });
        return;
    }

    try {
        // 从请求体中获取地理单元信息
        const { geoType, description, parentInfo } = req.body;

        // 参数验证
        if (!geoType || typeof geoType !== 'string') {
            res.status(400).json({ 
                success: false, 
                error: 'geoType is required and must be a string' 
            });
            return;
        }

        // description 和 parentInfo 是可选的
        const geoData = {
            geoType: geoType.trim(),
            description: description ? String(description).trim() : undefined,
            parentInfo: parentInfo ? String(parentInfo).trim() : undefined,
        };

        // 生成嵌入标签原文
        const embedText = await generateGeoEmbedText(geoData);

        // 返回结果
        res.status(200).json({
            success: true,
            data: {
                embedText: embedText
            }
        });

    } catch (error: any) {
        console.error('[generateGeoEmbedText] Error:', error);
        res.status(500).json({
            success: false,
            error: error?.message || 'Failed to generate embed text'
        });
    }
}
