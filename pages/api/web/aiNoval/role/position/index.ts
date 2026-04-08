import type { NextApiRequest, NextApiResponse } from 'next';
import RolePositionService from '@/src/services/aiNoval/rolePositionService';
import WorldviewPositionRuleService from '@/src/services/aiNoval/worldviewPositionRuleService';
import type { IRolePositionRecord } from '@/src/types/IAiNoval';
import { ApiResponse } from '@/src/types/ApiResponse';

type Data = ApiResponse<IRolePositionRecord | { message: string }>;

const service = new RolePositionService();
const ruleService = new WorldviewPositionRuleService();

function parseBody(body: any) {
  return {
    ...body,
    worldview_id: body.worldview_id != null ? Number(body.worldview_id) : body.worldview_id,
    role_id: body.role_id != null ? Number(body.role_id) : body.role_id,
    role_info_id: body.role_info_id != null ? Number(body.role_info_id) : body.role_info_id,
    occurred_at: body.occurred_at != null ? Number(body.occurred_at) : body.occurred_at,
  };
}

async function getOne(req: NextApiRequest, res: NextApiResponse<Data>) {
  const id = req.query.id;
  if (!id) {
    res.status(400).json({ success: false, error: 'id is required' });
    return;
  }
  const row = await service.getById(Number(id));
  if (!row) {
    res.status(404).json({ success: false, error: 'Not found' });
    return;
  }
  res.status(200).json({ success: true, data: row as IRolePositionRecord });
}

async function createOrUpdate(req: NextApiRequest, res: NextApiResponse<Data>) {
  const id = req.query.id;
  const body = parseBody(req.body || {});
  if (!body.worldview_id || !body.role_id || !body.role_info_id || !body.geo_code || body.occurred_at == null) {
    res.status(400).json({ success: false, error: 'worldview_id/role_id/role_info_id/geo_code/occurred_at are required' });
    return;
  }
  const rule = await ruleService.getRule(body.worldview_id);
  const prevRecord = await service.getPrevRecord({
    worldview_id: body.worldview_id,
    role_id: body.role_id,
    occurred_at: body.occurred_at,
    currentId: id ? Number(id) : undefined,
  });
  const validation = service.buildValidation({ record: body, prevRecord, rule });
  if (validation.level === 'block') {
    res.status(400).json({ success: false, error: 'POSITION_JUMP_BLOCKED', data: validation as any });
    return;
  }
  body.validation_snapshot = validation;
  const payload = service.stringifyPayload(body);
  try {
    if (!id) {
      const insertId = await service.insertOne(payload);
      const created = await service.getById(insertId);
      res.status(200).json({ success: true, data: created as IRolePositionRecord, message: validation.level === 'warn' ? 'POSITION_JUMP_WARN' : 'created' });
      return;
    }
    await service.updateOne({ id: Number(id) }, payload);
    const updated = await service.getById(Number(id));
    res.status(200).json({ success: true, data: updated as IRolePositionRecord, message: validation.level === 'warn' ? 'POSITION_JUMP_WARN' : 'updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to save role position' });
  }
}

async function deleteOne(req: NextApiRequest, res: NextApiResponse<Data>) {
  const id = req.query.id;
  if (!id) {
    res.status(400).json({ success: false, error: 'id is required' });
    return;
  }
  await service.updateOne({ id: Number(id) }, { is_deleted: 1 });
  res.status(200).json({ success: true, data: { message: `deleted, id:${id}` } as any });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method === 'GET') return getOne(req, res);
  if (req.method === 'POST' || req.method === 'PUT') return createOrUpdate(req, res);
  if (req.method === 'DELETE') return deleteOne(req, res);
  res.status(405).json({ success: false, error: 'Method not allowed' });
}

