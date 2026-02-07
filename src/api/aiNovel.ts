import fetch from '@/src/fetch';
import { IChapter, INovalData, IWorldRuleGroup, IWorldRuleItem, IWorldRuleSnapshot, IWorldViewData, IWorldViewDataWithExtra, IBrainstorm, IWorldState } from '../types/IAiNoval';
import _ from 'lodash';
import DifyApi from '../utils/dify/dify_api';

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

/**
 * 获取工具配置
 * @param name 
 * @returns 
 */
export async function getToolConfig(name: string): Promise<string | null> {
    const response = await fetch.get('/api/aiNoval/toolConfig/params', { params: { name } });
    if (!(response && response.data && response.data.length === 0)) {
        return null;
    }

    return response.data.find((item: any) => item.cfg_name === name)?.cfg_value_string || null;
}

/**
 * 运行Dify应用
 * @param appKey 
 * @param inputs 
 * @param options 
 * @returns 
 */
export async function runDifyApp(host: string, appKey: string, inputs: Record<string, any>, options?: { user?: string; responseMode?: 'blocking' | 'streaming' }) {
    const difyUtil = new DifyApi(host ? `http://${host}/v1` : '');
    return await difyUtil.runApp(appKey, inputs, options);
}

// ==================== 脑洞模块 API ====================

/**
 * 获取脑洞列表
 * @param params 查询参数
 * @param page 页码
 * @param limit 每页数量
 * @returns 
 */
export async function getBrainstormList(params: {
    worldview_id: number;
    search?: string;
    brainstorm_type?: string;
    status?: string | string[];
    priority?: string;
    category?: string;
    parent_id?: number | null;
}, page: number = 1, limit: number = 20) {
    const response = await fetch.get<{ data: IBrainstorm[], count: number }>(
        '/api/web/aiNoval/brainstorm/list',
        { params: { ...params, page, limit } }
    );
    return {
        data: response.data?.data || [],
        count: response.data?.count || 0
    };
}

/**
 * 根据ID获取脑洞详情
 * @param id 脑洞ID
 * @returns 
 */
export async function getBrainstormById(id: number): Promise<IBrainstorm> {
    const response = await fetch.get<IBrainstorm>(
        '/api/web/aiNoval/brainstorm',
        { params: { id } }
    );
    return response.data;
}

/**
 * 创建脑洞
 * @param data 脑洞数据
 * @returns 
 */
export async function createBrainstorm(data: Partial<IBrainstorm>): Promise<IBrainstorm> {
    const processedData = _.omit(data, ['id', 'created_at', 'updated_at']);
    const response = await fetch.post<IBrainstorm>(
        '/api/web/aiNoval/brainstorm',
        processedData
    );
    return response.data;
}

/**
 * 更新脑洞
 * @param id 脑洞ID
 * @param data 要更新的数据
 * @returns 
 */
export async function updateBrainstorm(id: number, data: Partial<IBrainstorm>): Promise<IBrainstorm> {
    const processedData = _.omit(data, ['id', 'created_at', 'updated_at']);
    const response = await fetch.post<IBrainstorm>(
        '/api/web/aiNoval/brainstorm',
        processedData,
        { params: { id } }
    );
    return response.data;
}

/**
 * 删除脑洞
 * @param id 脑洞ID
 * @returns 
 */
export async function deleteBrainstorm(id: number): Promise<void> {
    await fetch.delete('/api/web/aiNoval/brainstorm', { params: { id } });
}

// ==================== 世界态模块 API ====================

/**
 * 获取世界态列表
 * @param params 查询参数
 * @param page 页码
 * @param limit 每页数量
 */
export async function getWorldStateList(params: {
    worldview_id: number;
    state_type?: string;
    status?: string;
    impact_level?: string;
}, page: number = 1, limit: number = 20): Promise<{ data: IWorldState[]; count: number }> {
    const response = await fetch.get<{ data: IWorldState[]; count: number }>(
        '/api/web/aiNoval/worldState/list',
        { params: { ...params, page, limit } }
    );
    const payload = (response as any)?.data;
    return {
        data: payload?.data ?? [],
        count: payload?.count ?? 0,
    };
}

/**
 * 根据ID获取世界态详情
 * @param id 世界态ID
 */
export async function getWorldStateById(id: number): Promise<IWorldState> {
    const response = await fetch.get<IWorldState>(
        '/api/web/aiNoval/worldState',
        { params: { id } }
    );
    return (response as any)?.data;
}

/**
 * 创建世界态
 * @param data 世界态数据
 */
export async function createWorldState(data: Partial<IWorldState>): Promise<IWorldState> {
    const processedData = _.omit(data, ['id', 'created_at', 'updated_at']);
    const response = await fetch.post<IWorldState>(
        '/api/web/aiNoval/worldState',
        processedData
    );
    return (response as any)?.data;
}

/**
 * 更新世界态
 * @param id 世界态ID
 * @param data 要更新的数据
 */
export async function updateWorldState(id: number, data: Partial<IWorldState>): Promise<IWorldState> {
    const processedData = _.omit(data, ['id', 'created_at', 'updated_at']);
    const response = await fetch.post<IWorldState>(
        '/api/web/aiNoval/worldState',
        processedData,
        { params: { id } }
    );
    return (response as any)?.data;
}

/**
 * 删除世界态
 * @param id 世界态ID
 */
export async function deleteWorldState(id: number): Promise<void> {
    await fetch.delete('/api/web/aiNoval/worldState', { params: { id } });
}

/** 世界态编辑时拉取关联选项用：阵营列表（id + name） */
export async function getFactionOptionsForWorldState(worldviewId: number): Promise<{ id: number; name?: string }[]> {
    const res = await fetch.get<{ data?: any[] }>('/api/web/aiNoval/faction/list', {
        params: { worldview_id: worldviewId, page: 1, limit: 500 },
    });
    const data = (res as any)?.data ?? [];
    return Array.isArray(data) ? data : [];
}

/** 世界态编辑时拉取关联选项用：角色列表（id + name） */
export async function getRoleOptionsForWorldState(worldviewId: number): Promise<{ id: number; name?: string }[]> {
    const res = await fetch.get<{ data?: any[] }>('/api/web/aiNoval/role/list', {
        params: { worldview_id: worldviewId, page: 1, limit: 500 },
    });
    const data = (res as any)?.data ?? [];
    return Array.isArray(data) ? data : [];
}

/** 世界态编辑时拉取关联选项用：全量地理列表（覆盖星系/恒星/行星/卫星/地理单元，code + name） */
export async function getGeoUnitOptionsForWorldState(worldviewId: number): Promise<{ code: string; name?: string }[]> {
    const params = { worldview_id: worldviewId, limit: 1000 };
    const base = '/api/web/aiNoval/geo';
    const [starSystemRes, starRes, planetRes, satelliteRes, geoUnitRes] = await Promise.all([
        fetch.get<{ data?: any[] }>(`${base}/starSystem/list`, { params }),
        fetch.get<{ data?: any[] }>(`${base}/star/list`, { params }),
        fetch.get<{ data?: any[] }>(`${base}/planet/list`, { params }),
        fetch.get<{ data?: any[] }>(`${base}/satellite/list`, { params }),
        fetch.get<{ data?: any[] }>(`${base}/geoUnit/list`, { params }),
    ]);
    const toItems = (data: any[]): { code: string; name?: string }[] =>
        (Array.isArray(data) ? data : [])
            .filter((item) => item?.code != null && String(item.code).trim() !== '')
            .map((item) => ({ code: String(item.code), name: item.name ?? item.title }));
    const list: { code: string; name?: string }[] = [];
    list.push(...toItems((starSystemRes as any)?.data ?? []));
    list.push(...toItems((starRes as any)?.data ?? []));
    list.push(...toItems((planetRes as any)?.data ?? []));
    list.push(...toItems((satelliteRes as any)?.data ?? []));
    list.push(...toItems((geoUnitRes as any)?.data ?? []));
    return list;
}