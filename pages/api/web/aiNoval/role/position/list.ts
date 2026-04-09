import type { NextApiRequest, NextApiResponse } from 'next';
import RolePositionService from '@/src/services/aiNoval/rolePositionService';
import { ApiResponse } from '@/src/types/ApiResponse';
import type { IRolePositionRecord } from '@/src/types/IAiNoval';

type Data = ApiResponse<{ data: IRolePositionRecord[]; count: number }>;

const service = new RolePositionService();

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }
  const worldview_id = Number(req.query.worldview_id);
  if (!Number.isFinite(worldview_id)) {
    res.status(400).json({ success: false, error: 'worldview_id is required' });
    return;
  }
  const role_id = req.query.role_id != null ? Number(req.query.role_id) : undefined;
  const role_info_id = req.query.role_info_id != null ? Number(req.query.role_info_id) : undefined;
  const page = req.query.page != null ? Number(req.query.page) : 1;
  const limit = req.query.limit != null ? Number(req.query.limit) : 100;

  try {
    const rs = await service.getList({ worldview_id, role_id, role_info_id, page, limit });
    res.status(200).json({ success: true, data: { data: rs.data as IRolePositionRecord[], count: rs.count || 0 } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to get role positions' });
  }
}

