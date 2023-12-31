// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import TaskService from "@/src/services/task/taskService";
import _ from 'lodash';


type Data = Object;

const service = new TaskService();


async function research(req: NextApiRequest, res: NextApiResponse) {
    let ret = await service.getTaskCount();
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
