import { BaseLanguageModel } from "@langchain/core/language_models/base";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import type { MCPToolDefinition } from "@/src/mcp/core/mcpTypes";

/**
 * 转义 JSON 字符串中的大括号，防止 LangChain 将其解析为模板变量
 */
function escapeBracketsForLangChain(text: string): string {
    return text.replace(/\{/g, '{{').replace(/\}/g, '}}');
}

/**
 * 获取可用工具列表并格式化为字符串
 */
function formatToolsDescription(tools: MCPToolDefinition[]): string {
    let description = "可用工具列表（调用时必须使用确切的工具名称）：\n\n";
    
    tools.forEach((tool, index) => {
        description += `${index + 1}. 【${tool.name}】\n`;
        description += `   描述: ${tool.description}\n`;
        description += `   参数:\n`;
        
        const properties = tool.inputSchema.properties || {};
        const required = tool.inputSchema.required || [];
        
        Object.entries(properties).forEach(([key, prop]: [string, any]) => {
            const isRequired = required.includes(key);
            description += `     - ${key}${isRequired ? ' (必需)' : ' (可选)'}: ${prop.type}`;
            if (prop.description) {
                description += ` - ${prop.description}`;
            }
            description += `\n`;
        });
        
        description += "\n";
    });
    
    return description;
}

/**
 * 生成标准的 ReAct 工具使用说明（包含工具描述）
 */
function generateReActInstructionsWithTools(toolsDescription: string): string {
    return `你可以使用以下MCP工具来获取信息：
${toolsDescription}

工作流程（ReAct模式）：
你必须严格按照以下格式输出，每次只能执行一个动作：

格式1 - 调用工具：
Thought: <你的思考过程>
Action: <工具名称>
Action Input: <JSON格式的参数，必须是有效的JSON对象>

格式2 - 给出最终答案：
Thought: <你的思考过程>
Final Answer:
<你的最终答案>

示例1 - 调用工具：
Thought: 我需要先获取世界观信息，了解基本的物理和宇宙规则。
Action: worldbook
Action Input: {"worldview_id": 1}

示例2 - 调用工具：
Thought: 现在我需要查找上级阵营的详细信息。
Action: find_faction
Action Input: {"worldview_id": 1, "keywords": "上级阵营名称", "threshold": 0.5}

重要规则：
1. 每次响应必须包含 Thought 和 Action（或 Final Answer）
2. Action Input 必须是有效的JSON格式
3. 不要一次性调用多个工具，每次只调用一个
4. 根据观察结果决定下一步行动
5. 只有在收集到足够信息后才给出Final Answer`;
}

/**
 * 生成标准的 ReAct 格式说明（不包含工具描述）
 */
function generateReActFormatInstructions(): string {
    return `工作流程（ReAct模式）：
你必须严格按照以下格式输出，每次只能执行一个动作：

格式1 - 调用工具：
Thought: <你的思考过程>
Action: <工具名称>
Action Input: <JSON格式的参数，必须是有效的JSON对象>

格式2 - 给出最终答案：
Thought: <你的思考过程>
Final Answer:
<你的最终答案>

示例1 - 调用工具：
Thought: 我需要先获取世界观信息，了解基本的物理和宇宙规则。
Action: worldbook
Action Input: {"worldview_id": 1}

示例2 - 调用工具：
Thought: 现在我需要查找上级阵营的详细信息。
Action: find_faction
Action Input: {"worldview_id": 1, "keywords": "上级阵营名称", "threshold": 0.5}

重要规则：
1. 每次响应必须包含 Thought 和 Action（或 Final Answer）
2. Action Input 必须是有效的JSON格式
3. 不要一次性调用多个工具，每次只调用一个
4. 根据观察结果决定下一步行动
5. 只有在收集到足够信息后才给出Final Answer`;
}

/**
 * 解析LLM输出中的Action
 */
function parseAction(text: string): { action: string; actionInput: any } | null {
    const actionMatch = text.match(/Action:\s*(\w+)/i);
    if (!actionMatch) {
        return null;
    }
    
    const action = actionMatch[1].trim();
    const inputMatch = text.match(/Action Input:\s*(\{[\s\S]*?\})(?=\n|$)/i);
    let actionInput: any = {};
    
    if (inputMatch) {
        try {
            const jsonStr = inputMatch[1].trim();
            actionInput = JSON.parse(jsonStr);
        } catch (e) {
            // 如果JSON解析失败，尝试提取键值对
            const keyValuePairs = inputMatch[1].match(/(\w+)\s*:\s*([^,\n}]+)/g);
            if (keyValuePairs) {
                actionInput = {};
                keyValuePairs.forEach(pair => {
                    const match = pair.match(/(\w+)\s*:\s*(.+)/);
                    if (match) {
                        const [, key, value] = match;
                        const trimmedValue = value.trim().replace(/^["']|["']$/g, '');
                        const numValue = Number(trimmedValue);
                        actionInput[key] = isNaN(numValue) ? trimmedValue : numValue;
                    }
                });
            }
        }
    }
    
    return { action, actionInput };
}

/**
 * 检查是否是Final Answer
 */
function isFinalAnswer(text: string, finalAnswerKeywords?: string[]): boolean {
    if (finalAnswerKeywords && finalAnswerKeywords.length > 0) {
        return finalAnswerKeywords.every(keyword => text.includes(keyword));
    }
    return /Final Answer:/i.test(text);
}

/**
 * 格式化工具执行结果为观察文本
 */
function formatObservation(result: any): string {
    if (result.isError) {
        return `错误: ${result.content?.[0]?.text || '工具执行失败'}`;
    }
    
    if (!result.content || result.content.length === 0) {
        return "工具返回空结果";
    }
    
    let observation = "";
    result.content.forEach((item: any, index: number) => {
        if (item.type === 'text') {
            observation += item.text;
        } else if (item.type === 'application/json') {
            const data = (item as any).data || (item as any).text;
            observation += typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        }
        if (index < result.content.length - 1) {
            observation += "\n";
        }
    });
    
    if (result.rawData) {
        observation += `\n原始数据: ${JSON.stringify(result.rawData, null, 2)}`;
    }
    
    return observation;
}

/**
 * ReAct Agent 配置选项
 */
export interface ReActAgentOptions {
    /** 最大迭代次数，默认 10 */
    maxIterations?: number;
    /** Final Answer 关键词列表，用于检测最终答案 */
    finalAnswerKeywords?: string[];
    /** 日志标签，用于调试 */
    logTag?: string;
    /** 是否在每次迭代时输出日志 */
    verbose?: boolean;
    /** 是否自动添加工具说明和 ReAct 格式说明，默认 true */
    autoInjectToolInstructions?: boolean;
}

/**
 * 工具执行函数类型
 */
export type ToolExecutor = (name: string, args: Record<string, any>) => Promise<any>;

/**
 * ReAct Agent 主函数
 * 
 * @param model - 初始化好的 LLM 模型
 * @param tools - 工具定义列表
 * @param toolExecutor - 工具执行函数
 * @param systemPrompt - 系统提示词（可以包含 {tools} 占位符，会被工具描述替换）
 * @param userQuery - 用户查询
 * @param options - 可选配置
 * @returns 最终答案文本
 */
export async function executeReAct(
    model: BaseLanguageModel,
    tools: MCPToolDefinition[],
    toolExecutor: ToolExecutor,
    systemPrompt: string,
    userQuery: string,
    options: ReActAgentOptions = {}
): Promise<string> {
    const {
        maxIterations = 10,
        finalAnswerKeywords,
        logTag = "[ReAct]",
        verbose = false,
        autoInjectToolInstructions = true,
    } = options;

    // 格式化工具描述
    const toolsDescription = formatToolsDescription(tools);
    
    // 构建最终的系统提示词
    let finalSystemPrompt: string;
    
    if (autoInjectToolInstructions) {
        // 如果 systemPrompt 中包含 {tools} 占位符，替换它
        if (systemPrompt.includes('{tools}')) {
            finalSystemPrompt = systemPrompt.replace('{tools}', toolsDescription);
            // 检查是否已经包含 ReAct 格式说明，如果没有则添加
            if (!systemPrompt.includes('Thought:') && !systemPrompt.includes('Action:')) {
                finalSystemPrompt += '\n\n' + generateReActFormatInstructions();
            }
        } else {
            // 如果没有 {tools} 占位符，自动在末尾添加工具说明和 ReAct 格式说明
            finalSystemPrompt = systemPrompt + '\n\n' + generateReActInstructionsWithTools(toolsDescription);
        }
    } else {
        // 不自动注入，只替换 {tools} 占位符（如果存在）
        finalSystemPrompt = systemPrompt.replace('{tools}', toolsDescription);
    }
    
    // 转义系统提示词中的大括号
    const escapedSystemPrompt = escapeBracketsForLangChain(finalSystemPrompt);

    // 构建最终的用户查询（自动添加ReAct启动提示）
    const finalUserQuery = autoInjectToolInstructions
        ? `${userQuery}\n\n请开始工作。首先思考需要什么信息，然后调用相应的工具。记住：每次响应必须包含 Thought 和 Action（或 Final Answer）。`
        : userQuery;

    // 初始化消息历史
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
        {
            role: 'user',
            content: finalUserQuery,
        },
    ];

    let iteration = 0;

    while (iteration < maxIterations) {
        iteration++;
        if (verbose) {
            console.log(logTag, `迭代 ${iteration}/${maxIterations}`);
        }

        // 调用LLM
        const promptMessages: Array<['system' | 'user' | 'assistant', string]> = [
            ["system", escapedSystemPrompt],
        ];

        // 转义所有消息内容，防止 LangChain 解析大括号
        messages.forEach(msg => {
            promptMessages.push([msg.role, escapeBracketsForLangChain(msg.content)]);
        });

        const prompt = ChatPromptTemplate.fromMessages(promptMessages);
        const chain = RunnableSequence.from([prompt, model]);
        const llmResponse = (await chain.invoke({})).content as string;

        if (verbose) {
            console.log(logTag, `LLM响应长度: ${llmResponse.length}`);
            console.log(logTag, `LLM响应内容:\n${llmResponse.substring(0, 1000)}${llmResponse.length > 1000 ? '...' : ''}`);
        }

        // 添加LLM响应到消息历史
        messages.push({ role: 'assistant', content: llmResponse });

        // 检查是否是Final Answer
        if (isFinalAnswer(llmResponse, finalAnswerKeywords)) {
            if (verbose) {
                console.log(logTag, "检测到Final Answer");
            }
            return llmResponse;
        }

        // 解析Action
        const action = parseAction(llmResponse);
        if (!action) {
            if (verbose) {
                console.warn(logTag, "无法解析Action，LLM可能正在思考或准备给出Final Answer");
            }

            // 如果已经包含Final Answer的关键词，尝试提取
            if (isFinalAnswer(llmResponse, finalAnswerKeywords)) {
                if (verbose) {
                    console.log(logTag, "检测到Final Answer关键词");
                }
                return llmResponse;
            }

            // 提示LLM需要调用工具
            messages.push({
                role: 'user',
                content: '请按照格式调用工具：\nThought: <你的思考>\nAction: <工具名称>\nAction Input: <JSON参数>\n\n或者如果信息已足够，请给出Final Answer。',
            });
            continue;
        }

        if (verbose) {
            console.log(logTag, `执行工具: ${action.action}`, action.actionInput);
        }

        // 执行工具
        try {
            const toolResult = await toolExecutor(action.action, action.actionInput);
            const observation = formatObservation(toolResult);

            if (verbose) {
                console.log(logTag, `工具执行结果长度: ${observation.length}`);
            }

            // 添加观察结果到消息历史（转义大括号）
            messages.push({
                role: 'user',
                content: `Observation: ${escapeBracketsForLangChain(observation)}`,
            });
        } catch (error: any) {
            if (verbose) {
                console.error(logTag, "工具执行错误:", error);
            }
            messages.push({
                role: 'user',
                content: `Observation: 工具执行失败 - ${error.message}`,
            });
        }
    }

    // 如果达到最大迭代次数，返回最后一次响应
    if (verbose) {
        console.warn(logTag, `达到最大迭代次数 ${maxIterations}，返回最后一次响应`);
    }
    return messages[messages.length - 1].content;
}
