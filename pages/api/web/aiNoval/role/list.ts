// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import RoleDefService from '@/src/services/aiNoval/roleDefService';
import _ from 'lodash';
import { ISqlCondMap } from '@/src/utils/mysql/types';

type Data = Object;

const service = new RoleDefService();


async function research(req: NextApiRequest, res: NextApiResponse) {
    console.debug('req query', req.query);

    let page = _.toNumber(req.query.page || 1);
    let limit = _.toNumber(req.query.limit || 100);

    let ret = await service.getRoleDefList({
        ...req.query,
        page,
        limit
    });
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
