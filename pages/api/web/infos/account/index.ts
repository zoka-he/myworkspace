// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import AccountService from "@/src/services/account/accountService";
import AccountHistroyService from '@/src/services/account/accountHistroyService';

type Data = Object;

const accountService = new AccountService();
const histroyService = new AccountHistroyService();

async function createOrUpdateOne(req: NextApiRequest, res: NextApiResponse) {
    const body = req.body;
    const { sys_name, username } = req.body;
    console.debug('body', body);

    if (typeof sys_name === 'undefined' || typeof username === 'undefined') {
        res.status(500).json({ message: 'sys_name and username is required' });
        return;
    }

    let oldData = await accountService.queryOne({ sys_name, username });

    if (!oldData) {
        await accountService.insertOne(body);
        body.update_time = new Date();
        await histroyService.insertOne(body);

        res.status(200).json({ message: 'created' });
    } else {
        await accountService.updateOne({ sys_name, username }, body);
        body.update_time = new Date();
        await histroyService.insertOne(body);

        res.status(200).json({ message: 'updated, sys_name, username:' + sys_name + ', ' + username });
    }
}

async function research(req: NextApiRequest, res: NextApiResponse) {
    const { sys_name, username } = req.query;
    if (typeof sys_name === 'undefined' || typeof username === 'undefined') {
        res.status(500).json({ message: 'sys_name and username is required' });
    } else {
        let data = await accountService.queryOne({ sys_name, username });
        if (!data) {
            res.status(404).json({ message: 'not found, sys_name, username:' + sys_name + ', ' + username });
        } else {
            res.status(200).json(data);
        }

    }
}

async function deleteOne(req: NextApiRequest, res: NextApiResponse) {
    const { sys_name, username } = req.query;
    if (typeof sys_name === 'undefined' || typeof username === 'undefined') {
        res.status(500).json({ message: 'sys_name, username is required' });
    } else {
        await accountService.deleteOne({ sys_name, username });
        res.status(200).json({ message: 'deleted, sys_name, username:' + sys_name + ', ' + username });
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
