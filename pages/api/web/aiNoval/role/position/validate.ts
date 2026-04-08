import type { NextApiRequest, NextApiResponse } from 'next';
import RolePositionService from '@/src/services/aiNoval/rolePositionService';
import WorldviewPositionRuleService from '@/src/services/aiNoval/worldviewPositionRuleService';
import { ApiResponse } from '@/src/types/ApiResponse';
import type { IRolePositionValidationResult } from '@/src/types/IAiNoval';

type Data = ApiResponse<IRolePositionValidationResult>;

const service = new RolePositionService();
const ruleService = new WorldviewPositionRuleService();

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }
  const body = req.body || {};
  if (!body.worldview_id || !body.role_id || body.occurred_at == null) {
    res.status(400).json({ success: false, error: 'worldview_id, role_id, occurred_at are required' });
    return;
  }
  try {
    const rule = await ruleService.getRule(Number(body.worldview_id));
    const prevRecord = await service.getPrevRecord({
      worldview_id: Number(body.worldview_id),
      role_id: Number(body.role_id),
      occurred_at: Number(body.occurred_at),
      currentId: body.id != null ? Number(body.id) : undefined,
    });
    const result = service.buildValidation({ record: body, prevRecord, rule });
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to validate role position' });
  }
}

