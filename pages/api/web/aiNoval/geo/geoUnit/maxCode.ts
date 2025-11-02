// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import GeographyService from '@/src/services/aiNoval/geoGeographyService';
import _ from 'lodash';
import { ISqlCondMap } from '@/src/utils/mysql/types';

type Data = Object;

const service = new GeographyService();


async function research(req: NextApiRequest, res: NextApiResponse) {
    let prefix = req.query.prefix as string;
    if (!prefix) {
        res.status(500).json({ message: 'prefix 不能为空!' });
        return;
    }

    let ret = await service.getMaxCode(prefix);
    res.status(200).json({ data: ret });
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
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

    try {
      processerFn(req, res);
    } catch(e: any) {
      res.status(500).json({ message: e.message });
      return;
    }
}
