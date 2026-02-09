import fetch from '@/src/fetch';
import { IChapter, INovalData, IStoryLine, ITimelineEvent, IWorldViewDataWithExtra, IFactionDefData, IRoleData } from '@/src/types/IAiNoval';
import _ from 'lodash';

/**
 * 获取所有小说的定义数据
 * @returns { data: INovalData[], count: number }
 */
export const getNovelList = async (page: number = 1, limit: number = 100) => {
    let params = {
        page,
        limit
    };
    const response = await fetch.get<INovalData[]>('/api/aiNoval/noval/list', { params });
    return response;
}

/**
 * 获取所有世界观定义数据，含事件线范围
 * @returns { data: IWorldViewDataWithExtra[], count: number }
 */
export const getWorldViewList = async (page: number = 1, limit: number = 100) => {
    let params = {
        page,
        limit
    };
    const response = await fetch.get<IWorldViewDataWithExtra[]>('/api/aiNoval/worldView/list', { params });
    return response;
}

export const getWorldViewById = async (id: number) => {
    const response = await fetch.get<IWorldViewDataWithExtra>('/api/aiNoval/worldView', {params: {id}});
    return response;
}

/**
 * 获取所有故事线定义数据
 * @returns { data: IStoryLine[], count: number }
 */
export const getStoryLineList = async (worldViewId: number, page: number = 1, limit: number = 100) => {
    let params = {
        worldViewId,
        page,
        limit
    };
    const response = await fetch.get<IStoryLine[]>('/api/aiNoval/storyLine/list', { params });
    return response;
}

/**
 * 获取所有事件线定义数据
 * @returns { data: ITimelineEvent[], count: number }
 */
export const getTimelineEventList = async (worldViewId: number, startDate: number | null, endDate: number | null, page: number = 1, limit: number = 100) => {
    let params = {
        worldview_id: worldViewId,
        start_date: startDate,
        end_date: endDate,
        page,
        limit
    };
    const response = await fetch.get<ITimelineEvent[]>('/api/aiNoval/timeline/event/list', { params });
    return response;
}

export const getTimelineEventByIds = async (ids: number[]) => {
    if (ids.length === 0) {
        return { data: [], count: 0 };
    }

    let params = {
        ids: ids.join(',')
    };
    const response = await fetch.get<ITimelineEvent[]>('/api/aiNoval/timeline/event/list', { params });
    return response;
}


function splitIds(ids: any) {
    if (!ids) {
        return [];
    }

    function processItem(str: string) {
        if (/^\d+$/.test(str)) {
            return Number(str);
        }

        return str;
    }

    function filterItem(item: string | number) {
        if (typeof item === 'string') {
            return item;
        }

        return item > 0;
    }

    return (ids + '').split(',').map(processItem).filter(filterItem);
}

function splitIds2String(ids?: number[] | string[]) {
    if (!ids || ids.length === 0) {
        return '';
    }

    return ids.join(',');
}

function serializeChapter(chapter: IChapter) {

    let _chapter = _.cloneDeep(chapter);
    if (_chapter.storyline_ids) {
        _chapter.storyline_ids = splitIds(_chapter.storyline_ids).map(Number);
    }

    if (_chapter.event_ids) {
        _chapter.event_ids = splitIds(_chapter.event_ids).map(Number);
    }

    if (_chapter.geo_ids) {
        _chapter.geo_ids = splitIds(_chapter.geo_ids).map(String);
    }

    if (_chapter.role_ids) {
        _chapter.role_ids = splitIds(_chapter.role_ids).map(Number);
    }

    if (_chapter.faction_ids) {
        _chapter.faction_ids = splitIds(_chapter.faction_ids).map(Number);
    }

    if (_chapter.related_chapter_ids) {
        _chapter.related_chapter_ids = splitIds(_chapter.related_chapter_ids).map(Number);
    }

    return _chapter;
}

/**
 * 获取章节定义数据
 * @param id 章节ID
 * @returns { data: IChapter }
 */
export const getChapterById = async (id: number) => {
    const chapter = (await fetch.get<IChapter>('/api/aiNoval/chapters', {params: {id}})) as unknown as IChapter;

    return serializeChapter(chapter);
}

export const getChapter = async (params: any) => {
    let _params = {
        ...params || {},
        mode: 'full',
        page: 1,
        limit: 1
    }
    const response = await fetch.get<IChapter[]>('/api/aiNoval/chapters/list', {params: _params});
    let chapter = response.data?.[0] || null;
    if (!chapter) {
        return null;
    }

    return serializeChapter(chapter);
}

/**
 * 获取所有章节定义数据
 * @returns { data: IChapter[], count: number }
 */
export const getChapterList = async (novelId: number, page: number = 1, limit: number = 100) => {
    let params = {
        novelId,
        dataType: 'base',
        page,
        limit
    };
    const response = await fetch.get<IChapter[]>('/api/aiNoval/chapters/list', { params });

    if (response.data) {
        response.data.forEach(chapter => {
            chapter.storyline_ids = splitIds(chapter.storyline_ids).map(Number);
            chapter.event_ids = splitIds(chapter.event_ids).map(Number);
            chapter.geo_ids = splitIds(chapter.geo_ids).map(String);
            chapter.role_ids = splitIds(chapter.role_ids).map(Number);
            chapter.faction_ids = splitIds(chapter.faction_ids).map(Number);
            chapter.related_chapter_ids = splitIds(chapter.related_chapter_ids).map(Number);
        });
    }

    return response as unknown as {data: IChapter[], count: number};
}

/**
 * 获取所有章节定义数据
 * @returns { data: IChapter[], count: number }
 */
export const getChapterListFrom = async (novelId: number, from: number = 1, to: number = 100) => {
    let params = {
        novelId,
        dataType: 'base',
        from,
        to
    };
    const response = await fetch.get<IChapter[]>('/api/aiNoval/chapters/list', { params });

    if (response.data) {
        response.data.forEach(chapter => {
            chapter.storyline_ids = splitIds(chapter.storyline_ids).map(Number);
            chapter.event_ids = splitIds(chapter.event_ids).map(Number);
            chapter.geo_ids = splitIds(chapter.geo_ids).map(String);
            chapter.role_ids = splitIds(chapter.role_ids).map(Number);
            chapter.faction_ids = splitIds(chapter.faction_ids).map(Number);
            chapter.related_chapter_ids = splitIds(chapter.related_chapter_ids).map(Number);
        });
    }

    return response as unknown as {data: IChapter[], count: number};
}

/**
 * 添加章节
 * @param chapter 章节数据（字段可选）
 * @returns 
 */
export const addChapter = async (chapter: IChapter) => {
    let po = {
        ...chapter,
        storyline_ids: splitIds2String(chapter.storyline_ids),
        event_ids: splitIds2String(chapter.event_ids),
        geo_ids: splitIds2String(chapter.geo_ids),
        role_ids: splitIds2String(chapter.role_ids),
        faction_ids: splitIds2String(chapter.faction_ids),
        related_chapter_ids: splitIds2String(chapter.related_chapter_ids),
    }

    const response = await fetch.post<IChapter>('/api/aiNoval/chapters', po);
    return response;
}

/**
 * 更新章节
 * @param chapter 章节数据（字段可选，id必填）
 * @returns 
 */
export const updateChapter = async (chapter: IChapter) => {
    let po: any = {
        ...chapter,        
    }

    if (po.hasOwnProperty('storyline_ids')) {
        po.storyline_ids = splitIds2String(po.storyline_ids);
    }

    if (po.hasOwnProperty('event_ids')) {
        po.event_ids = splitIds2String(po.event_ids);
    }

    if (po.hasOwnProperty('geo_ids')) {
        po.geo_ids = splitIds2String(po.geo_ids);
    }

    if (po.hasOwnProperty('role_ids')) {
        po.role_ids = splitIds2String(po.role_ids);
    }

    if (po.hasOwnProperty('faction_ids')) {
        po.faction_ids = splitIds2String(po.faction_ids);
    }

    if (po.hasOwnProperty('related_chapter_ids')) {
        po.related_chapter_ids = splitIds2String(po.related_chapter_ids);
    }

    const response = await fetch.post<IChapter>('/api/aiNoval/chapters', po, {params: {id: chapter.id}});
    return response;
}

/**
 * 删除章节
 * @param id 章节ID
 * @returns 
 */
export const deleteChapter = async (id: number) => {
    const response = await fetch.delete<IChapter>('/api/aiNoval/chapters', {params: {id}});
    return response;
}

/**
 * 获取最大章节编号
 * @param novelId 小说ID
 * @returns 最大章节编号
 */
export const getMaxChapterNumber = async (novelId: number): Promise<number> => {
    const response = await fetch.get<number>('/api/aiNoval/chapters/maxChapterNumber', {params: {novelId}});
    return _.toNumber(response);
}

export const loadFactionList = async (worldviewId: number, page: number = 1, limit: number = 200) => {
    const response = await fetch.get<IFactionDefData[]>('/api/aiNoval/faction/list', {params: {worldviewId, page, limit}});
    return response.data || [];
}

export const loadRoleList = async (worldviewId: number, page: number = 1, limit: number = 200) => {
    const response = await fetch.get<IRoleData[]>('/api/aiNoval/role/list', {params: {worldviewId, page, limit}});
    return response.data || [];
}

export const stripChapterBlocking = async (chapterId: number, stripLength: number = 300, difyHost: string = ''): Promise<string> => {
    const response = await fetch.post(`/api/aiNoval/chapters/strip`, 
        {},
        {
            headers: {
                'Content-Type': 'application/json'
            },
            params: {
                chapterId,
                stripLength,
                mode: 'blocking',
                difyHost
            },
            timeout: 1000 * 60 * 10
        }
    );

    console.debug('response -> ', response);

    return response.data?.outputs?.output || '';
}

export const stripText = async (text: string, targetLength: number = 300): Promise<string> => {
    const response = await fetch.post(`/api/aiNoval/llm/once/stripParagraph`, 
        {
            text,
            targetLength
        },
        {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 1000 * 60 * 10
        }
    );

    console.debug('response -> ', response);

    return response.data?.strippedText || '';
}


export const nameChapterBlocking = async (chapterId: number): Promise<string> => {
    const response = await fetch.post(`/api/aiNoval/chapters/genTitle`, 
        {},
        {
            params: {
                chapterId,
                mode: 'blocking'
            },
            timeout: 1000 * 60 * 10
        }
    );

    console.debug('response -> ', response);

    return response.data?.outputs?.output || '';
}


export const continueChapterBlocking = async (chapterId: number): Promise<string> => {
    const response = await fetch.post(`/api/aiNoval/chapters/continue`, 
        {},
        {
            params: {
                chapterId,
                mode: 'blocking'
            },
            timeout: 1000 * 60 * 10
        }
    );

    console.debug('response -> ', response);

    return response.data?.outputs?.text || '';
}

// 获取续写信息
export const getContinueInfo = async (chapterId: number): Promise<any> => {
    const response = await fetch.get<any>('/api/aiNoval/chapters/continueInfo', {params: {chapterId}});
    return response;
}

/** 生成分段提纲（先回显、用户确认后再写），支持 model 选项，默认 deepseek-reasoner */
export const genChapterSegmentOutline = async (params: {
    curr_context: string
    prev_content?: string
    mcp_context?: string
    role_names?: string
    faction_names?: string
    geo_names?: string
    attention?: string
    chapter_style?: string
    max_segments?: number
    segment_target_chars?: number
    model?: string
}): Promise<{ outlines: Array<{ index: number; outline: string }> }> => {
    const response = await fetch.post<{ success?: boolean; data?: { outlines: Array<{ index: number; outline: string }> } }>(
        '/api/aiNoval/chapters/genChapterSegmentOutline',
        {
            curr_context: params.curr_context || '',
            prev_content: params.prev_content || '',
            mcp_context: params.mcp_context || '',
            role_names: params.role_names || '',
            faction_names: params.faction_names || '',
            geo_names: params.geo_names || '',
            attention: params.attention || '',
            chapter_style: params.chapter_style || '',
            max_segments: params.max_segments ?? 20,
            segment_target_chars: params.segment_target_chars ?? 600,
            model: params.model || 'deepseek-reasoner',
        },
        { timeout: 1000 * 60 * 3 }
    )
    const body = response?.data ?? response
    const outlines = body?.data?.outlines ?? (body as any)?.outlines ?? []
    return { outlines: Array.isArray(outlines) ? outlines : [] }
}

/** 生成章节扩写注意事项（MCP + ReAct 生成严格注意事项，直接覆盖当前注意事项） */
export const genChapterAttention = async (params: {
    worldview_id: number
    curr_context: string
    role_names?: string
    faction_names?: string
    geo_names?: string
    chapter_style?: string
}): Promise<string> => {
    const response = await fetch.post<{ success?: boolean; data?: { attention: string }; attention?: string }>(
        '/api/aiNoval/llm/once/genChapterAttention',
        {
            worldview_id: params.worldview_id,
            curr_context: params.curr_context || '',
            role_names: params.role_names || '',
            faction_names: params.faction_names || '',
            geo_names: params.geo_names || '',
            chapter_style: params.chapter_style || '',
        },
        { timeout: 1000 * 60 * 3 }
    )
    const body = response?.data ?? response
    return (body?.data?.attention ?? (body as any)?.attention) ?? ''
}

// 从文本中提取目标数据
export const pickFromText = async (target: string, src_text: string): Promise<any> => {
    const response = await fetch.post(`/api/aiNoval/chapters/pick`, 
        {src_text},
        {
            params: {target},
            timeout: 1000 * 60 * 10
        }
    );

    let text = response.data?.outputs?.output || '';
    text = text.replace(/<think>.*?<\/think>/gs, '');
    return text || '';
}

/** 单段续写（按提纲逐段调用，返回本段正文） */
export const genChapterSegment = async (
    worldviewId: number,
    params: {
        curr_context: string
        prev_content?: string
        role_names?: string
        faction_names?: string
        geo_names?: string
        attention?: string
        llm_type?: string
        segment_index: number
        previous_content_snippet: string
        current_segment_outline?: string
        segment_target_chars?: number
        mcp_context?: string
    }
): Promise<{ content: string; status: string; error: string }> => {
    const response = await fetch.post<{
        data?: { outputs?: { output?: string }; status?: string; error?: string }
    }>(
        '/api/aiNoval/chapters/genChapterSegment',
        {
            worldview_id: worldviewId,
            curr_context: params.curr_context || '',
            prev_content: params.prev_content || '',
            role_names: params.role_names || '',
            faction_names: params.faction_names || '',
            geo_names: params.geo_names || '',
            attention: params.attention || '',
            llm_type: params.llm_type || 'deepseek',
            segment_index: params.segment_index,
            previous_content_snippet: params.previous_content_snippet || '',
            current_segment_outline: params.current_segment_outline || '',
            segment_target_chars: params.segment_target_chars ?? 600,
            mcp_context: params.mcp_context || '',
        },
        { params: { worldviewId }, timeout: 1000 * 60 * 5 }
    )
    const data = response?.data ?? response
    const body = (data as any)?.data ?? data
    return {
        content: (body as any)?.outputs?.output ?? '',
        status: (body as any)?.status ?? 'error',
        error: (body as any)?.error ?? '',
    }
}

export const genChapterSegmentMultiTurn = async (
    worldviewId: number,
    params: {
        curr_context: string
        prev_content?: string
        role_names?: string
        faction_names?: string
        geo_names?: string
        attention?: string
        llm_type?: string
        segment_index: number
        segment_outline: string
        previous_content_snippet: string
        segment_target_chars?: number
        mcp_context?: string
        conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>
        is_first_turn?: boolean
    }
): Promise<{ content: string; status: string; error: string; conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }> }> => {
    const response = await fetch.post<{
        data?: { 
            outputs?: { output?: string }
            status?: string
            error?: string
            conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>
        }
    }>(
        '/api/aiNoval/chapters/genChapterSegmentMultiTurn',
        {
            worldview_id: worldviewId,
            curr_context: params.curr_context || '',
            prev_content: params.prev_content || '',
            role_names: params.role_names || '',
            faction_names: params.faction_names || '',
            geo_names: params.geo_names || '',
            attention: params.attention || '',
            llm_type: params.llm_type || 'deepseek-chat',
            segment_index: params.segment_index,
            segment_outline: params.segment_outline || '',
            previous_content_snippet: params.previous_content_snippet || '',
            segment_target_chars: params.segment_target_chars ?? 600,
            mcp_context: params.mcp_context || '',
            conversation_history: params.conversation_history || [],
            is_first_turn: params.is_first_turn ?? false,
        },
        { params: { worldviewId }, timeout: 1000 * 60 * 5 }
    )
    const data = response?.data ?? response
    const body = (data as any)?.data ?? data
    return {
        content: (body as any)?.outputs?.output ?? '',
        status: (body as any)?.status ?? 'error',
        error: (body as any)?.error ?? '',
        conversation_history: (body as any)?.conversation_history || [],
    }
}

// 生成章节
export const genChapterBlocking = async (worldviewId: number, inputs: any, difyHost: string = ''): Promise<{ content: string, status: string, error: string, elapsed_time: number }> => {
    const response = await fetch.post(
        // `/api/aiNoval/chapters/genChapterLegacy`, 
        `/api/aiNoval/chapters/genChapter`, 
        inputs,
        {
            params: {worldviewId, difyHost},
            timeout: 1000 * 60 * 10
        }
    );
    return {
        content: response.data?.outputs?.output || '',
        status: response.data?.status || '',
        error: response.data?.error || '',
        elapsed_time: response.data?.elapsed_time || 0
    };
}

// 生成章节骨架提示词
export const genSkeletonPrompt = async (worldviewId: number, inputs: any): Promise<string> => {
    const response = await fetch.post(`/api/aiNoval/chapters/genSkeleton`, 
        inputs,
        {
            params: { worldviewId }, 
            timeout: 1000 * 60 * 10
        }
    );
    return response.data?.outputs?.output || '';
}

export const genParagraphs = async (worldviewId: number, skeleton: string): Promise<string> => {
    const response = await fetch.post(`/api/aiNoval/chapters/genParagraphs`, 
        {
            skeleton,
        },
        {
            params: {
                worldviewId
            }, 
            timeout: 1000 * 60 * 10
    }
    );
    const textArr = response.data?.outputs?.output || [];

    return JSON.stringify(textArr);
}

// 融合文段
export const combineParagraphs = async (paragraphs: string): Promise<string> => {
    const response = await fetch.post(`/api/aiNoval/chapters/combineParagraphs`, 
        { chapter: paragraphs },
        {
            timeout: 1000 * 60 * 10
        }
    );

    return response.data?.outputs?.text || '';
}

// 获取写作(对话)应用url
export const getWriteWithChatUrl = async (worldviewId: number): Promise<string> => {
    const response = await fetch.get(`/api/aiNoval/chapters/writeChatUrl`, 
        {
            params: {worldviewId}
        }
    );

    return (response as any).url;
}