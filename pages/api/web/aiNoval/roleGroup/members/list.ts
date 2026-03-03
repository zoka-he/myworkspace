import type { NextApiRequest, NextApiResponse } from 'next';
import RoleGroupMemberService from '@/src/services/aiNoval/roleGroupMemberService';
import _ from 'lodash';

type Data = any[] | { message: string };

const service = new RoleGroupMemberService();

async function research(req: NextApiRequest, res: NextApiResponse<Data>) {
    const role_group_id = req.query.role_group_id != null ? _.toNumber(req.query.role_group_id) : undefined;
    if (role_group_id == null || isNaN(role_group_id)) {
        res.status(400).json({ message: 'role_group_id is required' });
        return;
    }
    const members = await service.listByRoleGroupId(role_group_id);
    res.status(200).json(Array.isArray(members) ? members : []);
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
