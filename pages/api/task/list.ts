// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import TaskService from "@/src/services/task/taskService";
import _ from 'lodash';
import { ISqlCondMap } from '@/src/utils/mysql/types';

type Data = Object;

const service = new TaskService();


async function research(req: NextApiRequest, res: NextApiResponse) {
    console.debug('req query', req.query);

    const page = _.toNumber(req.query.page || 1);
    const limit = _.toNumber(req.query.limit || 20);

    let queryObject: ISqlCondMap = {};

    for (let [k, v] of Object.entries(req.query)) {
        if (v === undefined) {
            continue;
        }

        switch (k) {
            case 'task_name':
                queryObject.task_name = { $like: `%${v}%` };
                break;
            case 'employee':
                queryObject.employee = { $like: `%${v}%` };
                break;
            case 'status':
            case 'status[]':
                if (v instanceof Array) {
                    queryObject.status = { $in: Array.from(v, item => _.toNumber(item)) };
                } else {
                    queryObject.status = v;
                }
                break;
        }
    }

    let ret = await service.query(queryObject, [], ['priority desc', 'create_time asc'], page, limit);
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
