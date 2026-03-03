import type { NextApiRequest, NextApiResponse } from 'next';
import RoleGroupService from '@/src/services/aiNoval/roleGroupService';
import _ from 'lodash';

type Data = { data?: any[]; count?: number };

const service = new RoleGroupService();

async function research(req: NextApiRequest, res: NextApiResponse<Data>) {
    const page = _.toNumber(req.query.page || 1);
    const limit = _.toNumber(req.query.limit || 100);
    const worldview_id = req.query.worldview_id != null ? _.toNumber(req.query.worldview_id) : undefined;
    const group_status = req.query.group_status as string | undefined;

    if (!worldview_id) {
        res.status(400).json({ message: 'worldview_id is required' });
        return;
    }

    const ret = await service.listByWorldview(worldview_id, { page, limit, group_status });
    res.status(200).json(ret);
}

export default function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
    if (req.method !== 'GET') {
        res.status(405).json({ message: 'Method not allowed' });
        return;
    }
    research(req, res).catch((e: any) => {
        res.status(500).json({ message: e?.message || 'server error' });
    });
}
