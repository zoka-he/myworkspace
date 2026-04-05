import type { NextApiRequest, NextApiResponse } from 'next';
import RoleMemoryService from '@/src/services/aiNoval/roleMemoryService';
import { ApiResponse } from '@/src/types/ApiResponse';

type Data = ApiResponse<{ copied: number }>;

const service = new RoleMemoryService();

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed, only POST' });
    return;
  }
  const body = req.body || {};
  const worldview_id = body.worldview_id != null ? Number(body.worldview_id) : NaN;
  const from_role_info_id = body.from_role_info_id != null ? Number(body.from_role_info_id) : NaN;
  const to_role_info_id = body.to_role_info_id != null ? Number(body.to_role_info_id) : NaN;

  if (!Number.isFinite(worldview_id) || !Number.isFinite(from_role_info_id) || !Number.isFinite(to_role_info_id)) {
    res.status(400).json({ success: false, error: '缺少或非法参数：worldview_id、from_role_info_id、to_role_info_id' });
    return;
  }

  try {
    const result = await service.copyMemoriesFromRoleInfo({
      worldview_id,
      from_role_info_id,
      to_role_info_id,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error('[RoleMemory API] Copy error:', error);
    res.status(200).json({
      success: false,
      error: error?.message || '拷贝角色记忆失败',
    });
  }
}
