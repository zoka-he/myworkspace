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