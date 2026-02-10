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

function stringifyJsonFields(body: any): any {
  const out = { ...body };
  jsonFields.forEach((key) => {
    if (out[key] != null && Array.isArray(out[key])) {
      out[key] = JSON.stringify(out[key]);
    }
  });
  return out;
}

type Data = ApiResponse<IWorldState | { message: string }>;

const service = new WorldStateService();

async function getOne(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { id } = req.query;
  if (id == null || id === '') {
    res.status(400).json({ success: false, error: 'id is required' });
    return;
  }

  try {
    const row = await service.queryOne({ id: Number(id) });
    if (!row) {
      res.status(404).json({ success: false, error: `World state not found, id: ${id}` });
      return;
    }
    res.status(200).json({ success: true, data: parseJsonFields(row) });
  } catch (error: any) {
    console.error('[WorldState API] Get error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get world state' });
  }
}

async function createOrUpdateOne(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { id } = req.query;
  const body = stringifyJsonFields(req.body || {});

  try {
    if (id == null || id === '') {
      const insertId = await service.insertOne(body);
      const created = await service.queryOne({ id: insertId });
      if (!created) {
        res.status(500).json({ success: false, error: 'Failed to retrieve created world state' });
        return;
      }
      res.status(200).json({ success: true, data: parseJsonFields(created) });
    } else {
      await service.updateOne({ id: Number(id) }, body);
      const updated = await service.queryOne({ id: Number(id) });
      if (!updated) {
        res.status(404).json({ success: false, error: `World state not found, id: ${id}` });
        return;
      }
      res.status(200).json({ success: true, data: parseJsonFields(updated) });
    }
  } catch (error: any) {
    console.error('[WorldState API] Create/Update error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create/update world state',
    });
  }
}

async function deleteOne(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { id } = req.query;
  if (id == null || id === '') {
    res.status(400).json({ success: false, error: 'id is required' });
    return;
  }

  try {
    await service.deleteOne({ id: Number(id) });
    res.status(200).json({ success: true, data: { message: `deleted, id: ${id}` } as any });
  } catch (error: any) {
    console.error('[WorldState API] Delete error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete world state' });
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  let fn: ((req: NextApiRequest, res: NextApiResponse<Data>) => Promise<void>) | undefined;
  switch (req.method) {
    case 'GET':
      fn = getOne;
      break;
    case 'POST':
      fn = createOrUpdateOne;
      break;
    case 'DELETE':
      fn = deleteOne;
      break;
  }
  if (!fn) {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }
  fn(req, res);
}
