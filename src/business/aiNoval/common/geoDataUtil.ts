import { IGeoStarSystemData, IGeoStarData, IGeoPlanetData, IGeoSatelliteData, IGeoGeographyUnitData, IGeoUnionData } from '@/src/types/IAiNoval';
import fetch from '@/src/fetch';

function wrapDataToTreeData(
    data: IGeoStarSystemData | IGeoStarData | IGeoPlanetData, 
    type: string
): IGeoTreeItem<IGeoStarSystemData | IGeoStarData | IGeoPlanetData> {

    let key;
    let title;

    switch (type) {
        case 'starSystem': 
        case 'star': 
        case 'planet':
        case 'satellite':
        case 'geographicUnit':
            key = data.code?.toString() || ''; 
            title = `${data.name || ''} (${data.code?.toString() || ''})`
            break;
        default: 
            title = '';
            key = ''; 
            break;
    }

    return {
        title,
        key,
        dataType: type,
        data: data,
    };
}

/**
 * 加载星系数据
 * @returns 星系数据的树形化对象
 */
async function loadStarSystemData(worldview_id: number): Promise<IGeoTreeItem<IGeoStarSystemData>[]> {
    const resp = await fetch.get('/api/aiNoval/geo/starSystem/list', { params: { worldview_id } });
    const data = (resp.data as IGeoStarSystemData[]) || [];

    return data.map(item => wrapDataToTreeData(item, 'starSystem'));
}

/**
 * 加载恒星数据
 * @returns 恒星数据的树形化对象
 */
async function loadStarData(worldview_id: number): Promise<IGeoTreeItem<IGeoStarData>[]> {
    const resp = await fetch.get('/api/aiNoval/geo/star/list', { params: { worldview_id } });
    const data = (resp.data as IGeoStarSystemData[]) || [];

    return data.map(item => wrapDataToTreeData(item, 'star'));
}

/**
 * 加载行星数据
 * @returns 行星数据的树形化对象
 */
async function loadPlanetData(worldview_id: number): Promise<IGeoTreeItem<IGeoPlanetData>[]> {
    const resp = await fetch.get('/api/aiNoval/geo/planet/list', { params: { worldview_id } });
    const data = (resp.data as IGeoPlanetData[]) || [];

    return data.map(item => wrapDataToTreeData(item, 'planet'));
}

async function loadSatelliteData(worldview_id: number): Promise<IGeoTreeItem<IGeoSatelliteData>[]> {
    const resp = await fetch.get('/api/aiNoval/geo/satellite/list', { params: { worldview_id } });
    const data = (resp.data as IGeoSatelliteData[]) || [];

    return data.map(item => wrapDataToTreeData(item, 'satellite'));  
}

async function loadGeographyUnitData(worldview_id: number): Promise<IGeoTreeItem<IGeoGeographyUnitData>[]> {
    const resp = await fetch.get('/api/aiNoval/geo/geoUnit/list', { params: { worldview_id } });
    const data = (resp.data as IGeoSatelliteData[]) || [];

    return data.map(item => wrapDataToTreeData(item, 'geographicUnit'));  
}

export interface IGeoTreeItem<T> {
    title: string;
    key: string;
    dataType: string;
    data: T;
    parent?: IGeoTreeItem<IGeoStarSystemData | IGeoStarData | IGeoPlanetData>;
    children?: IGeoTreeItem<IGeoStarSystemData | IGeoStarData | IGeoPlanetData>[];
}

export async function loadGeoUnionList(worldview_id: number): Promise<IGeoUnionData[]> {
    let [
        starSystemData,
        starData,
        planetData,
        satelliteData,
        geoUnitData,
    ] = await Promise.all([
        loadStarSystemData(worldview_id),
        loadStarData(worldview_id),
        loadPlanetData(worldview_id),
        loadSatelliteData(worldview_id),
        loadGeographyUnitData(worldview_id)
    ]);

    let unionDataList: IGeoUnionData[] = [];
    starSystemData.forEach(starSystem => {
        unionDataList.push({
            ...starSystem.data,
            data_type: 'starSystem',
        });
    });

    starData.forEach(star => {
        unionDataList.push({
            ...star.data,
            data_type: 'star',
        });
    });
    
    planetData.forEach(planet => {
        unionDataList.push({
            ...planet.data,
            data_type: 'planet',
        });
    });

    satelliteData.forEach(satellite => {
        unionDataList.push({
            ...satellite.data,
            data_type: 'satellite',
        });
    });
    
    geoUnitData.forEach(geoUnit => {
        unionDataList.push({
            ...geoUnit.data,
            data_type: 'geoUnit',
        });
    });

    return unionDataList;
}

/**
     * 更新地理资源树：
     * 1.加载星系数据
     * 2.加载恒星数据
     * 3.加载行星数据
     * 4.加载卫星数据
     * 5.加载行星地貌数据
     */
export async function loadGeoTree(worldview_id: number) {

    let [
        starSystemData,
        starData,
        planetData,
        satelliteData,
        geoUnitData,
    ] = await Promise.all([
        loadStarSystemData(worldview_id),
        loadStarData(worldview_id),
        loadPlanetData(worldview_id),
        loadSatelliteData(worldview_id),
        loadGeographyUnitData(worldview_id)
    ]);

    if (!starSystemData || starSystemData.length === 0) {
        return [];
    }

    // 提取星系map，星系与恒星、行星绑定关系是id、parent_id
    let starSystemMap = new Map<number, IGeoTreeItem<IGeoStarSystemData>>();
    starSystemData.forEach((starSystem: IGeoTreeItem<IGeoStarSystemData>) => {
        let id = starSystem?.data?.id;
        if (id) {
            starSystemMap.set(id, starSystem);
        }
    });

    // 组装恒星数据到星系数据，绑定关系是id、parent_id
    starData.forEach((star: IGeoTreeItem<IGeoStarData>) => {
        let parentId = star?.data?.star_system_id;
        if (parentId) {
            let parentStarSystem = starSystemMap.get(parentId);
            if (parentStarSystem) {
                star.parent = parentStarSystem;
                if (!parentStarSystem.children) {
                    parentStarSystem.children = [];
                }
                parentStarSystem.children.push(star);
            }
        }
    });

    // 组装行星数据到星系数据，绑定关系是id、parent_id
    planetData.forEach((planet: IGeoTreeItem<IGeoPlanetData>) => {
        let parentId = planet?.data?.star_system_id;
        if (parentId) {
            let parentStarSystem = starSystemData.find(sys => sys.data.id === parentId);
            if (parentStarSystem) {
                planet.parent = parentStarSystem;
                if (!parentStarSystem.children) {
                    parentStarSystem.children = [];
                }
                parentStarSystem.children.push(planet);
            }
        }  
    })

    // 组装卫星数据到行星数据，绑定关系是id、planet_id
    satelliteData.forEach((satellite: IGeoTreeItem<IGeoSatelliteData>) => {
        let parentId = satellite?.data?.planet_id;
        if (parentId) {
            let parentPlanet = planetData.find(planet => planet.data.id === parentId);
            if (parentPlanet) {
                satellite.parent = parentPlanet;
                if (!parentPlanet.children) {
                    parentPlanet.children = [];
                }
                parentPlanet.children.push(satellite);
            }
        }
    });

    // 组装地理单元数据到行星、卫星、地理单元数据，绑定关系是id、planet_id、satellite_id、parent_id、parent_type
    geoUnitData.forEach((geoUnit: IGeoTreeItem<IGeoGeographyUnitData>) => {
        let parentId = geoUnit?.data?.parent_id;
        let parentType = geoUnit?.data?.parent_type;

        let parent: IGeoTreeItem<IGeoStarSystemData> | undefined;
        if (parentType === 'planet') {
            parent = planetData.find(planet => planet.data.id === parentId);
        } else if (parentType === 'satellite') {
            parent = satelliteData.find(satellite => satellite.data.id === parentId);
        } else {
            parent = geoUnitData.find(geoUnit => geoUnit.data.id === parentId);
        }

        if (parent) {
            geoUnit.parent = parent;
            if (!parent.children) {
                parent.children = [];
            }
            parent.children.push(geoUnit);
        }  
    })

    return starSystemData;
}