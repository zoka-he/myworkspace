// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import TaskService from "@/src/business/taskManage/taskService";
import { ISqlCondMap } from '@/src/utils/mysql/types';

type Data = any;

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    let queryObject: ISqlCondMap = {};

    for (let [k, v] of Object.entries(req.query)) {
        if (v === undefined) {
            continue;
        }

        switch(k) {
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

    new TaskService().getDashboard(queryObject).then(data => {
        res.status(200).json(data)
    })
}
