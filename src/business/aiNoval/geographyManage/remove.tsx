import { IGeoGeographyUnitData, IGeoPlanetData, IGeoSatelliteData, IGeoStarData, IGeoStarSystemData } from '@/src/types/IAiNoval';
import fetch from '@/src/fetch';
import { message } from 'antd';

export async function deleteGeographicUnit(data: IGeoGeographyUnitData) {
    if (!data?.id) {
        message.error('删除地理单元失败，缺少ID！');
        return;
    }

    try {
        await fetch.delete('/api/aiNoval/geo/geoUnit', { params: { id: data.id } });
    } catch(e) {
        message.error('删除地理单元失败！请检查');
    }
}

export async function deletePlanet(data: IGeoPlanetData) {
    if (!data?.id) {
        message.error('删除行星失败，缺少ID！');
        return;
    }

    try {
        await fetch.delete('/api/aiNoval/geo/planet', { params: { id: data.id } });
    } catch(e) {
        message.error('删除行星失败！请检查');
    }
}

export async function deleteSatellite(data: IGeoSatelliteData) {
    if (!data?.id) {
        message.error('删除卫星失败，缺少ID！');
        return;
    }

    try {
        await fetch.delete('/api/aiNoval/geo/satellite', { params: { id: data.id } });
    } catch(e) {
        message.error('删除卫星失败！请检查');
    }
}

export async function deleteStar(data: IGeoStarData) {
    if (!data?.id) {
        message.error('删除恒星失败，缺少ID！');
        return;
    }

    try {
        await fetch.delete('/api/aiNoval/geo/star', { params: { id: data.id } });
    } catch(e) {
        message.error('删除恒星失败！请检查');
    }
}

export async function deleteStarSystem(data: IGeoStarSystemData) {
    if (!data?.id) {
        message.error('删除星系失败，缺少ID！');
        return;
    }

    try {
        await fetch.delete('/api/aiNoval/geo/starSystem', { params: { id: data.id } });
    } catch(e) {
        message.error('删除星系失败！请检查');
    }
}