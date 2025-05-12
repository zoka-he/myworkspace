import fetch from '@/src/fetch';
import { IStoryLine, ITimelineEvent } from '@/src/types/IAiNoval';
import _ from 'lodash';

export const getEventList = async (params: { worldview_id: number, story_line_id?: number }, page: number = 1, limit: number = 200) => {
    return await fetch.get('/api/aiNoval/timeline/event/list', { params: {
        page,
        limit,
        ...params
    } });
}

export const createOrUpdateEvent = async (data: ITimelineEvent) => {
    if (data.id) {
        return await fetch.post('/api/aiNoval/timeline/event', data, { params: { id: data.id } });
    } else {
        return await fetch.post('/api/aiNoval/timeline/event', data);
    }
}

export const deleteEvent = async (id: number) => {
    return await fetch.delete(`/api/aiNoval/timeline/event?id=${id}`);
}

export const getStoryLineList = async (worldview_id: number, page: number = 1, limit: number = 10) => {
    let params = _.omitBy({
        worldview_id,
        page,
        limit,
    }, _.isUndefined);

    return await fetch.get('/api/aiNoval/storyLine/list', { params });
}

export const createOrUpdateStoryLine = async (data: IStoryLine) => {
    if (data.id) {
        return await fetch.post('/api/aiNoval/storyLine', data, { params: { id: data.id } });
    } else {
        return await fetch.post('/api/aiNoval/storyLine', data);
    }
}

export const deleteStoryLine = async (id: number) => {
    return await fetch.delete(`/api/aiNoval/storyLine?id=${id}`);
}   
