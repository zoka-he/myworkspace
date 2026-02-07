import type { NextApiRequest, NextApiResponse } from 'next';
import WorldStateService from '@/src/services/aiNoval/worldStateService';
import { ApiResponse } from '@/src/types/ApiResponse';
import { IWorldState } from '@/src/types/IAiNoval';

const jsonFields = [
  'related_faction_ids',
  'related_role_ids',
  'related_geo_codes',
  'related_event_ids',
  'related_chapter_ids',
  'related_world_state_ids',
  'affected_areas',
  'tags',
];

function parseJsonFields(row: any): IWorldState {
  const item = { ...row };
  jsonFields.forEach((key) => {
    if (item[key] != null && typeof item[key] === 'string') {
      try {
        item[key] = JSON.parse(item[key]);
      } catch {
        item[key] = null;
      }
    }
  });
  return item as IWorldState;
}

type Data = ApiResponse<{ data: IWorldState[]; count: number }>;

const service = new WorldStateService();

async function getList(req: NextApiRequest, res: NextApiResponse<Data>) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);

  try {
    const params: any = { page, limit };
    if (req.query.worldview_id != null) {
      params.worldview_id = Number(req.query.worldview_id);
    }
    if (req.query.state_type != null && req.query.state_type !== '') {
      params.state_type = String(req.query.state_type);
    }
    if (req.query.status != null && req.query.status !== '') {
      params.status = String(req.query.status);
    }
    if (req.query.impact_level != null && req.query.impact_level !== '') {
      params.impact_level = String(req.query.impact_level);
    }

    if (params.worldview_id == null) {
      res.status(400).json({
        success: false,
        error: 'worldview_id is required',
      });
      return;
    }

    const result = await service.getList(params);
    const data = (result.data || []).map(parseJsonFields);

    res.status(200).json({
      success: true,
      data: {
        data,
        count: result.count || 0,
      },
    });
  } catch (error: any) {
    console.error('[WorldState API] List error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get world state list',
    });
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'GET') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed, only GET is allowed',
    });
    return;
  }
  getList(req, res);
}
