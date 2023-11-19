import { NextApiRequest, NextApiResponse } from 'next';
import decodeLoginInfo from '@/src/utils/appAuth/decodeLoginInfo';

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { body } = req;
    // console.debug('app login req -->>', req);

    const secretJson = decodeLoginInfo(body);
    const loginPayload = JSON.parse(secretJson);

    console.debug(loginPayload);

    res.status(200).json({ message: 'ok', data: loginPayload });

    // if (!username || !password) {
    //     res.status(500).json({
    //         success: false,
    //         message: 'username or password '
    //     })
    // }
}