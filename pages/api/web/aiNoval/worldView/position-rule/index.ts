import type { NextApiRequest, NextApiResponse } from 'next';
import WorldviewPositionRuleService from '@/src/services/aiNoval/worldviewPositionRuleService';
import { ApiResponse } from '@/src/types/ApiResponse';
import type { IWorldviewPositionRule } from '@/src/types/IAiNoval';

type Data = ApiResponse<IWorldviewPositionRule>;

const service = new WorldviewPositionRuleService();

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const worldview_id = Number(req.query.worldview_id ?? req.body?.worldview_id);
  if (!Number.isFinite(worldview_id)) {
    res.status(400).json({ success: false, error: 'worldview_id is required' });
    return;
  }
  try {
    if (req.method === 'GET') {
      const data = await service.getRule(worldview_id);
      res.status(200).json({ success: true, data });
      return;
    }
    if (req.method === 'POST') {
      const data = await service.upsertRule(worldview_id, req.body || {});
      res.status(200).json({ success: true, data });
      return;
    }
    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to process worldview position rule' });
  }
}

