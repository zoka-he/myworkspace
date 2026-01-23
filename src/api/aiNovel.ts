import fetch from '@/src/fetch';
import { IChapter, INovalData } from '../types/IAiNoval';

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

export const getNovelList = async () => {
    const response = await fetch.get<INovalData[]>('/api/aiNoval/noval/list');
    return response;
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

export async function getFactionList(worldViewId: number, limit: number = 200) {
    const response = await fetch.get(
        '/api/aiNoval/faction/list', 
        {
            params: { worldViewId, limit }
        }
    );
    return response;
}

interface PrepareTextEmbeddingRequest {
    worldviews: number[];
    characters: number[];
    locations: string[];
    factions: number[];
    events: number[];
}

interface PrepareTextEmbeddingResponse {
    pushed: {
        worldviews: number;
        characters: number;
        locations: string;
        factions: number;
        events: number;
    }
}

export async function prepareTextEmbedding(data: PrepareTextEmbeddingRequest): Promise<PrepareTextEmbeddingResponse> {
    const response = await fetch.post(
        '/api/aiNoval/llm/once/prepareEmbedding',
        data
    );
    return response.data as PrepareTextEmbeddingResponse;
}

/**
 * 获取地理编码的最大值
 * @param code 
 * @returns 
 */
export async function getMaxGeoCode(code: string): Promise<string> {
    const res = await fetch.get('/api/web/aiNoval/geo/geoUnit/maxCode', { params: { prefix: code.slice(0, 2) } })
    return res?.data
}

/**
 * 生成地理设定嵌入文本
 * @param geoType - 地理类型，如："星系"、"恒星"、"行星"、"卫星"、"城市"等
 * @param description - 地理单元的描述信息（可选）
 * @param parentInfo - 上级关系信息，如："所属星系"、"所属行星"等（可选）
 * @returns 生成的嵌入标签原文
 */
export async function generateGeoEmbedText(params: {
    geoType: string;
    description?: string;
    parentInfo?: string;
}): Promise<string> {
    // fetch 拦截器已经提取了 response.data，所以 response 就是 { success: true, data: { embedText: "..." } }
    const response = await fetch.post(
        '/api/web/aiNoval/llm/once/generateGeoEmbedText',
        params
    ) as unknown as { success: boolean; data: { embedText: string } };
    
    if (response && response.success && response.data && response.data.embedText) {
        return response.data.embedText;
    }
    throw new Error('API 返回数据格式不正确');
}