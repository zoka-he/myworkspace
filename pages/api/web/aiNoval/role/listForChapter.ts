import type { NextApiRequest, NextApiResponse } from 'next'
import RoleDefService from '@/src/services/aiNoval/roleDefService';
import _ from 'lodash';
import { AxiosResponse } from 'axios';

const service = new RoleDefService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.status(405).json({ message: 'Method not allowed' });
        return;
    }

    if (!req.query.worldview_id) {
        res.status(400).json({ message: 'worldview_id is required' });
        return;
    }

    let worldview_id = _.toNumber(req.query.worldview_id);
    let ret = await service.getRoleListForChapter(worldview_id);
    res.status(200).json({
        data: ret,
    });
}