import type { NextApiRequest, NextApiResponse } from 'next';
import RoleMemoryService from '@/src/services/aiNoval/roleMemoryService';
import { ApiResponse } from '@/src/types/ApiResponse';
import type { IRoleMemory } from '@/src/types/IAiNoval';

function parseRow(row: any): IRoleMemory {
  const item = { ...row };
  if (item.affects_slots != null && typeof item.affects_slots === 'string') {
    try {
      item.affects_slots = JSON.parse(item.affects_slots);
    } catch {
      item.affects_slots = null;
    }
  }
  return item as IRoleMemory;
}

type Data = ApiResponse<{ data: IRoleMemory[]; count: number }>;

const service = new RoleMemoryService();

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed, only GET' });
    return;
  }
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 50);
  const worldview_id = req.query.worldview_id != null ? Number(req.query.worldview_id) : null;
  const role_info_id = req.query.role_info_id != null ? Number(req.query.role_info_id) : null;

  if (worldview_id == null) {
    res.status(400).json({ success: false, error: 'worldview_id is required' });
    return;
  }

  try {
    const params: any = { worldview_id, page, limit };
    if (role_info_id != null) params.role_info_id = role_info_id;
    if (req.query.affects_slot != null && req.query.affects_slot !== '') {
      params.affects_slot = String(req.query.affects_slot);
    }
    if (req.query.memory_type != null && req.query.memory_type !== '') {
      params.memory_type = String(req.query.memory_type);
    }
    if (req.query.related_role_info_id != null) {
      params.related_role_info_id = Number(req.query.related_role_info_id);
    }
    if (req.query.importance_min != null && req.query.importance_min !== '') {
      params.importance_min = String(req.query.importance_min);
    }
    if (req.query.sort_order != null && req.query.sort_order !== '') {
      params.sort_order = String(req.query.sort_order);
    }

    const result = await service.getList(params);
    const data = (result.data || []).map(parseRow);

    res.status(200).json({
      success: true,
      data: { data, count: result.count || 0 },
    });
  } catch (error: any) {
    console.error('[RoleMemory API] List error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get role memory list',
    });
  }
}
