// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import MagicSystemDefService from '@/src/services/aiNoval/magicSystemDef';

type Data = Object;

const service = new MagicSystemDefService();

async function createOrUpdateOne(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const body = req.body;
    console.debug('body', body);

    if (typeof id === 'undefined') {
        await service.insertOne(body);
        res.status(200).json({ message: 'created' });
    } else {
        await service.updateOne({ id }, body);
        res.status(200).json({ message: 'updated, id:' + id });
    }
}

async function research(req: NextApiRequest, res: NextApiResponse) {
    const { id, worldview_id } = req.query;
    
    if (typeof id !== 'undefined') {
        // 查询单个
        let data = await service.queryOne({ id });
        if (!data) {
            res.status(404).json({ message: 'not found, id:' + id });
        } else {
            res.status(200).json(data);
        }
    } else if (typeof worldview_id !== 'undefined') {
        // 查询世界观下的所有技能系统，按 order_num 排序
        let data = await service.query({ worldview_id }, [], ['order_num asc', 'id asc'], 1, 1000);
        res.status(200).json(data);
    } else {
        // 查询所有技能系统，按 order_num 排序
        let data = await service.query({}, [], ['order_num asc', 'id asc'], 1, 10000);
        res.status(200).json(data);
    }
}

async function deleteOne(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    if (typeof id === 'undefined') {
        res.status(500).json({ message: 'id is required' });
    } else {
        await service.deleteOne({ id });
        res.status(200).json({ message: 'deleted, id:' + id });
    }
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
        case 'DELETE':
            processerFn = deleteOne
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' })
        return;
    }

    processerFn(req, res);
}
