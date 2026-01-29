// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import WorldRuleSnapshotService from '@/src/services/aiNoval/worldRuleSnapshotService';
import _ from 'lodash';
import { ISqlCondMap } from '@/src/utils/mysql/types';

type Data = Object;

const service = new WorldRuleSnapshotService();


async function research(req: NextApiRequest, res: NextApiResponse) {
    console.debug('req query', req.query);

    const page = _.toNumber(req.query.page || 1);
    const limit = _.toNumber(req.query.limit || 20);

    let queryObject: ISqlCondMap = {};

    for (let [k, v] of Object.entries(req.query)) {
        if (v === undefined) {
            continue;
        }

        switch(k) {
            case 'worldview_id':
                queryObject.worldview_id = v;
                break;
        }
    }

    let ret = await service.query(queryObject, [], ['id asc'], page, limit);
    res.status(200).json(ret);
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
