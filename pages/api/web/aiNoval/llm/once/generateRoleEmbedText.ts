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
 * 生成角色嵌入标签原文的提示模板
 * 嵌入标签专注于语义特征，用于 CHROMA 向量检索
 *
 * 原则：不包含具体角色名称，但必须保留所有关键细节和具体特征
 */
const embedPrompt = PromptTemplate.fromTemplate(`
你是一个小说世界构建助手。请根据以下角色设定信息，生成一个专注于语义特征的嵌入标签原文。

【重要约束】
1. **绝对禁止**在嵌入标签中包含任何具体角色名称、人名、地名、派系名称
2. 但**必须保留**所有关键细节：性别、年龄、种族、背景、性格、能力、关系、所属派系特征、最新状态等
3. 使用通用描述替代具体名称，例如用"该角色"、"此人"、"该派系"、"某地"而非具体名称

【嵌入标签必须详细包含】
1. **基本信息**：性别特征、年龄阶段、种族类型（如人类、精灵、机械生命等）
2. **性格特征**：具体性格特点、行为模式、价值观念、情绪倾向
3. **背景经历**：成长背景、重要经历、教育背景、职业特征
4. **能力与技能**：特殊能力、技能水平、战斗风格、专业领域
5. **所属关系**：所属派系特征（用通用描述，不提具体名称）、在派系中的地位
6. **人际关系**：与他人的关系类型（朋友、敌人、家人等，不提具体人名）
7. **外貌特征**：显著外貌特点、着装风格、标志性特征
8. **行为习惯**：日常行为模式、说话方式、特殊习惯
9. **目标与动机**：当前目标、核心动机、追求的事物
10. **最新状态**：当前状态、最近发生的事件、重要变化

【输出要求】
- 语言简洁自然，适合向量嵌入和语义搜索
- **长度控制在 200-300 字**，确保关键细节不丢失
- 保留原文中的具体数字、特征描述、能力细节
- 完全避免提及任何具体角色名称、人名、地名或派系名称
- **不要过度概括**，尽量保留原文的详细程度

角色设定信息：
{roleText}

请生成嵌入标签原文（不包含任何名称或标识符，但保留所有关键细节）：
`);

const generateEmbedChain = RunnableSequence.from([embedPrompt, model]);

async function generateRoleEmbedText(roleText: string): Promise<string> {
    try {
        const response = await generateEmbedChain.invoke({
            roleText: roleText || "无详细描述",
        });
        return response.content as string;
    } catch (error) {
        console.error("生成角色嵌入标签时出错：", error);
        throw error;
    }
}

/**
 * API 接口处理器
 * 请求体：roleText: string
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
        const { roleText } = req.body;

        if (!roleText || typeof roleText !== 'string') {
            res.status(400).json({
                success: false,
                error: "roleText is required and must be a string",
            });
            return;
        }

        const embedText = await generateRoleEmbedText(roleText.trim());

        res.status(200).json({
            success: true,
            data: { embedText },
        });
    } catch (error: any) {
        console.error("[generateRoleEmbedText] Error:", error);
        res.status(500).json({
            success: false,
            error: error?.message || "Failed to generate role embed text",
        });
    }
}
