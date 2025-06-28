// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import StarSystemService from '@/src/services/aiNoval/geoStarSystemService';
import StarService from '@/src/services/aiNoval/geoStarService';
import PlanetService from '@/src/services/aiNoval/geoPlanetService';
import SatelliteService from '@/src/services/aiNoval/geoSatelliteService';
import GeographyService from '@/src/services/aiNoval/geoGeographyService';

type Data = Object;

const starSystemService = new StarSystemService();
const starService = new StarService();
const planetService = new PlanetService();
const satelliteService = new SatelliteService();
const geographyService = new GeographyService();

async function handleUpdateOne(req: NextApiRequest, res: NextApiResponse) {
    const { geoUnitType, geoUnitId, difyDatasetId, difyDocumentId } = req.body;

    if (!geoUnitType || !geoUnitId || !difyDatasetId || !difyDocumentId) {
        res.status(500).json({ message: '参数错误!' });
        return;
    }

    const lineIndex = { id: geoUnitId };
    const data = { dify_document_id: difyDocumentId, dify_dataset_id: difyDatasetId };
    let service: any = undefined;

    if (geoUnitType === 'starSystem') {
        service = starSystemService;
    } else if (geoUnitType === 'star') {
        service = starService;
    } else if (geoUnitType === 'planet') {
        service = planetService;
    } else if (geoUnitType === 'satellite') {
        service = satelliteService;
    } else if (geoUnitType === 'geography_unit') {
        service = geographyService;
    }

    if (service) {
        await service.updateOne(lineIndex, data);
        res.status(200).json({ message: '更新成功!' });
    } else {
        res.status(500).json({ message: '您传递的geoUnitType不在支持范围内!请检查代码！' });
    }
}


export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    let processerFn: Function | undefined = undefined;
    switch (req.method) {
        case 'POST':
            processerFn = handleUpdateOne;
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' })
        return;
    }

    processerFn(req, res);
}
