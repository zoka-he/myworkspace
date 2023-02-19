// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import FuckCheckService from "@/src/business/fuckCheck/uplineCheckService";

type Data = Object;

const service = new FuckCheckService();

async function createOrUpdateOne(req: NextApiRequest, res: NextApiResponse) {
    const { ID } = req.query;
    const body = req.body;
    console.debug('body', body);

    if (typeof ID === 'undefined') {
        await service.insertOne(body);
        res.status(200).json({ message: 'created' });
    } else {
        await service.updateOne({ ID }, body);
        res.status(200).json({ message: 'updated, ID:' + ID });
    }
}

async function research(req: NextApiRequest, res: NextApiResponse) {
    const { ID } = req.query;
    if (typeof ID === 'undefined') {
        res.status(500).json({ message: 'ID is required' });
    } else {
        let data = await service.queryOne({ ID });
        if (!data) {
            res.status(404).json({ message: 'not found, ID:' + ID });
        } else {
            res.status(200).json(data);
        }

    }
}

async function deleteOne(req: NextApiRequest, res: NextApiResponse) {
    const { ID } = req.query;
    if (typeof ID === 'undefined') {
        res.status(500).json({ message: 'ID is required' });
    } else {
        await service.deleteOne({ ID });
        res.status(200).json({ message: 'deleted, ID:' + ID });
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
