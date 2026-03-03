import type { NextApiRequest, NextApiResponse } from 'next';
import RoleGroupService from '@/src/services/aiNoval/roleGroupService';
import RoleGroupMemberService from '@/src/services/aiNoval/roleGroupMemberService';
import _ from 'lodash';

const roleGroupService = new RoleGroupService();
const memberService = new RoleGroupMemberService();

type Data = object;

async function createOrUpdateOne(req: NextApiRequest, res: NextApiResponse<Data>) {
    const { id } = req.query;
    const body = req.body as { members?: Array<{ role_info_id: number; sort_order?: number; role_in_group?: string; notes_with_others?: string }> };
    const members = body?.members;
    const groupPayload = _.omit(body, ['members']);

    if (typeof id === 'undefined') {
        const insertRet = await roleGroupService.insertOne(groupPayload);
        const newId = (insertRet as any)?.insertId ?? (insertRet as any)?.id;
        if (newId && Array.isArray(members) && members.length > 0) {
            await memberService.insertMembers(newId, members);
        }
        res.status(200).json({ message: 'created', id: newId });
    } else {
        const groupId = _.toNumber(id);
        await roleGroupService.updateOne({ id: groupId }, groupPayload);
        if (Array.isArray(members)) {
            await memberService.deleteByRoleGroupId(groupId);
            if (members.length > 0) {
                await memberService.insertMembers(groupId, members);
            }
        }
        res.status(200).json({ message: 'updated, id:' + id });
    }
}

async function research(req: NextApiRequest, res: NextApiResponse<Data>) {
    const { id } = req.query;
    if (typeof id === 'undefined') {
        res.status(400).json({ message: 'id is required' });
        return;
    }
    const data = await roleGroupService.queryOne({ id: _.toNumber(id) });
    if (!data) {
        res.status(404).json({ message: 'not found, id:' + id });
        return;
    }
    const members = await memberService.listByRoleGroupId(_.toNumber(id));
    res.status(200).json({ ...data, members: members || [] });
}

async function deleteOne(req: NextApiRequest, res: NextApiResponse<Data>) {
    const { id } = req.query;
    if (typeof id === 'undefined') {
        res.status(400).json({ message: 'id is required' });
        return;
    }
    const groupId = _.toNumber(id);
    await memberService.deleteByRoleGroupId(groupId);
    await roleGroupService.deleteOne({ id: groupId });
    res.status(200).json({ message: 'deleted, id:' + id });
}

export default function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
    let processerFn: ((req: NextApiRequest, res: NextApiResponse<Data>) => Promise<void>) | undefined;
    switch (req.method) {
        case 'GET':
            processerFn = research;
            break;
        case 'POST':
            processerFn = createOrUpdateOne;
            break;
        case 'DELETE':
            processerFn = deleteOne;
            break;
    }
    if (!processerFn) {
        res.status(405).json({ message: '不支持的操作!' });
        return;
    }
    processerFn(req, res).catch((e: any) => {
        res.status(500).json({ message: e?.message || 'server error' });
    });
}
