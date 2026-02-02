import { NextApiRequest, NextApiResponse } from "next";
import findRole from "@/src/domain/novel/findRole";
import findFaction from "@/src/domain/novel/findFaction";
import findGeo from "@/src/domain/novel/findGeo";
import { ChatOpenAI } from "@langchain/openai";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import _ from 'lodash';
import { getRelationTypeText } from "@/src/business/aiNoval/factionManage/utils/relationTypeMap";
import type { IFactionRelation } from "@/src/types/IAiNoval";

interface Data {
    message?: string;
    data?: any;
    outputs?: {
        output?: string;
    };
    status?: string;
    error?: string;
    elapsed_time?: number;
}

// 分解名称字符串（支持中文逗号和英文逗号）
function splitNames(names: string): string[] {
    if (!names || names.trim().length === 0) {
        return [];
    }
    return names.replace('，', ',').split(',').map(n => n.trim()).filter(n => n.length > 0);
}

// 构建提示词模板
function buildPromptTemplate(attension: string): string {
    const defaultAttension = `* 扩写时，请仔细分析用户提供的片段，理解其含义和作用。
* 扩写时，请充分利用前情提要和相关设定，为故事增加细节和深度。
* 扩写时，请注意人物的心理活动和行为动机，使人物更加立体和真实。
* 扩写时，请注意情节的节奏和悬念，使故事更加引人入胜。`;

    const attensionText = attension && attension.trim().length > 0 ? attension : defaultAttension;

    return `\`\`\`xml

<instruction>

<title>小说片段扩写</title>


<description>

本任务旨在根据用户提供的待扩写小说片段、前情提要和相关设定，进行扩写，使故事更加丰满、情节更加引人入胜。扩写时需保持原片段的风格、基调和人物性格，并在此基础上进行合理的补充和发展。请务必仔细阅读前情提要和相关设定，确保扩写内容与原故事背景一致，并符合逻辑。扩写内容应避免出现与原设定相悖的情节或人物行为。

</description>


<section title="任务目标">

1. 扩写用户提供的待扩写小说片段，使其内容更加丰富、细节更加生动。

2. 保持原片段的风格、基调和人物性格。

3. 确保扩写内容与前情提要和相关设定一致，符合逻辑。

4. 避免出现与原设定相悖的情节或人物行为。

5. 扩写后的内容应流畅自然，易于理解。

6. 只需要扩写"待扩写片段"，并与前情提要做好衔接即可；

7.使用2010年后中文网络化的表达，避免出现翻译腔，避免出现古代表达；

8.使用流畅、自然的动作与场景描写；减少不必要的形容词；

</section>


<section title="输入信息">

* **待扩写小说片段:** 用户提供的需要扩写的片段。

* **前情提要:** 故事的背景介绍、主要人物关系、已发生的重要事件等。

* **相关设定:** 故事的世界观、规则、文化、技术等。

</section>


<section title="输出要求">

* 扩写后的小说片段，应与前情提要衔接顺畅。

* 扩写内容应保持与相关设定一致的人物性格、人物设定。

* 扩写内容应符合前情提要和相关设定的逻辑。

* 扩写后的内容应流畅自然，易于理解。

* 输出内容应为纯文本，严禁包含任何XML标签。

</section>


<section title="注意事项">

${attensionText}

</section>


<section title="相关设定">

{{context}}

</section>\`\`\``;
}

// 构建用户输入
function buildUserInput(prevContent: string, currContext: string): string {
    let parts: string[] = [];
    
    if (prevContent && prevContent.trim().length > 0) {
        parts.push(`【章节背景】: ${prevContent}`);
    }
    
    if (currContext && currContext.trim().length > 0) {
        parts.push(`【本章待写内容】：${currContext}`);
    }
    
    return parts.join('\n\n');
}

// 构建阵营设定内容（融入 faction 新字段：类型、文化、地理命名规范等）
function buildFactionContent(faction: {
    name?: string | null;
    description?: string | null;
    faction_type?: string | null;
    faction_culture?: string | null;
    ideology_or_meme?: string | null;
    scale_of_operation?: string | null;
    decision_taboo?: string | null;
    primary_threat_model?: string | null;
    internal_contradictions?: string | null;
    legitimacy_source?: string | null;
    known_dysfunctions?: string | null;
    geo_naming_habit?: string | null;
    geo_naming_suffix?: string | null;
    geo_naming_prohibition?: string | null;
}): string {
    const lines: string[] = [];
    if (faction.name) lines.push(`阵营：${faction.name}`);
    if (faction.description) lines.push(faction.description);
    if (faction.faction_type) lines.push(`类型：${faction.faction_type}`);
    if (faction.faction_culture) lines.push(`文化：${faction.faction_culture}`);
    if (faction.scale_of_operation) lines.push(`决策尺度：${faction.scale_of_operation}`);
    if (faction.ideology_or_meme) lines.push(`意识形态/梗文化：${faction.ideology_or_meme}`);
    if (faction.legitimacy_source) lines.push(`正统来源：${faction.legitimacy_source}`);
    if (faction.decision_taboo) lines.push(`决策禁忌：${faction.decision_taboo}`);
    if (faction.internal_contradictions) lines.push(`内部矛盾：${faction.internal_contradictions}`);
    if (faction.primary_threat_model) lines.push(`最大威胁：${faction.primary_threat_model}`);
    if (faction.known_dysfunctions) lines.push(`已知功能障碍：${faction.known_dysfunctions}`);
    // 地理命名规范：扩写时涉及该阵营控制区内的地名，应遵循以下规则
    if (faction.geo_naming_habit || faction.geo_naming_suffix || faction.geo_naming_prohibition) {
        lines.push('--- 地理命名规范（涉及该阵营地名时请遵循）---');
        if (faction.geo_naming_habit) lines.push(`命名习惯：${faction.geo_naming_habit}`);
        if (faction.geo_naming_suffix) lines.push(`命名后缀：${faction.geo_naming_suffix}`);
        if (faction.geo_naming_prohibition) lines.push(`命名禁忌：${faction.geo_naming_prohibition}`);
    }
    return lines.join('\n').trim();
}

// 按 relation 唯一键去重（优先 id，否则 来源-目标-类型）
function deduplicateRelations(relations: IFactionRelation[]): IFactionRelation[] {
    const seen = new Map<string, IFactionRelation>();
    for (const r of relations) {
        const key = r.id != null ? String(r.id) : `${r.source_faction_id}-${r.target_faction_id}-${r.relation_type}`;
        if (!seen.has(key)) seen.set(key, r);
    }
    return Array.from(seen.values());
}

// 格式化单条阵营关系供上下文使用
function formatRelationForContext(
    relation: IFactionRelation,
    factionIdToName: Map<number, string>
): string {
    const srcName = relation.source_faction_name ?? factionIdToName.get(relation.source_faction_id) ?? `阵营${relation.source_faction_id}`;
    const tgtName = relation.target_faction_name ?? factionIdToName.get(relation.target_faction_id) ?? `阵营${relation.target_faction_id}`;
    const typeText = getRelationTypeText(relation.relation_type);
    const desc = relation.description?.trim() ? `：${relation.description}` : '';
    return `${srcName} → ${tgtName}（${typeText}）${desc}`;
}

// 聚合所有检索结果
function aggregateContext(results: { roles: any[], factions: any[], geographies: any[], factionRelationsSection?: string }): string {
    const parts: string[] = [];

    if (results.roles.length > 0) {
        parts.push('【角色设定】');
        results.roles.forEach(role => {
            if (role.content) {
                parts.push(role.content);
            }
        });
        parts.push('');
    }

    if (results.factions.length > 0) {
        parts.push('【阵营设定】');
        results.factions.forEach(faction => {
            if (faction.content) {
                parts.push(faction.content);
            }
        });
        parts.push('');
    }

    if (results.factionRelationsSection && results.factionRelationsSection.trim().length > 0) {
        parts.push('【阵营关系】');
        parts.push(results.factionRelationsSection);
        parts.push('');
    }

    if (results.geographies.length > 0) {
        parts.push('【地理环境】');
        results.geographies.forEach(geo => {
            if (geo.content) {
                parts.push(geo.content);
            }
        });
        parts.push('');
    }

    return parts.join('\n');
}

// 调用 LLM
async function callLLM(
    llmType: string,
    systemPrompt: string,
    userInput: string,
    context: string
): Promise<string> {
    const systemPromptWithContext = systemPrompt.replace('{{context}}', context);
    const effectiveType = llmType || 'gemini';

    // 根据 llmType 选择模型
    if (effectiveType === 'deepseek') {
        console.debug('[genChapter] callLLM using deepseek-reasoner');
        const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
        if (!DEEPSEEK_API_KEY) {
            throw new Error('DEEPSEEK_API_KEY is not configured');
        }

        const model = new ChatDeepSeek({
            apiKey: DEEPSEEK_API_KEY,
            model: "deepseek-reasoner",
            temperature: 0.9,
        });

        // 使用 ChatPromptTemplate 构建消息
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", systemPromptWithContext],
            ["user", userInput]
        ]);
        
        const chain = RunnableSequence.from([prompt, model]);
        const response = await chain.invoke({});
        
        return response.content as string;
    } else {
        // 默认使用 Gemini（通过 OpenRouter）
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        if (!OPENROUTER_API_KEY) {
            throw new Error('OPENROUTER_API_KEY is not configured');
        }

        const modelName = effectiveType === 'gemini3' || effectiveType?.includes('gemini3') 
            ? 'google/gemini-2.0-flash-exp:free'
            : 'google/gemini-2.5-pro';
        console.debug('[genChapter] callLLM using OpenRouter', { modelName });

        const model = new ChatOpenAI({
            model: modelName,
            temperature: 0.9,
            configuration: {
                apiKey: OPENROUTER_API_KEY,
                baseURL: "https://openrouter.ai/api/v1",
            },
        });

        // 使用 ChatPromptTemplate 构建消息
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", systemPromptWithContext],
            ["user", userInput]
        ]);
        
        const chain = RunnableSequence.from([prompt, model]);
        const response = await chain.invoke({});
        
        return response.content as string;
    }
}

async function handleGenChapter(req: NextApiRequest, res: NextApiResponse<Data>) {
    const startTime = Date.now();
    let worldviewId = String(req.query.worldviewId);

    console.debug('[genChapter] start', { worldviewId });

    if (!worldviewId) {
        res.status(500).json({ message: 'worldviewId is required' });
        return;
    }

    const inputs = { ...req.body };
    const {
        prev_content = '',
        curr_context = '',
        role_names = '',
        faction_names = '',
        geo_names = '',
        attension = '',
        attention = '', // 兼容调用代码中的 attention 参数名
        llm_type = '',
        extra_settings = '' // 兼容调用代码，但不处理（已移除功能）
    } = inputs;

    // 使用 attension 或 attention（优先使用 attension，向后兼容）
    const attensionText = attension || attention;

    console.debug('[genChapter] inputs', {
        worldviewId,
        prev_content_len: prev_content?.length ?? 0,
        curr_context_len: curr_context?.length ?? 0,
        role_names: role_names || '(empty)',
        faction_names: faction_names || '(empty)',
        geo_names: geo_names || '(empty)',
        llm_type: llm_type || 'gemini',
        has_attension: !!attensionText
    });

    const worldviewIdNum = _.toNumber(worldviewId);
    const aggregatedResults: {
        roles: any[];
        factions: any[];
        geographies: any[];
        factionRelationsSection?: string;
    } = {
        roles: [],
        factions: [],
        geographies: []
    };

    try {
        // 1. 处理角色名（使用 findRole，已融合知识库+数据库）
        if (role_names && role_names.trim().length > 0) {
            const roleNameList = splitNames(role_names);
            console.debug('[genChapter] findRole', { roleNameList });
            for (const roleName of roleNameList) {
                const roleResults = await findRole(worldviewIdNum, [roleName], 0.5);
                console.debug('[genChapter] findRole result', { roleName, count: roleResults.length });
                roleResults.forEach(role => {
                    const content = `角色：${role.name_in_worldview || ''}\n${role.background || ''}\n${role.personality || ''}`.trim();
                    if (content.length > 0) {
                        aggregatedResults.roles.push({ content });
                    }
                });
            }
        }

        // 2. 处理阵营名（使用 findFaction，已融合知识库+数据库）
        if (faction_names && faction_names.trim().length > 0) {
            const factionNameList = splitNames(faction_names);
            console.debug('[genChapter] findFaction', { factionNameList });
            const factionIdToName = new Map<number, string>();
            const allRelations: IFactionRelation[] = [];
            for (const factionName of factionNameList) {
                const factionResults = await findFaction(worldviewIdNum, [factionName], 0.5);
                console.debug('[genChapter] findFaction result', { factionName, count: factionResults.length });
                factionResults.forEach(faction => {
                    if (faction.id != null && faction.name) {
                        factionIdToName.set(faction.id, faction.name);
                    }
                    if (Array.isArray(faction.relations) && faction.relations.length > 0) {
                        allRelations.push(...faction.relations);
                    }
                    const content = buildFactionContent(faction);
                    if (content.length > 0) {
                        aggregatedResults.factions.push({ content });
                    }
                });
            }
            // 阵营关系去重并生成上下文片段
            const uniqueRelations = deduplicateRelations(allRelations);
            if (uniqueRelations.length > 0) {
                aggregatedResults.factionRelationsSection = uniqueRelations
                    .map(r => formatRelationForContext(r, factionIdToName))
                    .filter(Boolean)
                    .join('\n');
                console.debug('[genChapter] faction relations', { total: allRelations.length, unique: uniqueRelations.length });
            }
        }

        // 3. 处理地理名（使用 findGeo，已融合知识库+数据库）
        if (geo_names && geo_names.trim().length > 0) {
            const geoNameList = splitNames(geo_names);
            console.debug('[genChapter] findGeo', { geoNameList });
            for (const geoName of geoNameList) {
                const geoResults = await findGeo(worldviewIdNum, [geoName], 0.5);
                console.debug('[genChapter] findGeo result', { geoName, count: geoResults.length });
                geoResults.forEach(geo => {
                    const content = `${geo.name || ''}\n${geo.description || ''}`.trim();
                    if (content.length > 0) {
                        aggregatedResults.geographies.push({ content });
                    }
                });
            }
        }

        console.debug('[genChapter] aggregated', {
            roles: aggregatedResults.roles.length,
            factions: aggregatedResults.factions.length,
            geographies: aggregatedResults.geographies.length
        });

        // 4. 聚合上下文
        const context = aggregateContext(aggregatedResults);
        console.debug('[genChapter] context length', context.length);

        // 5. 构建提示词
        const systemPrompt = buildPromptTemplate(attensionText);
        const userInput = buildUserInput(prev_content, curr_context);
        console.debug('[genChapter] userInput length', userInput.length);

        // 6. 调用 LLM
        const effectiveLlmType = llm_type || 'gemini';
        console.debug('[genChapter] callLLM', { llmType: effectiveLlmType });
        const llmStart = Date.now();
        const output = await callLLM(effectiveLlmType, systemPrompt, userInput, context);
        console.debug('[genChapter] callLLM done', { outputLen: output?.length ?? 0, ms: Date.now() - llmStart });

        const elapsedTime = Date.now() - startTime;
        console.debug('[genChapter] success', { elapsedTime, outputLen: output?.length ?? 0 });

        // 返回结构兼容 genChapterLegacy（Dify workflow 返回格式）
        res.status(200).json({
            data: {
                outputs: {
                    output
                },
                status: 'success',
                error: '', // 兼容调用代码期望的 error 字段
                elapsed_time: elapsedTime
            }
        });

    } catch (error: any) {
        const elapsedTime = Date.now() - startTime;
        console.error('[genChapter] error', { error: error?.message, stack: error?.stack, elapsedTime });
        // 错误时也返回 200 状态码，但 data.status 为 'error'，兼容 genChapterLegacy 的行为
        res.status(200).json({
            data: {
                outputs: { output: '' },
                status: 'error',
                error: error?.message || 'Unknown error',
                elapsed_time: elapsedTime
            }
        });
    }
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    let processerFn: Function | undefined = undefined;
    switch (req.method) {
        case 'POST':
            processerFn = handleGenChapter;
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' });
        return;
    }

    processerFn(req, res);
}
