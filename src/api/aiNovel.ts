import fetch from '@/src/fetch';
import { IChapter, INovalData, IWorldRuleGroup, IWorldRuleItem, IWorldRuleSnapshot, IWorldViewData, IWorldViewDataWithExtra } from '../types/IAiNoval';
import _ from 'lodash';

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

/**
 * 生成阵营设定嵌入标签原文
 * @param params.description - 阵营描述（可选）
 * @param params.hasParent - 是否有上级阵营（可选）
 * @returns 生成的嵌入标签原文
 */
export async function generateFactionEmbedText(params: {
    description?: string;
    hasParent?: boolean;
}): Promise<string> {
    const response = await fetch.post(
        '/api/web/aiNoval/llm/once/generateFactionEmbedText',
        { description: params.description, hasParent: Boolean(params.hasParent) }
    ) as unknown as { success: boolean; data: { embedText: string } };

    if (response?.success && response?.data?.embedText) {
        return response.data.embedText;
    }
    throw new Error('API 返回数据格式不正确');
}

/**
 * 生成角色嵌入标签原文
 * @param roleText - 角色设定信息文本
 * @returns 生成的嵌入标签原文
 */
export async function generateRoleEmbedText(roleText: string): Promise<string> {
    const response = await fetch.post(
        '/api/web/aiNoval/llm/once/generateRoleEmbedText',
        { roleText }
    ) as unknown as { success: boolean; data: { embedText: string } };

    if (response?.success && response?.data?.embedText) {
        return response.data.embedText;
    }
    throw new Error('API 返回数据格式不正确');
}

export async function getWorldViews() {
    let resp = await fetch.get('/api/aiNoval/worldView/list', { params: { page: 1, limit: 100 } });

    let data: IWorldViewData[] = [];
    let count = 0;

    if (resp && resp.data && resp.data.length > 0) {
        data = resp.data;
    }

    count = (resp as { count?: number })?.count || 0;

    return { data, count };
}


export async function loadWorldviews(params: any, page: number = 1, limit: number = 10) {
    let resp = await fetch.get('/api/aiNoval/worldView/list', 
        { params: {
            title: params?.title,
            page: _.toInteger(page),
            limit: _.toInteger(limit)
        } }
    );
    return {
        data: resp.data as IWorldViewDataWithExtra[],
        count: (resp as { count?: number })?.count || 0
    }
}

/**
 * 获取世界规则组列表
 * @param worldviewId 
 * @param page 
 * @param limit 
 * @returns 
 */
export async function getWorldRuleGroupList(worldviewId: number, page: number = 1, limit: number = 200) {
    const response = await fetch.get('/api/aiNoval/worldrule/group/list', { params: { worldview_id: worldviewId, page, limit } });
    return {
        data: response.data as IWorldRuleGroup[],
        count: (response as { count?: number })?.count || 0
    }
}

/**
 * 创建或更新世界规则组
 * @param data 
 * @returns 
 */
export async function createOrUpdateWorldRuleGroup(data: IWorldRuleGroup) {
    data = _.omit(data, ['created_at', 'updated_at']);

    if (data.id) {
        const response = await fetch.post('/api/aiNoval/worldrule/group', data, { params: { id: data.id } });
        return response.data;
    } else {
        const response = await fetch.post('/api/aiNoval/worldrule/group', data);
        return response.data;
    }
}

/**
 * 删除世界规则组
 * @param id 
 * @returns 
 */
export async function deleteWorldRuleGroup(id: number) {
    const response = await fetch.delete('/api/aiNoval/worldrule/group', { params: { id } });
    return response.data;
}

/**
 * 获取世界规则项列表
 * @param worldviewId 
 * @param page 
 * @param limit 
 * @returns 
 */
export async function getWorldRuleItemList(worldviewId: number, page: number = 1, limit: number = 1500) {
    const response = await fetch.get('/api/aiNoval/worldrule/item/list', { params: { worldview_id: worldviewId, page, limit } });
    return {
        data: response.data as IWorldRuleItem[],
        count: (response as { count?: number })?.count || 0
    }
}

/**
 * 创建或更新世界规则项
 * @param data 
 * @returns 
 */
export async function createOrUpdateWorldRuleItem(data: IWorldRuleItem) {
    data = _.omit(data, ['created_at', 'updated_at']);

    if (data.id) {
        const response = await fetch.post('/api/aiNoval/worldrule/item', data, { params: { id: data.id } });
        return response.data;
    } else {
        const response = await fetch.post('/api/aiNoval/worldrule/item', data);
        return response.data;
    }
}

/**
 * 删除世界规则项
 * @param id 
 * @returns 
 */
export async function deleteWorldRuleItem(id: number) {
    const response = await fetch.delete('/api/aiNoval/worldrule/item', { params: { id } });
    return response.data;
}

/**
 * 获取世界规则快照列表
 * @param worldviewId 
 * @param page 
 * @param limit 
 * @returns 
 */
export async function getWorldRuleSnapshotList(worldviewId: number, page: number = 1, limit: number = 100) {
    const response = await fetch.get('/api/aiNoval/worldrule/snapshot/list', { params: { worldview_id: worldviewId, page, limit } });
    return {
        data: response.data as IWorldRuleSnapshot[],
        count: (response as { count?: number })?.count || 0
    }
}

/**
 * 创建或更新世界规则快照
 * @param data 
 * @returns 
 */
export async function createOrUpdateWorldRuleSnapshot(data: IWorldRuleSnapshot) {
    data = _.omit(data, ['created_at', 'updated_at']);

    if (data.id) {
        const response = await fetch.post('/api/aiNoval/worldrule/snapshot', data, { params: { id: data.id } });
        return response.data;
    } else {
        const response = await fetch.post('/api/aiNoval/worldrule/snapshot', data);
        return response.data;
    }
}

/**
 * 删除世界规则快照
 * @param id 
 * @returns 
 */
export async function deleteWorldRuleSnapshot(id: number) {
    const response = await fetch.delete('/api/aiNoval/worldrule/snapshot', { params: { id } });
    return response.data;
}