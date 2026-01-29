import GeoGeographyService from "@/src/services/aiNoval/geoGeographyService";
import GeoStarSystemService from "@/src/services/aiNoval/geoStarSystemService";
import GeoStarService from "@/src/services/aiNoval/geoStarService";
import GeoPlanetService from "@/src/services/aiNoval/geoPlanetService";
import GeoSatelliteService from "@/src/services/aiNoval/geoSatelliteService";
import _ from 'lodash';
import { IGeoUnionData } from "@/src/types/IAiNoval";

interface IGeoTreeItem extends IGeoUnionData {
    children: IGeoTreeItem[]
}

interface INormalizeGeoDataFn {
    (data: IGeoUnionData): IGeoTreeItem
}

const geoGeographyService = new GeoGeographyService();
const geoStarSystemService = new GeoStarSystemService();
const geoStarService = new GeoStarService();
const geoPlanetService = new GeoPlanetService();
const geoSatelliteService = new GeoSatelliteService();

function normalizeGeoData(type: string): INormalizeGeoDataFn {
    return (data: IGeoUnionData): IGeoTreeItem => {
        return {
            id: data.id,
            star_system_id: data.star_system_id,
            planet_id: data.planet_id,
            satellite_id: data.satellite_id,
            parent_id: data.parent_id,
            parent_type: data.parent_type,
            name: data.name,
            type,
            description: data.description,
            children: [],
        };
    };
}

export default async function getGeoStructure(worldviewId: number): Promise<IGeoTreeItem[]> {
    let [
        starSystemData,
        starData,
        planetData,
        satelliteData,
        geoUnitData,
    ] = await Promise.all([
        geoStarSystemService.queryBySql(
            `SELECT * FROM geo_star_system WHERE worldview_id = ?`,
            [worldviewId]
        ),
        geoStarService.queryBySql(
            `SELECT * FROM geo_star WHERE worldview_id = ?`,
            [worldviewId]
        ),
        geoPlanetService.queryBySql(
            `SELECT * FROM geo_planet WHERE worldview_id = ?`,
            [worldviewId]
        ),
        geoSatelliteService.queryBySql(
            `SELECT * FROM geo_satellite WHERE worldview_id = ?`,
            [worldviewId]
        ),
        geoGeographyService.queryBySql(
            `SELECT * FROM geo_geography_unit WHERE worldview_id = ?`,
            [worldviewId]
        ),
    ]);

    starSystemData = starSystemData.map(normalizeGeoData('starSystem')) as IGeoTreeItem[];
    starData = starData.map(normalizeGeoData('star')) as IGeoTreeItem[];
    planetData = planetData.map(normalizeGeoData('planet')) as IGeoTreeItem[];
    satelliteData = satelliteData.map(normalizeGeoData('satellite')) as IGeoTreeItem[];
    geoUnitData = geoUnitData.map(normalizeGeoData('geoUnit')) as IGeoTreeItem[];

    /** 组装逻辑
     * 1. 星系数据作为根节点及最上层节点
     * 2. 恒星数据作为星系的子节点
     * 3. 行星数据作为星系的子节点
     * 4. 卫星数据作为行星的子节点
     * 5. 地理单元数据作为行星的子节点
     */

    const tree: IGeoTreeItem[] = [];

    starSystemData.forEach(item => {
        if (item.parent_system_id) {
            const parent = starSystemData.find(sys => sys.id === item.parent_system_id);
            if (parent) {
                parent.children.push(item);
            }
        } else {
            tree.push(item);
        }
    });

    starData.forEach(item => {
        if (item.star_system_id) {
            const parent = starSystemData.find(sys => sys.id === item.star_system_id);
            if (parent) {
                parent.children.push(item);
            }
        }
    });

    planetData.forEach(item => {
        if (item.star_system_id) {
            const parent = starSystemData.find(sys => sys.id === item.star_system_id);
            if (parent) {
                parent.children.push(item);
            }
        }
    });

    satelliteData.forEach(item => {
        if (item.planet_id) {
            const parent = planetData.find(planet => planet.id === item.planet_id);
            if (parent) {
                parent.children.push(item);
            }
        }
    });

    geoUnitData.forEach(item => {
        let parent: IGeoTreeItem | undefined;
        if (item.planet_id && item.parent_type === 'planet') {
            parent = planetData.find(planet => planet.id === item.planet_id);
        } else if (item.satellite_id && item.parent_type === 'satellite') {
            parent = satelliteData.find(satellite => satellite.id === item.satellite_id);
        } else if (item.parent_id) {
            parent = geoUnitData.find(geoUnit => geoUnit.id === item.parent_id);
        }
        if (parent) {
            parent.children.push(item);
        }
    });

    return tree;
}