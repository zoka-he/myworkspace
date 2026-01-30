import { NextApiRequest, NextApiResponse } from "next";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import _ from "lodash";
import findGeo from "@/src/domain/novel/findGeo";
import findFaction from "@/src/domain/novel/findFaction";
import findRole from "@/src/domain/novel/findRole";

interface Data {
    message?: string;
    data?: any;
    outputs?: {
        related_geo?: string;
        related_faction?: string;
        related_roles?: string;
    };
}

// 从章节提示词中提取关键词用于语义搜索
function extractKeywords(chapterPrompt: string): string[] {
    if (!chapterPrompt || chapterPrompt.trim().length === 0) {
        return [];
    }
    
    // 简单的关键词提取：去除标点，按空格分割，过滤掉常见停用词
    const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']);
    
    const words = chapterPrompt
        .replace(/[，。！？；：、\s\n\r\t]/g, ' ')
        .split(' ')
        .map(w => w.trim())
        .filter(w => w.length > 0 && w.length <= 10 && !stopWords.has(w));
    
    // 去重并限制数量
    const keywords = Array.from(new Set(words)).slice(0, 10);
    
    // 如果提取的关键词为空，使用整个章节提示词（截取前100字符）作为关键词
    if (keywords.length === 0 && chapterPrompt.trim().length > 0) {
        const truncatedPrompt = chapterPrompt.trim().substring(0, 100);
        return [truncatedPrompt];
    }
    
    return keywords;
}

// 使用 findGeo 获取相关地理数据（结合向量数据库和数据库）
async function getGeoList(worldviewId: string, chapterPrompt: string): Promise<any[]> {
    const worldviewIdNum = _.toNumber(worldviewId);
    const keywords = extractKeywords(chapterPrompt);
    
    if (keywords.length === 0) {
        console.warn('[genRole] No keywords extracted from chapter prompt for geo search');
        return [];
    }
    
    // 使用 findGeo 进行语义搜索，阈值设为 0.3 以获取更多相关结果
    const geoResults = await findGeo(worldviewIdNum, keywords, 0.3);
    
    return geoResults;
}

// 使用 findFaction 获取相关阵营数据（结合向量数据库和数据库）
async function getFactionList(worldviewId: string, chapterPrompt: string): Promise<any[]> {
    const worldviewIdNum = _.toNumber(worldviewId);
    const keywords = extractKeywords(chapterPrompt);
    
    if (keywords.length === 0) {
        console.warn('[genRole] No keywords extracted from chapter prompt for faction search');
        return [];
    }
    
    // 使用 findFaction 进行语义搜索，阈值设为 0.3 以获取更多相关结果
    const factionResults = await findFaction(worldviewIdNum, keywords, 0.3);
    
    return factionResults;
}

// 使用 findRole 获取相关角色数据（结合向量数据库和数据库）
async function getCharacterList(worldviewId: string, chapterPrompt: string): Promise<any[]> {
    const worldviewIdNum = _.toNumber(worldviewId);
    const keywords = extractKeywords(chapterPrompt);
    
    if (keywords.length === 0) {
        console.warn('[genRole] No keywords extracted from chapter prompt for role search');
        return [];
    }
    
    // 使用 findRole 进行语义搜索，阈值设为 0.3 以获取更多相关结果
    const roleResults = await findRole(worldviewIdNum, keywords, 0.3);
    
    return roleResults;
}

// 转义 JSON 字符串中的大括号，防止 LangChain 将其解析为模板变量
// LangChain 使用 {{ 和 }} 作为模板变量标记，需要转义为 {{{{ 和 }}}}
function escapeBracketsForLangChain(text: string): string {
    return text.replace(/\{/g, '{{').replace(/\}/g, '}}');
}

// LLM 分析地理
async function analyzeGeo(
    chapterPrompt: string,
    geoData: any[],
    openRouterApiKey: string
): Promise<string> {
    const geoJson = JSON.stringify(geoData, null, 2);
    const escapedGeoJson = escapeBracketsForLangChain(geoJson);
    
    // 转义 JSON 中的大括号，避免 LangChain 解析问题
    const systemPrompt = '【你的角色与任务背景】\n\n' +
        '你现在的角色是一名资深的中文网络小说写手，现在，你正在考虑做人物设定的前期准备，当前正在准备地理背景。\n\n\n' +
        '【小说的世界观】\n\n' +
        '在用户设定的世界观里，已经有了比较详细的地理设定，它将以JSON形式呈现：\n\n' +
        '```json\n\n' +
        escapedGeoJson +
        '\n\n```\n\n\n\n' +
        '【任务】\n\n' +
        '1.你将会收到用户将要构思的情节描述\n\n' +
        '2.用户的描述会阐明章节情节，挑选发生的大致地理位置\n\n\n' +
        '【任务解决步骤】\n\n' +
        '1.首先，你需要大致确定这个剧情关联到哪些地点，选择1~5个\n\n' +
        '2.你会得到详尽的地点描述，其中，必定包含地点的id，你需要寻找parent_id与之一致的地点，全部找出';

    const userPrompt = chapterPrompt;

    const model = new ChatOpenAI({
        model: "openai/gpt-4o",
        temperature: 0.7,
        configuration: {
            apiKey: openRouterApiKey,
            baseURL: "https://openrouter.ai/api/v1",
        },
    });

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        ["user", userPrompt]
    ]);

    const chain = RunnableSequence.from([prompt, model]);
    const response = await chain.invoke({});
    
    return response.content as string;
}

// LLM 分析阵营
async function analyzeFaction(
    chapterPrompt: string,
    factionData: any[],
    openRouterApiKey: string
): Promise<string> {
    const factionJson = JSON.stringify(factionData, null, 2);
    const escapedFactionJson = escapeBracketsForLangChain(factionJson);
    
    // 转义 JSON 中的大括号，避免 LangChain 解析问题
    const systemPrompt = '【你的角色与任务背景】\n\n' +
        '你现在的角色是一名资深的中文网络小说写手，现在，你正在考虑做人物设定的前期准备，当前正在准备地理背景。\n\n\n' +
        '【小说的世界观】\n\n' +
        '在用户设定的世界观里，已经有了比较详细的阵营设定，它将以JSON形式呈现：\n\n' +
        '```json\n\n' +
        escapedFactionJson +
        '\n\n```\n\n\n\n' +
        '【任务】\n\n' +
        '1.你将会收到用户将要构思的情节描述\n\n' +
        '2.用户的描述会阐明章节情节，挑选发生的大致阵营\n\n' +
        '3.输出内容包含阵营的名称、简要描述\n\n\n' +
        '【任务解决步骤】\n\n' +
        '1.首先，你需要大致确定这个剧情关联到哪些阵营，选择1~5个，确保不要选中无关阵营\n\n' +
        '2.你会得到详尽的阵营描述，其中，阵营信息必定包含阵营的id，你需要继续寻找parent_id与之一致的阵营，全部找出，是为子阵营；\n\n' +
        '3.对第2步的结果再进行一次迭代，1、2、3步加起来即为最终输出的阵营；';

    const userPrompt = chapterPrompt;

    const model = new ChatOpenAI({
        model: "openai/gpt-4o",
        temperature: 0.7,
        configuration: {
            apiKey: openRouterApiKey,
            baseURL: "https://openrouter.ai/api/v1",
        },
    });

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        ["user", userPrompt]
    ]);

    const chain = RunnableSequence.from([prompt, model]);
    const response = await chain.invoke({});
    
    return response.content as string;
}

// LLM 创造人物
async function createCharacters(
    chapterPrompt: string,
    nameStyle: string,
    extraPrompt: string,
    relatedGeo: string,
    relatedFaction: string,
    characterData: any[],
    openRouterApiKey: string
): Promise<string> {
    const characterJson = JSON.stringify(characterData, null, 2);
    const escapedCharacterJson = escapeBracketsForLangChain(characterJson);
    const escapedRelatedGeo = escapeBracketsForLangChain(relatedGeo);
    const escapedRelatedFaction = escapeBracketsForLangChain(relatedFaction);
    const escapedChapterPrompt = escapeBracketsForLangChain(chapterPrompt);
    const escapedNameStyle = escapeBracketsForLangChain(nameStyle);
    const escapedExtraPrompt = escapeBracketsForLangChain(extraPrompt);
    
    // 转义所有可能包含大括号的内容，避免 LangChain 解析问题
    const systemPrompt = '【你的角色与任务背景】\n\n' +
        '你现在的角色是一名资深的中文网络小说写手，现在，你正在考虑做人物设定的前期准备，当前正在准备地理背景。\n\n\n' +
        '【任务】\n\n' +
        '1.你将会收到用户将要构思的情节描述\n\n' +
        '2.用户的描述会阐明章节情节，情节发生的大致地理位置、所属阵营\n\n' +
        '3.在阵营、地理设定中，你可以根据id、parent_id推理得到这些对象的父子关系，如果你选择的地理、阵营包含子阵营，你需要把子阵营也纳入考虑范围\n\n' +
        '4.请你挑选3~5个能够提供剧情人物，并以自然语言的方式描述\n\n' +
        '5.请你构思3~5个能够提供剧情的新人物，并以自然语言的方式描述\n\n\n' +
        '【任务解决步骤】\n\n' +
        '1.首先，需要大致确定这个剧情关联到哪些阵营\n\n' +
        '2.其次，再大致确定这个剧情关联到地理设定\n\n' +
        '3.根据剧情、1~2步挑选的阵营、3~4步挑选的地点，你已经有了相关的地理、文化设定基础，你现在可以挑选3~5个已有的，能够提供剧情人物。\n\n' +
        '4.根据剧情、1~2步挑选的阵营、3~4步挑选的地点，你已经有了相关的地理、文化设定基础，再构思3~5个能够提供剧情的新人物，要注明必要属性：姓名、背景出身、立场、性格、剧情行为。\n\n' +
        '5.对于4的补充，角色思想需具备深度和灵活性，不与身份锁死，考虑符合剧情的多种自由度';

    const userMessages = [
        '章节提示词开始：\n\n' + escapedChapterPrompt + '\n\n\n章节提示词结束。\n\n首先，让我们构思一下关联阵营',
        escapedRelatedFaction,
        '再让我们构思一下关联地理',
        escapedRelatedGeo,
        '现在，我提供一批已有的角色数据：' + escapedCharacterJson + '\n\n\n让我们连续做两步：\n\n' +
        '1.挑选3~5个已有的，能够提供剧情人物；\n\n' +
        '2.构思6~8个能够提供剧情的新人物，采用' + escapedNameStyle + '的命名风格\n\n' +
        '3.对于步骤2的额外要求，从下一行开始：\n\n' + escapedExtraPrompt + '\n\n对步骤2的额外要求结束；'
    ];

    const model = new ChatOpenAI({
        model: "google/gemini-2.5-pro",
        temperature: 1,
        configuration: {
            apiKey: openRouterApiKey,
            baseURL: "https://openrouter.ai/api/v1",
        },
    });

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        ["user", userMessages[0]],
        ["assistant", userMessages[1]],
        ["user", userMessages[2]],
        ["assistant", userMessages[3]],
        ["user", userMessages[4]]
    ]);

    const chain = RunnableSequence.from([prompt, model]);
    const response = await chain.invoke({});
    
    return response.content as string;
}

// LLM 挑选人物
async function selectCharacters(
    chapterPrompt: string,
    extraPrompt: string,
    relatedGeo: string,
    relatedFaction: string,
    characterData: any[],
    openRouterApiKey: string
): Promise<string> {
    const characterJson = JSON.stringify(characterData, null, 2);
    const escapedCharacterJson = escapeBracketsForLangChain(characterJson);
    const escapedRelatedGeo = escapeBracketsForLangChain(relatedGeo);
    const escapedRelatedFaction = escapeBracketsForLangChain(relatedFaction);
    const escapedChapterPrompt = escapeBracketsForLangChain(chapterPrompt);
    const escapedExtraPrompt = escapeBracketsForLangChain(extraPrompt);
    
    // 转义所有可能包含大括号的内容，避免 LangChain 解析问题
    const systemPrompt = '【你的角色与任务背景】\n\n' +
        '你现在的角色是一名资深的中文网络小说写手，现在，你正在考虑做人物设定的前期准备，当前正在准备地理背景。\n\n\n' +
        '【任务】\n\n' +
        '1.你将会收到用户将要构思的情节描述\n\n' +
        '2.用户的描述会阐明章节情节，情节发生的大致地理位置、所属阵营\n\n' +
        '3.在阵营、地理设定中，你可以根据id、parent_id推理得到这些对象的父子关系，如果你选择的地理、阵营包含子阵营，你需要把子阵营也纳入考虑范围\n\n' +
        '4.请你挑选1~7个能够提供剧情人物，并以自然语言的方式描述\n\n\n' +
        '【任务解决步骤】\n\n' +
        '1.首先，需要大致确定这个剧情关联到哪些阵营\n\n' +
        '2.其次，再大致确定这个剧情关联到地理设定\n\n' +
        '3.根据剧情、1~2步挑选的阵营、3~4步挑选的地点，你已经有了相关的地理、文化设定基础，你现在可以挑选1~7个已有的，能够提供剧情人物。\n\n' +
        '5.对于3的补充，角色剧情需具备深度和灵活性，不与身份锁死，考虑符合剧情的多种自由度';

    const userMessages = [
        '章节提示词开始：\n\n' + escapedChapterPrompt + '\n\n\n章节提示词结束。\n\n首先，让我们构思一下关联阵营',
        escapedRelatedFaction,
        '再让我们构思一下关联地理',
        escapedRelatedGeo,
        '现在，我提供一批已有的角色数据：' + escapedCharacterJson + '\n\n\n让我们连续做4步：\n\n' +
        '1.挑选能够提供剧情人物；\n\n' +
        '2.阐述剧情人物能够推动哪些剧情；\n\n' +
        '3.剧情可以往哪个方向发展？\n\n' +
        '4.额外要求，从下一行开始：\n\n' + escapedExtraPrompt + '\n\n额外要求结束；'
    ];

    const model = new ChatOpenAI({
        model: "google/gemini-2.5-pro",
        temperature: 1,
        configuration: {
            apiKey: openRouterApiKey,
            baseURL: "https://openrouter.ai/api/v1",
        },
    });

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        ["user", userMessages[0]],
        ["assistant", userMessages[1]],
        ["user", userMessages[2]],
        ["assistant", userMessages[3]],
        ["user", userMessages[4]]
    ]);

    const chain = RunnableSequence.from([prompt, model]);
    const response = await chain.invoke({});
    
    return response.content as string;
}

async function handlePick(req: NextApiRequest, res: NextApiResponse<Data>) {
    const startTime = Date.now();
    let worldviewId = String(req.query.worldviewId);
    
    if (!worldviewId) {
        res.status(500).json({ message: 'worldviewId is required' });
        return;
    }

    let inputs = { ...req.body };
    const {
        chapter_prompt = '',
        name_style = '',
        extra_prompt = '',
        worldview_id = worldviewId,
        is_create_character = 0
    } = inputs;

    // 获取 OpenRouter API Key（从环境变量或配置）
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
        res.status(500).json({ message: 'OPENROUTER_API_KEY is not configured' });
        return;
    }
    
    // 验证 API Key 格式（OpenRouter API Key 通常以 sk-or-v1- 开头）
    if (!OPENROUTER_API_KEY.startsWith('sk-or-v1-') && !OPENROUTER_API_KEY.startsWith('sk-')) {
        console.warn('[genRole] OpenRouter API Key format may be incorrect. Expected format: sk-or-v1-... or sk-...');
    }
    
    console.debug('[genRole] OpenRouter API Key configured', { 
        keyPrefix: OPENROUTER_API_KEY.substring(0, 10) + '...',
        keyLength: OPENROUTER_API_KEY.length 
    });

    try {
        console.debug('[genRole] start', { worldviewId, is_create_character, chapterPromptLength: chapter_prompt.length });

        // 1. 并行获取三个工具的数据（基于章节提示词进行语义搜索）
        const [geoData, factionData, characterData] = await Promise.all([
            getGeoList(worldviewId, chapter_prompt),
            getFactionList(worldviewId, chapter_prompt),
            getCharacterList(worldviewId, chapter_prompt)
        ]);

        console.debug('[genRole] data fetched', {
            geoCount: geoData.length,
            factionCount: factionData.length,
            characterCount: characterData.length
        });

        // 2. 并行分析地理和阵营
        const [relatedGeo, relatedFaction] = await Promise.all([
            analyzeGeo(chapter_prompt, geoData, OPENROUTER_API_KEY),
            analyzeFaction(chapter_prompt, factionData, OPENROUTER_API_KEY)
        ]);

        console.debug('[genRole] geo and faction analyzed');

        // 3. 根据 is_create_character 条件分支
        let relatedRoles: string;
        if (Number(is_create_character) === 1) {
            // 创造人物
            relatedRoles = await createCharacters(
                chapter_prompt,
                name_style,
                extra_prompt,
                relatedGeo,
                relatedFaction,
                characterData,
                OPENROUTER_API_KEY
            );
        } else {
            // 挑选人物
            relatedRoles = await selectCharacters(
                chapter_prompt,
                extra_prompt,
                relatedGeo,
                relatedFaction,
                characterData,
                OPENROUTER_API_KEY
            );
        }

        console.debug('[genRole] characters processed');

        const elapsedTime = Date.now() - startTime;
        console.debug('[genRole] success', { elapsedTime });

        // 返回兼容 Dify 工作流的格式
        res.status(200).json({
            data: {
                outputs: {
                    related_geo: relatedGeo,
                    related_faction: relatedFaction,
                    related_roles: relatedRoles
                }
            }
        });

    } catch (error: any) {
        const elapsedTime = Date.now() - startTime;
        const errorMessage = error?.message || 'Unknown error';
        const errorStatus = error?.status || error?.response?.status;
        
        console.error('[genRole] error', { 
            error: errorMessage, 
            status: errorStatus,
            stack: error?.stack, 
            elapsedTime,
            hasApiKey: !!OPENROUTER_API_KEY,
            apiKeyPrefix: OPENROUTER_API_KEY ? OPENROUTER_API_KEY.substring(0, 10) + '...' : 'N/A'
        });
        
        // 如果是认证错误，提供更详细的错误信息
        if (errorStatus === 401 || errorMessage.includes('401') || errorMessage.includes('User not found')) {
            const detailedMessage = 'OpenRouter API 认证失败。请检查 OPENROUTER_API_KEY 环境变量是否正确设置且有效。确保 API Key 格式正确（通常以 sk-or-v1- 开头）且未过期。';
            console.error('[genRole] Authentication error details:', {
                errorMessage,
                apiKeyPrefix: OPENROUTER_API_KEY ? OPENROUTER_API_KEY.substring(0, 10) + '...' : 'N/A',
                apiKeyLength: OPENROUTER_API_KEY?.length || 0
            });
            res.status(500).json({ 
                message: detailedMessage
            });
        } else {
            res.status(500).json({ message: errorMessage || 'Request failed' });
        }
    }
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    let processerFn: Function | undefined = undefined;
    switch (req.method) {
        case 'POST':
            processerFn = handlePick;
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' });
        return;
    }

    processerFn(req, res);
}
