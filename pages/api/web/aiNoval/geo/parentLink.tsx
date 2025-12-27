// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import StarSystemService from '@/src/services/aiNoval/geoStarSystemService';
import StarService from '@/src/services/aiNoval/geoStarService';
import PlanetService from '@/src/services/aiNoval/geoPlanetService';
import SatelliteService from '@/src/services/aiNoval/geoSatelliteService';
import GeographyService from '@/src/services/aiNoval/geoGeographyService';
import { IGeoGeographyUnitData } from '@/src/types/IAiNoval';
type Data = any;

const starSystemService = new StarSystemService();
const starService = new StarService();
const planetService = new PlanetService();
const satelliteService = new SatelliteService();
const geographyService = new GeographyService();

async function queryGeoUnit(geoUnitType: string, geoUnitId: string | number) {
    let geoUnit: any = null;

    if (!geoUnitId) {
        return null;
    }

    let service = null;

    if (geoUnitType === 'starSystem') {
        service = starSystemService;
    } else if (geoUnitType === 'star') {
        service = starService;
    } else if (geoUnitType === 'planet') {
        service = planetService;
    } else if (geoUnitType === 'satellite') {
        service = satelliteService;
    } else if (geoUnitType === 'geoUnit') {
        service = geographyService;
    }

    if (!service) {
        return null;
    }

    geoUnit = await service.queryOne({ id: geoUnitId });
    geoUnit.geoUnitType = geoUnitType;

    return geoUnit;
}

async function queryParentGeoUnit(geoObj: any) {
    let geoUnit: any = null;

    let parentGeoUnitType = null;
    let parentGeoUnitId = null;

    switch (geoObj.geoUnitType) {
        case 'starSystem':
            // 星系没有父级
            console.debug(`子级为星系，没有父级`);
            break;
        case 'star':
        case 'planet':
            console.debug(`子级为${geoObj.geoUnitType}，父级为starSystem`);
            parentGeoUnitType = 'starSystem';
            parentGeoUnitId = geoObj.star_system_id;
            break;
        case 'satellite':
            console.debug(`子级为${geoObj.geoUnitType}，父级为planet`);
            parentGeoUnitType = 'planet';
            parentGeoUnitId = geoObj.planet_id;
            break;
        case 'geoUnit':
            console.debug(`子级为${geoObj.geoUnitType}，父级为${geoObj.parent_type}`);
            if (geoObj.parent_type === 'planet') {
                parentGeoUnitType = 'planet';
                parentGeoUnitId = geoObj.planet_id;
            } else if (geoObj.parent_type === 'satellite') {
                parentGeoUnitType = 'satellite';
                parentGeoUnitId = geoObj.satellite_id;
            } else if (geoObj.parent_type === 'geoUnit') {
                parentGeoUnitType = 'geoUnit';
                parentGeoUnitId = geoObj.parent_id;
            }
            break;
    }

    if (!parentGeoUnitType || !parentGeoUnitId) {
        console.debug(`找不到合适的父级条件: 子级条件：${geoObj.geoUnitType} 查询ID：${geoObj.id}`);
        console.debug(`父级条件：${parentGeoUnitType} ${parentGeoUnitId}`);
        return null;
    }

    let obj = await queryGeoUnit(parentGeoUnitType, parentGeoUnitId);
    if (!obj) {
        console.debug(`找不到父级对象: 查询类型：${parentGeoUnitType} 查询ID：${parentGeoUnitId}`);
        return null;
    }

    obj.geoUnitType = parentGeoUnitType;
    console.debug(`已查询到父级对象`);

    return obj;
}

async function handleQuery(req: NextApiRequest, res: NextApiResponse) {
    const { geoUnitType, geoUnitId } = req.query;

    if (!geoUnitType || !geoUnitId) {
        res.status(500).json({ message: '参数错误!' });
        return;
    }

    let loopCount = 0, maxLoop = 10;
    let geoUnitLink: any[] = [];

    let selfGeoUnit = await queryGeoUnit(geoUnitType as string, geoUnitId as string);
    if (!selfGeoUnit) {
        res.status(500).json({ message: '找不到对象!' });
        return;
    }
    
    geoUnitLink.unshift(selfGeoUnit);

    for (loopCount = 0; loopCount < maxLoop; loopCount++) {
        let parentGeoUnit = await queryParentGeoUnit(geoUnitLink[0]);
        if (!parentGeoUnit) {
            console.debug(`未查询到父级对象，迭代结束`);
            break;
        }
        geoUnitLink.unshift(parentGeoUnit);
    }

    if (loopCount === 0) {
        console.debug(`疑似运行异常，未进入迭代`);
    }

    res.status(200).json({ message: '查询成功!', data: geoUnitLink });
}


export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    let processerFn: Function | undefined = undefined;
    switch (req.method) {
        case 'GET':
            processerFn = handleQuery;
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' })
        return;
    }

    processerFn(req, res);
}
