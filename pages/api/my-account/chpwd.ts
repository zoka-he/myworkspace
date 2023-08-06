import type { NextApiRequest, NextApiResponse } from 'next'
import LoginAccountService from '@/src/services/user/loginAccountService';
import _ from 'lodash';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

let loginAccountService = new LoginAccountService();

async function doChpwd(userID: string, payload: string) {
    return await loginAccountService.chpwd(userID, payload);
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // 检查method
    if (req.method !== 'POST') {
        res.status(500).json({ message: '不支持的操作!' })
        return;
    }

    // 检查session
    let session = await getServerSession(req, res, authOptions);

    // @ts-ignore
    let userID = session?.user?.id;
    if (typeof userID !== 'number' && typeof userID !== 'string') {
        res.status(500).json({ message: 'session data 校验失败, 请重新登录！' });
        return;
    }

    let { payload } = req.body;
    if (typeof payload !== 'string' || !payload) {
        res.status(500).json({ message: 'session data 校验失败, 请重新登录！' });
        return;
    }

    try {
        //@ts-ignore
        let result = await doChpwd(userID, payload);
        if (result === true) {
            res.status(200).json({ message: 'OK' });
            return;
        }
        
    } catch (e: any) {
        console.error(e);
    }

    res.status(500).json({ message: e.message });
}
