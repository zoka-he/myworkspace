// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from '@/src/utils/session';

interface ILoginAuthResponse {
    message?: string
}

async function auth(
    req: NextApiRequest,
    res: NextApiResponse<ILoginAuthResponse>
) {
    let session = await getSession(req, res);
    session.user = {
        ID: 1,
        username: 'admin',
        type: 'admin'
    };
    session.commit();

    console.debug('res', res);
    res.status(200).json({ message: 'OK' });
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ILoginAuthResponse>
) {

    try {
        await auth(req, res);
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ message: e.message });
        return;
    }
}