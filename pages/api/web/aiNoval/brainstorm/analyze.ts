import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import { IBrainstormAnalysisResult } from "@/src/types/IAiNoval";
import BrainstormService from "@/src/services/aiNoval/brainstormService";
import { mcpToolRegistry } from "@/src/mcp/core/mcpToolRegistry";
import { createDeepSeekModel } from "@/src/utils/ai/modelFactory";
import { executeReAct } from "@/src/utils/ai/reactAgent";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const LOG_TAG = "[brainstormAnalyze]";
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

function buildReActSystemPrompt(parentBrainstorms: any[]): string {
    const parentContext = parentBrainstorms.length > 0
        ? `\n\n重要：当前脑洞有${parentBrainstorms.length}个父脑洞，请在分析时考虑这些父脑洞的内容和关系：
${parentBrainstorms.map((p, idx) => `
父脑洞${idx + 1}：
- 标题：${p.title || '（无）'}
- 内容：${(p.content || '').substring(0, 200)}${(p.content || '').length > 200 ? '...' : ''}
- 类型：${p.brainstorm_type || '（无）'}
- 状态：${p.status || '（无）'}
${p.expanded_questions ? `- 扩展问题：${p.expanded_questions.substring(0, 150)}${p.expanded_questions.length > 150 ? '...' : ''}` : ''}
`).join('\n')}
分析时需要：
1. 检查当前脑洞与父脑洞之间是否存在逻辑冲突或矛盾
2. 评估当前脑洞如何继承或扩展父脑洞的设定
3. 考虑多个父脑洞之间的关联关系（如果有多个）
4. 在影响分析中，需要说明对父脑洞的影响或依赖关系`
        : '';

    return `你是脑洞分析专家。任务是通过 MCP 查阅世界观、世界态、阵营等信息，然后对给定的脑洞进行全面分析，产出结构化的分析结果。

工作步骤（必须按顺序使用工具收集信息后再给出 Final Answer）：
1. 调用 worldbook：获取世界观基础设定（物理、规则、文化基调）。
2. 调用 world_state：获取该世界观下的世界态列表，了解当前有哪些宏观状态。
3. 调用 faction_structure：获取势力树结构。
4. 若脑洞内容中涉及具体势力/组织名称，可调用 find_faction 按关键词检索相关阵营详情。
5. 若脑洞内容中涉及具体地理/地点名称，可调用 find_geo 按关键词检索相关地理详情。
6. 若脑洞内容中涉及具体角色名称，可调用 find_role 按关键词检索相关角色详情。
7. 在收集到足够信息后，给出 Final Answer，不要继续调用工具。${parentContext}

Final Answer 必须用自然语言写出，不要使用 JSON。必须且仅包含以下三个二级标题（Markdown 格式），每段下直接写分析内容：

## 影响分析
（说明该脑洞对世界观、世界态、阵营、角色等的影响；若有父脑洞，需说明与父脑洞的关系和影响。）

## 一致性检查
（说明与世界观、设定、时间线等是否一致；可给出 0-100 的一致性评分及简要理由。0-30 严重不一致，31-60 部分不一致，61-80 基本一致，81-100 完全一致。）

## 风险
（列出该脑洞可能带来的叙事或设定风险，用自然语言分点或分段说明即可。）

要求：
- 任何需要 worldview_id 的工具调用，必须使用请求中提供的 worldview_id。
- 本段仅做上述「影响分析、一致性检查、风险」三项，不要写建议、机会或创意延伸，那些由后续步骤单独生成。
- Final Answer 中不要出现 JSON、不要代码块，只输出上述三个标题与自然段。`;
}

/** 去掉 ReAct 返回内容中的 "Final Answer:" 前缀，得到纯自然语言 */
function stripFinalAnswerPrefix(raw: string): string {
    if (!raw || typeof raw !== "string") return "";
    const t = raw.trim();
    const m = t.match(/^Final\s+Answer\s*[：:]\s*/i);
    return m ? t.slice(m[0].length).trim() : t;
}

/** 第二段：生成建议与机会（自然语言，高温度，偏创意；与第一段严肃分析分离） */
async function generateSuggestionsAndOpportunitiesText(
    brainstorm: any,
    _stage1Text: string
): Promise<{ text: string; modelName: string }> {
    const modelConfig = {
        model: "deepseek-reasoner" as const,
        temperature: 0.78,
        frequencyPenalty: 0.4,
        presencePenalty: 0.3,
    };
    const model = createDeepSeekModel(modelConfig);

    const systemPrompt = `你是小说剧情脑洞顾问，负责「建议」和「机会」两部分，与前面的严谨分析步骤独立。
本段只做剧情向、创意向输出，风格可更轻松、开放，不必延续前文的严肃口吻。

要求：
- 不要输出 JSON，只输出自然语言。
- 至少包含两个二级标题（Markdown）：## 建议、## 机会。
- 建议：从剧情与写作角度给可操作、有启发性的建议，可涉及情节走向、角色可能、世界观扩展等，分点或分段写。
- 机会：从剧情构思角度写——该脑洞可延伸的剧情走向、可拓展的支线、人物弧光或冲突升级的可能等，为小说叙事服务，分点或分段写。
- 不要任何代码块、不要 JSON、不要多余说明，只写上述两个标题与正文。`;

    const userPrompt = [
        "请针对以下脑洞，直接输出「建议」与「机会」两个部分（自然语言即可，无需引用或复述前文分析）：",
        "",
        "标题：",
        (brainstorm.title || "（无）").trim(),
        "",
        "内容：",
        ((brainstorm.content || "").trim() || "（无）").substring(0, 600) + ((brainstorm.content || "").length > 600 ? "..." : ""),
        brainstorm.plot_planning?.trim()
            ? [
                "",
                "剧情规划：",
                (brainstorm.plot_planning || "").trim().substring(0, 400) + ((brainstorm.plot_planning || "").length > 400 ? "..." : ""),
            ].join("\n")
            : "",
        "",
        "请直接输出 ## 建议 与 ## 机会 两个小节。",
    ].filter(Boolean).join("\n");

    const messages = [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)];
    const rawContent = (await model.invoke(messages)).content;
    const response =
        typeof rawContent === "string"
            ? rawContent
            : Array.isArray(rawContent)
                ? (rawContent as any[]).map((c) => (typeof c === "string" ? c : (c as any)?.text ?? "")).join("")
                : String(rawContent ?? "");

    console.log(LOG_TAG, "第二段自然语言长度:", response.length);
    return {
        text: response.trim(),
        modelName: modelConfig.model,
    };
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<IBrainstormAnalysisResult>>
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
        console.log(LOG_TAG, "开始分析脑洞，ID:", brainstormId);

        // 先保存表单数据（如果提供了）
        const formData = (req.body as any)?.formData;
        if (formData && typeof formData === 'object') {
            console.log(LOG_TAG, "分析前先保存表单数据");
            // 只保存表单字段，不覆盖分析相关字段
            const formFields: any = {
                title: formData.title,
                brainstorm_type: formData.brainstorm_type,
                status: formData.status,
                priority: formData.priority,
                category: formData.category,
                content: formData.content,
                user_question: formData.user_question,
                expanded_questions: formData.expanded_questions,
                plot_planning: formData.plot_planning,
                chapter_outline: formData.chapter_outline,
                parent_ids: formData.parent_ids,
                tags: formData.tags,
                related_faction_ids: formData.related_faction_ids,
                related_role_ids: formData.related_role_ids,
                related_geo_codes: formData.related_geo_codes,
                related_event_ids: formData.related_event_ids,
                related_chapter_ids: formData.related_chapter_ids,
                related_world_state_ids: formData.related_world_state_ids,
            };
            // 移除 undefined 字段
            Object.keys(formFields).forEach(key => {
                if (formFields[key] === undefined) delete formFields[key];
            });
            await service.updateBrainstorm(brainstormId, formFields);
            console.log(LOG_TAG, "表单数据已保存");
        }

        // 更新分析状态为分析中
        await service.updateBrainstorm(brainstormId, { analysis_status: 'analyzing' });

        // 获取脑洞信息（重新获取，包含最新保存的表单数据）
        const brainstorm = await service.getBrainstormById(brainstormId);
        if (!brainstorm) {
            res.status(404).json({
                success: false,
                error: `Brainstorm not found, id: ${brainstormId}`,
            });
            return;
        }

        const parsedBrainstorm = parseBrainstorm(brainstorm);
        const worldviewId = parsedBrainstorm.worldview_id;

        if (!worldviewId) {
            res.status(400).json({
                success: false,
                error: "Brainstorm must have worldview_id",
            });
            return;
        }

        // 获取父脑洞信息
        const parentIds = parsedBrainstorm.parent_ids || 
                         (parsedBrainstorm.parent_id ? [parsedBrainstorm.parent_id] : []);
        const parentBrainstorms: any[] = [];
        
        if (parentIds.length > 0) {
            console.log(LOG_TAG, "加载父脑洞，数量:", parentIds.length);
            for (const parentId of parentIds) {
                try {
                    const parent = await service.getBrainstormById(parentId);
                    if (parent) {
                        parentBrainstorms.push(parseBrainstorm(parent));
                    }
                } catch (error) {
                    console.warn(LOG_TAG, `加载父脑洞 ${parentId} 失败:`, error);
                }
            }
        }

        // 初始化模型
        const modelConfig = {
            model: "deepseek-chat" as const,
            temperature: 0.3, // 分析任务使用较低温度，更稳定
        };
        let model;
        try {
            model = createDeepSeekModel(modelConfig);
        } catch (e: any) {
            console.error(LOG_TAG, "DeepSeek 模型初始化失败", e?.message);
            res.status(503).json({
                success: false,
                error: "分析服务未配置（需配置 DEEPSEEK_API_KEY）",
            });
            return;
        }

        // 准备工具执行器
        const tools = mcpToolRegistry.getAllToolDefinitions();
        const toolExecutor = async (name: string, args: Record<string, any> | string) => {
            let obj: Record<string, any> = {};
            if (typeof args === "object" && args !== null && !Array.isArray(args)) {
                obj = args;
            } else if (typeof args === "string") {
                try {
                    const parsed = JSON.parse(args);
                    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed))
                        obj = parsed;
                } catch {
                    // ignore
                }
            }
            const finalArgs = { ...obj, worldview_id: worldviewId };
            return await mcpToolRegistry.executeTool(name, finalArgs);
        };

        // 构建提示词
        const systemPrompt = buildReActSystemPrompt(parentBrainstorms);
        const userQuery = [
            "请分析以下脑洞：",
            `- 世界观 ID：${worldviewId}`,
            `- 脑洞标题：${parsedBrainstorm.title || "（无）"}`,
            `- 脑洞类型：${parsedBrainstorm.brainstorm_type || "（无）"}`,
            `- 脑洞内容：\n${(parsedBrainstorm.content || "").trim() || "（无）"}`,
            parsedBrainstorm.user_question?.trim()
                ? `- 用户原始问题：\n${parsedBrainstorm.user_question.trim()}`
                : "",
            parsedBrainstorm.expanded_questions?.trim()
                ? `- 扩展后的问题：\n${parsedBrainstorm.expanded_questions.trim()}`
                : "",
            parsedBrainstorm.plot_planning?.trim()
                ? `- 剧情规划：\n${parsedBrainstorm.plot_planning.trim()}`
                : "",
            parsedBrainstorm.category ? `- 内容分类：${parsedBrainstorm.category}` : "",
            parentBrainstorms.length > 0
                ? `\n- 父脑洞数量：${parentBrainstorms.length}（已在系统提示中提供详细信息）`
                : "",
        ].filter(Boolean).join("\n");

        console.log(LOG_TAG, "开始 ReAct 第一段分析，工具数:", tools.length, "父脑洞数:", parentBrainstorms.length);

        // 第一段：影响分析、一致性检查、风险（低温度）
        const llmOutput = await executeReAct(
            model,
            tools,
            toolExecutor,
            systemPrompt,
            userQuery,
            {
                maxIterations: 20,
                finalAnswerKeywords: ["## 影响分析"],
                logTag: LOG_TAG,
                verbose: true,
            }
        );

        console.log(LOG_TAG, "第一段 ReAct 完成，llmOutput 长度:", llmOutput?.length ?? 0);

        const stage1Text = stripFinalAnswerPrefix(llmOutput || "");
        if (!stage1Text) {
            console.error(LOG_TAG, "第一段无有效内容，原始输出:", llmOutput?.substring(0, 500));
            res.status(500).json({
                success: false,
                error: "分析未返回有效内容，请查看服务端日志",
            });
            return;
        }

        // 第二段：建议与机会（自然语言，高温度）
        console.log(LOG_TAG, "开始第二段生成（建议与机会，自然语言）");
        let stage2Text = "";
        let stage2ModelName = "";
        try {
            const stage2Result = await generateSuggestionsAndOpportunitiesText(parsedBrainstorm, stage1Text);
            stage2Text = stage2Result.text;
            stage2ModelName = stage2Result.modelName;
        } catch (e: any) {
            console.error(LOG_TAG, "第二段生成失败，仅保存第一段:", e?.message, e?.stack);
        }

        const analysisResult: IBrainstormAnalysisResult = {
            analysis_text: stage2Text ? [stage1Text, stage2Text].join("\n\n") : stage1Text,
        };
        console.log(LOG_TAG, "最终分析结果（自然语言）长度:", analysisResult.analysis_text?.length ?? 0);

        // 确定实际使用的模型名称（如果两段使用不同模型，记录为组合形式，如：deepseek-chat+deepseek-reasoner）
        const actualModelName = stage2ModelName && stage2ModelName !== modelConfig.model
            ? `${modelConfig.model}+${stage2ModelName}`
            : modelConfig.model;

        // 保存分析结果
        const updateData: any = {
            analysis_status: 'completed',
            analysis_result: JSON.stringify(analysisResult),
            analyzed_at: new Date(),
            analysis_model: actualModelName,
        };

        await service.updateBrainstorm(brainstormId, updateData);

        console.log(LOG_TAG, "分析完成并保存，ID:", brainstormId);

        res.status(200).json({
            success: true,
            data: analysisResult,
        });
    } catch (error: any) {
        const msg = error?.message ?? String(error);
        console.error(LOG_TAG, "Error", msg, error?.stack || "");
        
        // 更新状态为失败
        try {
            const { id } = req.query;
            if (id) {
                await service.updateBrainstorm(Number(id), {
                    analysis_status: 'failed',
                });
            }
        } catch (updateError) {
            console.error(LOG_TAG, "更新分析状态失败:", updateError);
        }

        if (!res.writableEnded) {
            res.status(500).json({
                success: false,
                error: msg || "分析失败",
            });
        }
    }
}
