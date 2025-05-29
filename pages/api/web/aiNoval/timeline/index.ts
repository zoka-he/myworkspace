import { NextApiRequest, NextApiResponse } from "next";
import TimelineDefService from "@/src/services/aiNoval/timelineDefService";

const timelineDefService = new TimelineDefService();

async function createOrUpdateOne(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;           
    const body = req.body;
    console.debug('body', body);

    if (typeof id === 'undefined') {
        await timelineDefService.insertOne(body);
        res.status(200).json({ message: 'created' });
    } else {
        await timelineDefService.updateOne({ id }, body);
        res.status(200).json({ message: 'updated, id:' + id });
    }
}

async function research(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    if (typeof id === 'undefined') {
        res.status(500).json({ message: 'id is required' });
    } else {
        let data = await timelineDefService.queryOne({ id });
        if (!data) {
            res.status(404).json({ message: 'not found, id:' + id });
        } else {
            res.status(200).json(data);
        }

    }
}

async function deleteOne(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    if (typeof id === 'undefined') {
        res.status(500).json({ message: 'id is required' });
    } else {
        await timelineDefService.deleteOne({ id });
        res.status(200).json({ message: 'deleted, id:' + id });
    }
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
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
