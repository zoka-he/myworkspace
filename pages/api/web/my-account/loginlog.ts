// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import LoginLogService from '@/src/services/user/loginLogService';
import _ from 'lodash';
import { ISqlCondMap } from '@/src/utils/mysql/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

type Data = Object;

const service = new LoginLogService();


async function research(req: NextApiRequest, res: NextApiResponse) {
    let session = await getServerSession(req, res, authOptions);

    // @ts-ignore
    let userID = session?.user?.id;
    if (typeof userID !== 'number' && typeof userID !== 'string') {
        res.status(500).json({ message: 'session data 校验失败, 请重新登录！' });
        return;
    }

    const page = _.toNumber(req.query.page || 1);
    const limit = _.toNumber(req.query.limit || 20);

    let ret = await service.query(
        `SELECT username, nickname, login_time 
        from (
            select UID, login_time from t_login_log where UID=? order by LID desc limit ?,?
        ) tll 
        left join t_login_account tla 
        on tll.UID=tla.ID`,
        [
            userID,
            (page - 1) * limit,
            limit
        ]
    );
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
