import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import { mcpToolRegistry } from "@/src/mcp/core/mcpToolRegistry";
import { executeReAct } from "@/src/utils/ai/reactAgent";
import { createDeepSeekModel, createOpenRouterModel } from "@/src/utils/ai/modelFactory";

const WORLDVIEW_ID = 1; // 固定为1

export interface MinifyWorldRuleInput {
    faction_name: string; // 上级阵营名称
}

const LOG_TAG = "[minifyWorldRule]";

/**
 * 构建ReAct系统提示词
 */
function buildReActSystemPrompt(): string {
    return `你正在为某个"目标阵营/地点"裁切世界常量。

任务：
- 仅保留对当前阵营/地点"可感知、可接触、可误解"的部分
- 明确哪些能力/力量【不存在】、【不可被假设】
- 明确地理区域中【不应自动生成冲突或势力】

隐含条件：
1. 任何需要填写worldview_id的场合，worldview_id=1

Final Answer 输出格式要求：
Final Answer必须包含以下三个部分：
- Allowed Assumptions（允许的假设）
- Forbidden Assumptions（禁止的假设）
- Common False Tropes（模型容易犯的错）

每个部分应该包含具体的、可操作的规则，避免空泛的描述。`;
}

/**
 * POST /api/web/aiNoval/llm/once/minifyWorldRule
 *
 * 请求体：MinifyWorldRuleInput
 * 返回：ApiResponse<string>（LLM 原始输出）
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<string>>
) {
    if (req.method !== "POST") {
        res.status(405).json({
            success: false,
            error: "Method not allowed, only POST method is allowed",
        });
        return;
    }

    try {
        console.log(LOG_TAG, "request start");
        const body = req.body as MinifyWorldRuleInput | undefined;
        if (!body || typeof body !== "object") {
            console.warn(LOG_TAG, "missing or invalid body", typeof req.body);
            res.status(400).json({ success: false, error: "请求体无效" });
            return;
        }

        const { faction_name } = body;
        if (!faction_name?.trim()) {
            res.status(400).json({ success: false, error: "faction_name is required" });
            return;
        }

        // 1. 创建LLM模型（优先使用 DeepSeek，如果不可用则使用 OpenRouter）
        let model;
        try {
            model = createDeepSeekModel({ 
                model: "deepseek-chat",
                temperature: 0.7 
            });
            console.log(LOG_TAG, "使用 DeepSeek 模型");
        } catch (error) {
            console.log(LOG_TAG, "DeepSeek 不可用，使用 OpenRouter 模型");
            model = createOpenRouterModel({
                model: "google/gemini-2.0-flash-exp:free",
                temperature: 0.7,
            });
        }

        // 2. 获取工具列表
        const tools = mcpToolRegistry.getAllToolDefinitions();

        // 3. 创建工具执行函数（自动添加 worldview_id；兼容 args 为对象或 JSON 字符串）
        const toolExecutor = async (name: string, args: Record<string, any> | string) => {
            let obj: Record<string, any> = {};
            if (typeof args === 'object' && args !== null && !Array.isArray(args)) {
                obj = args;
            } else if (typeof args === 'string') {
                try {
                    const parsed = JSON.parse(args);
                    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) obj = parsed;
                } catch {
                    // 保持 obj = {}
                }
            }
            const finalArgs = { ...obj, worldview_id: WORLDVIEW_ID };
            return await mcpToolRegistry.executeTool(name, finalArgs);
        };

        // 4. 构建系统提示词
        const systemPrompt = buildReActSystemPrompt();

        // 5. 构建用户查询
        const userQuery = `输入：\n上级阵营名称：${faction_name.trim()}`;

        // 6. 执行ReAct循环
        console.log(LOG_TAG, "开始ReAct循环...");
        const llmOutput = await executeReAct(
            model,
            tools,
            toolExecutor,
            systemPrompt,
            userQuery,
            {
                maxIterations: 10,
                finalAnswerKeywords: ["Allowed Assumptions", "Forbidden Assumptions", "Common False Tropes"],
                logTag: LOG_TAG,
                verbose: true,
            }
        );

        // 7. 直接返回 LLM 输出
        console.log(LOG_TAG, "success");
        res.status(200).json({
            success: true,
            data: llmOutput,
        });
    } catch (error: any) {
        const msg = error?.message ?? String(error);
        const stack = error?.stack;
        console.error(LOG_TAG, "Error", msg, stack || "");
        if (!res.writableEnded) {
            res.status(500).json({
                success: false,
                error: msg || "生成失败",
            });
        }
    }
}
