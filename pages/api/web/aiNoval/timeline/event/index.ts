import { NextApiRequest, NextApiResponse } from "next";
import TimelineEventService from "@/src/services/aiNoval/timelineEventService";
import _ from 'lodash';


const service = new TimelineEventService();

async function createOrUpdateOne(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;           
    const body = req.body;
    console.debug('body', body);

    // 合并阵营id和角色id
    body.faction_ids = body.faction_ids.join(',');
    body.role_ids = body.role_ids.join(',');

    if (typeof id === 'undefined') {
        await service.insertOne(body);
        res.status(200).json({ message: 'created' });
    } else {
        await service.updateOne({ id }, body);
        res.status(200).json({ message: 'updated, id:' + id });
    }
}

async function research(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    if (typeof id === 'undefined') {
        res.status(500).json({ message: 'id is required' });
    } else {
        let data = await service.queryOne({ id });
        if (!data) {
            res.status(404).json({ message: 'not found, id:' + id });
        } else {
            // 拆解阵营id和角色id
            data.faction_ids = data.faction_ids.split(',').filter((id: string) => id.trim() !== '').map((id: string) => _.toNumber(id));
            data.role_ids = data.role_ids.split(',').filter((id: string) => id.trim() !== '').map((id: string) => _.toNumber(id));
            res.status(200).json(data);
        }

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
