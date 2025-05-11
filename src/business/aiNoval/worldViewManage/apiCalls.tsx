import fetch from '@/src/fetch';
import _ from 'lodash';
import { IWorldViewData, ITimelineDef } from '@/src/types/IAiNoval';

export const getWorldViewList = async (params: any, page: number = 1, limit: number = 10) => {
    return await fetch.get('/api/aiNoval/worldView/list', 
        { params: {
            title: params?.title,
            page: _.toInteger(page),
            limit: _.toInteger(limit)
        } }
    );
}

export const createWorldView = async (data: IWorldViewData) => {
    return await fetch.post('/api/aiNoval/worldview', data);
}

export const updateWorldView = async (data: IWorldViewData) => {
    return await fetch.post('/api/aiNoval/worldview', data, { params: { id: data.id } });
}

export const deleteWorldView = async (id: number) => {
    return await fetch.delete('/api/aiNoval/worldview', { params: { id } });
}

export const createTimelineDef = async (data: ITimelineDef) => {
    return await fetch.post('/api/aiNoval/timeline', data);
}

export const updateTimelineDef = async (data: ITimelineDef) => {
    return await fetch.post('/api/aiNoval/timeline', data, { params: { id: data.id } });
}

export const getTimelineDef = async (worldviewId: number) => {
    return await fetch.get('/api/aiNoval/timeline', { params: { worldview_id: worldviewId } });
}


