import { NextApiRequest, NextApiResponse } from 'next';
import pcInitDataHandler from '../../web/my-account/initdata';

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
    return pcInitDataHandler(req, res);
}