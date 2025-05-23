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
export const getTimelineEventList = async (worldViewId: number, startDate: number, endDate: number, page: number = 1, limit: number = 100) => {
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

    return (ids + '').split(',').map(Number).filter(id => id > 0);
}

function splitIds2String(ids?: number[]) {
    if (!ids || ids.length === 0) {
        return '';
    }

    return ids.join(',');
}

/**
 * 获取章节定义数据
 * @param id 章节ID
 * @returns { data: IChapter }
 */
export const getChapterById = async (id: number) => {
    const chapter = (await fetch.get<IChapter>('/api/aiNoval/chapters', {params: {id}})) as unknown as IChapter;

    if (chapter.storyline_ids) {
        chapter.storyline_ids = splitIds(chapter.storyline_ids);
    }

    if (chapter.event_ids) {
        chapter.event_ids = splitIds(chapter.event_ids);
    }

    if (chapter.geo_ids) {
        chapter.geo_ids = splitIds(chapter.geo_ids);
    }

    if (chapter.role_ids) {
        chapter.role_ids = splitIds(chapter.role_ids);
    }

    if (chapter.faction_ids) {
        chapter.faction_ids = splitIds(chapter.faction_ids);
    }

    return chapter;
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
            chapter.storyline_ids = splitIds(chapter.storyline_ids);
            chapter.event_ids = splitIds(chapter.event_ids);
            chapter.geo_ids = splitIds(chapter.geo_ids);
            chapter.role_ids = splitIds(chapter.role_ids);
            chapter.faction_ids = splitIds(chapter.faction_ids);
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

export const stripChapterBlocking = async (chapterId: number, stripLength: number = 300): Promise<string> => {
    const response = await fetch.post(`/api/aiNoval/chapters/strip`, 
        {},
        {
            headers: {
                'Content-Type': 'application/json'
            },
            params: {
                chapterId,
                stripLength,
                mode: 'blocking'
            }
        }
    );

    console.debug('response -> ', response);

    return response.data?.outputs?.text || '';
}


export const nameChapterBlocking = async (chapterId: number): Promise<string> => {
    const response = await fetch.post(`/api/aiNoval/chapters/genTitle`, 
        {},
        {
            params: {
                chapterId,
                mode: 'blocking'
            }
        }
    );

    console.debug('response -> ', response);

    return response.data?.outputs?.output || '';
}

// TODO: 续写章节，待调正
export const continueChapterBlocking = async (chapterId: number): Promise<string> => {
    const response = await fetch.post(`/api/aiNoval/chapters/continue`, 
        {},
        {
            params: {
                chapterId,
                mode: 'blocking'
            }
        }
    );

    console.debug('response -> ', response);

    return response.data?.outputs?.text || '';
}

