import { IGeoStarSystemData, IGeoStarData, IGeoPlanetData, IGeoSatelliteData, IGeoGeographyUnitData, IGeoUnionData } from '@/src/types/IAiNoval';
import fetch from '@/src/fetch';
import { notification } from 'antd';

function wrapDataToTreeData(
    data: IGeoStarSystemData | IGeoStarData | IGeoPlanetData,
    type: string
): IGeoTreeItem<IGeoStarSystemData | IGeoStarData | IGeoPlanetData> {
    return {
        title: data.name || '',
        key: data.code || '',
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
    const resp = await fetch.get('/api/aiNoval/geo/geoUnit/list', { params: { worldview_id, limit: 1000 } });
    const data = (resp.data as IGeoSatelliteData[]) || [];

    return data.map(item => wrapDataToTreeData(item, 'geoUnit'));  
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

function constructGeoTree(
    starSystemData: IGeoTreeItem<IGeoStarSystemData>[], 
    starData: IGeoTreeItem<IGeoStarData>[], 
    planetData: IGeoTreeItem<IGeoPlanetData>[], 
    satelliteData: IGeoTreeItem<IGeoSatelliteData>[], 
    geoUnitData: IGeoTreeItem<IGeoGeographyUnitData>[]
): IGeoTreeItem<IGeoStarSystemData | IGeoStarData | IGeoPlanetData | IGeoSatelliteData | IGeoGeographyUnitData>[] {
    if (!starSystemData || starSystemData.length === 0) {
        return [];
    }

    let hasConflict = false;
    let codeSet = new Set<string | undefined | null>();

    // 提取星系map，星系与恒星、行星绑定关系是id、parent_id
    let starSystemMap = new Map<number, IGeoTreeItem<IGeoStarSystemData>>();
    starSystemData.forEach((starSystem: IGeoTreeItem<IGeoStarSystemData>) => {
        let id = starSystem?.data?.id;

        let hasParent = false;
        if (starSystem?.data?.parent_system_id) {
            let parentStarSystem = starSystemData.find(sys => sys.data.id === starSystem?.data?.parent_system_id);
            if (parentStarSystem) {
                starSystem.parent = parentStarSystem;
                if (!parentStarSystem.children) {
                    parentStarSystem.children = [];
                }
                parentStarSystem.children.push(starSystem);
                hasParent = true;
            }
        }

        if (id && !hasParent) {
            starSystemMap.set(id, starSystem);
        }

        if (codeSet.has(starSystem?.data?.code)) {
            hasConflict = true;
        }

        codeSet.add(starSystem?.data?.code);
    });

    // 组装恒星数据到星系数据，绑定关系是id、parent_id
    starData.forEach((star: IGeoTreeItem<IGeoStarData>) => {
        let parentId = star?.data?.star_system_id;
        if (parentId) {
            let parentStarSystem = starSystemData.find(sys => sys.data.id === parentId);
            if (parentStarSystem) {
                star.parent = parentStarSystem;
                if (!parentStarSystem.children) {
                    parentStarSystem.children = [];
                }
                parentStarSystem.children.push(star);
            }
        }

        if (codeSet.has(star?.data?.code)) {
            hasConflict = true;
        }
        codeSet.add(star?.data?.code);
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

        if (codeSet.has(planet?.data?.code)) {
            hasConflict = true;
        }
        codeSet.add(planet?.data?.code);
    })

    // 组装卫星数据到行星数据，绑定关系是id、star_system_id
    satelliteData.forEach((satellite: IGeoTreeItem<IGeoSatelliteData>) => {
        let parentId = satellite?.data?.star_system_id;
        if (parentId) {
            let parentStarSystem = starSystemData.find(sys => sys.data.id === parentId);
            if (parentStarSystem) {
                satellite.parent = parentStarSystem;
                if (!parentStarSystem?.children) {
                    parentStarSystem.children = [];
                }
                parentStarSystem.children.push(satellite);
            }
        }

        if (codeSet.has(satellite?.data?.code)) {
            hasConflict = true;
        }
        codeSet.add(satellite?.data?.code);
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
        
        if (codeSet.has(geoUnit?.data?.code)) {
            hasConflict = true;
        }
        codeSet.add(geoUnit?.data?.code);
    })

    if (hasConflict) {
        notification.error({
            message: '加载地理资源树失败！',
            description: '数据冲突，请检查数据库数据code字段是否重复！',
            duration: null 
        });
        return [];
    } else {
        return starSystemMap.values().toArray();
    }
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

    return constructGeoTree(starSystemData, starData, planetData, satelliteData, geoUnitData);
}


export function transfromGeoUnionToGeoTree(geoUnionList: IGeoUnionData[]): IGeoTreeItem<IGeoStarSystemData | IGeoStarData | IGeoPlanetData | IGeoSatelliteData | IGeoGeographyUnitData>[] {

    let starSystemData: IGeoTreeItem<IGeoStarSystemData>[] = [];
    let starData: IGeoTreeItem<IGeoStarData>[] = [];
    let planetData: IGeoTreeItem<IGeoPlanetData>[] = [];
    let satelliteData: IGeoTreeItem<IGeoSatelliteData>[] = [];
    let geoUnitData: IGeoTreeItem<IGeoGeographyUnitData>[] = [];

    function removeDataType(geoItem: IGeoUnionData): IGeoStarSystemData | IGeoStarData | IGeoPlanetData | IGeoSatelliteData | IGeoGeographyUnitData | never {
        const item2 = Object.assign({}, geoItem);
        const type = item2.data_type;
        delete item2.data_type;
        switch (type) {
            case 'starSystem':
                return item2 as IGeoStarSystemData;
            case 'star':
                return item2 as IGeoStarData;
            case 'planet':
                return item2 as IGeoPlanetData;
            case 'satellite':
                return item2 as IGeoSatelliteData;
            case 'geoUnit':
                return item2 as IGeoGeographyUnitData;
            default:
                throw new Error('Invalid data type: ' + type);
        }
    }

    geoUnionList.forEach(geoItem => {
        switch (geoItem.data_type) {
            case 'starSystem':
                starSystemData.push(wrapDataToTreeData(removeDataType(geoItem) as IGeoStarSystemData, 'starSystem'));
                break;
            case 'star':
                starData.push(wrapDataToTreeData(removeDataType(geoItem) as IGeoStarData, 'star'));
                break;
            case 'planet':
                planetData.push(wrapDataToTreeData(removeDataType(geoItem) as IGeoPlanetData, 'planet'));
                break;
            case 'satellite':
                satelliteData.push(wrapDataToTreeData(removeDataType(geoItem) as IGeoSatelliteData, 'satellite'));
                break;
            case 'geoUnit':
                geoUnitData.push(wrapDataToTreeData(removeDataType(geoItem) as IGeoGeographyUnitData, 'geoUnit'));
                break;
        }
    });

    return constructGeoTree(starSystemData, starData, planetData, satelliteData, geoUnitData);
}