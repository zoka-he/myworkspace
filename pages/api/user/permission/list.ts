// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import PermissionService from "@/src/services/user/permissionService";
import _ from 'lodash';
import { ISqlCondMap } from '@/src/utils/mysql/types';

type Data = Object;

const service = new PermissionService();


async function research(req: NextApiRequest, res: NextApiResponse) {
    console.debug('req query', req.query);

    const page = _.toNumber(req.query.page || 1);
    const limit = _.toNumber(req.query.limit || 500);

    let queryObject: ISqlCondMap = {};

    for (let [k, v] of Object.entries(req.query)) {
        if (v === undefined) {
            continue;
        }

        switch (k) {
            case 'label':
                queryObject.label = { $like: `%${v}%` };
                break;
            case 'url':
                queryObject.url = { $like: `%${v}%` };
                break;
            case 'uri':
                queryObject.uri = { $like: `%${v}%` };
                break;
            case 'type':
                queryObject.type = v;
                break;
        }
    }

    let ret = await service.query(queryObject, [], ['ID asc'], page, limit);
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
    } catch (e: any) {
        res.status(500).json({ message: e.message });
        return;
    }
}
