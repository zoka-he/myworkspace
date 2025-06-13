// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import MyAccountService from '@/src/services/user/myAccountService';
import _ from 'lodash';
import LoginLogService from '@/src/services/user/loginLogService';
import logger from '@/src/utils/logger';

type Data = Object;

const myAccountService = new MyAccountService();
const loginLogService = new LoginLogService();

async function research(req: NextApiRequest, res: NextApiResponse) {
    // let userID = req.headers['x-userid'];

    // if (typeof userID !== 'number' && typeof userID !== 'string') {
    //     res.status(500).json({ message: 'apptoken 异常, 请重新登录！' });
    //     return;
    // }

    // try {
    //     // @ts-ignore
    //     await loginLogService.addLog(userID, '');
    // } catch(e) {
    //     console.error(e);
    // }
    
    // @ts-ignore
    let ret = await myAccountService.getMainPageInitData(null);
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
