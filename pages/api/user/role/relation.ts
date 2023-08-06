// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import RolePermissionService from "@/src/services/user/rolePermissionService";
import _ from 'lodash';
import { ISqlCondMap } from '@/src/utils/mysql/types';

type Data = Object;

const service = new RolePermissionService();

async function createOrUpdateOne(req: NextApiRequest, res: NextApiResponse) {
    const { RID, PID, get, post, del } = req.body;
    const body = req.body;
    console.debug('body', body);

    if (typeof RID !== 'number' || typeof PID !== 'number') {
        res.status(500).json({ message: 'RID and PID must be number!' });
        return;
    } 
    
    await service.updateRelative(RID, PID, get, post, del);
    res.status(200).json({ message: 'updated' });
}

async function research(req: NextApiRequest, res: NextApiResponse) {
    const { RID } = req.query;
    if (typeof RID === 'undefined') {
        res.status(500).json({ message: 'RID is required' });
        return;
    } 
    
    const page = _.toNumber(req.query.page || 1);
    const limit = _.toNumber(req.query.limit || 100);

    let queryObject: ISqlCondMap = {};

    for (let [k, v] of Object.entries(req.query)) {
        if (v === undefined) {
            continue;
        }

        switch (k) {
            case 'RID':
            case 'PID':
                queryObject[k] = v;
                break;
        }
    }

    let ret = await service.query(queryObject, [], ['PID asc'], page, limit);
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
        case 'POST':
            processerFn = createOrUpdateOne;
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' })
        return;
    }

    processerFn(req, res);
}
