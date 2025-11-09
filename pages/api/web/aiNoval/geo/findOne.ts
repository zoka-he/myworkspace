import GeoGeographyService from "@/src/services/aiNoval/geoGeographyService";
import GeoStarSystemService from "@/src/services/aiNoval/geoStarSystemService";
import GeoStarService from "@/src/services/aiNoval/geoStarService";
import GeoPlanetService from "@/src/services/aiNoval/geoPlanetService";
import GeoSatelliteService from "@/src/services/aiNoval/geoSatelliteService";
import _ from 'lodash';

import { NextApiRequest, NextApiResponse } from "next";
import { ISqlCondMap } from "@/src/types/IMysqlActions";

const geoGraphyService = new GeoGeographyService();
const geoStarSystemService = new GeoStarSystemService();
const geoStarService = new GeoStarService();
const geoPlanetService = new GeoPlanetService();
const geoSatelliteService = new GeoSatelliteService();

async function research(req: NextApiRequest, res: NextApiResponse) {
    const { name, worldview_id } = req.query;
    
    if (!name) {
        res.status(500).json({ message: 'name is required' });
        return;
    }

    let cond: ISqlCondMap = {
        name: { $like: `%${name}%` },
    };

    if (!!worldview_id && _.isNumber(_.toNumber(worldview_id))) {
        cond.worldview_id = _.toNumber(worldview_id);
    }

    let ret = null;

    ret = await geoStarSystemService.queryOne(cond);
    if (ret) {
        res.status(200).json(ret);
        return;
    }

    ret = await geoStarService.queryOne(cond);
    if (ret) {
        res.status(200).json(ret);
        return;
    }

    ret = await geoPlanetService.queryOne(cond);
    if (ret) {
        res.status(200).json(ret);
        return;
    }

    ret = await geoSatelliteService.queryOne(cond);
    if (ret) {
        res.status(200).json(ret);
        return;
    }

    ret = await geoGraphyService.queryOne(cond);
    if (ret) {
        res.status(200).json(ret);
        return;
    }

    res.status(204).json(null);
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
    let processerFn: Function | undefined = undefined;
    switch (req.method) {
        case 'GET':
            processerFn = research;
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' })
        return;
    }

    processerFn(req, res);
}