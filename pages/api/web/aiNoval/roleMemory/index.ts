import type { NextApiRequest, NextApiResponse } from 'next';
import RoleMemoryService from '@/src/services/aiNoval/roleMemoryService';
import { ApiResponse } from '@/src/types/ApiResponse';
import type { IRoleMemory } from '@/src/types/IAiNoval';

const jsonFields = ['affects_slots'];

function parseRow(row: any): IRoleMemory {
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
  return item as IRoleMemory;
}

function stringifyBody(body: any): any {
  const out = { ...body };
  if (Array.isArray(out.affects_slots)) {
    out.affects_slots = JSON.stringify(out.affects_slots);
  }
  return out;
}

type Data = ApiResponse<IRoleMemory | { message: string }>;

const service = new RoleMemoryService();

async function getOne(req: NextApiRequest, res: NextApiResponse<Data>) {
  const id = req.query.id;
  if (id == null || id === '') {
    res.status(400).json({ success: false, error: 'id is required' });
    return;
  }
  try {
    const row = await service.queryOne({ id: Number(id) });
    if (!row) {
      res.status(404).json({ success: false, error: `Role memory not found, id: ${id}` });
      return;
    }
    res.status(200).json({ success: true, data: parseRow(row) });
  } catch (error: any) {
    console.error('[RoleMemory API] Get error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to get role memory' });
  }
}

async function createOrUpdate(req: NextApiRequest, res: NextApiResponse<Data>) {
  const id = req.query.id;
  const body = stringifyBody(req.body || {});

  try {
    if (id == null || id === '') {
      const insertId = await service.insertOne(body);
      const created = await service.queryOne({ id: insertId });
      if (!created) {
        res.status(500).json({ success: false, error: 'Failed to retrieve created role memory' });
        return;
      }
      res.status(200).json({ success: true, data: parseRow(created) });
    } else {
      await service.updateOne({ id: Number(id) }, body);
      const updated = await service.queryOne({ id: Number(id) });
      if (!updated) {
        res.status(404).json({ success: false, error: `Role memory not found, id: ${id}` });
        return;
      }
      res.status(200).json({ success: true, data: parseRow(updated) });
    }
  } catch (error: any) {
    console.error('[RoleMemory API] Create/Update error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to create/update role memory',
    });
  }
}

async function deleteOne(req: NextApiRequest, res: NextApiResponse<Data>) {
  const id = req.query.id;
  if (id == null || id === '') {
    res.status(400).json({ success: false, error: 'id is required' });
    return;
  }
  try {
    await service.deleteOne({ id: Number(id) });
    res.status(200).json({ success: true, data: { message: `deleted, id: ${id}` } as any });
  } catch (error: any) {
    console.error('[RoleMemory API] Delete error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to delete role memory' });
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  let fn: ((req: NextApiRequest, res: NextApiResponse<Data>) => Promise<void>) | undefined;
  switch (req.method) {
    case 'GET':
      fn = getOne;
      break;
    case 'POST':
      fn = createOrUpdate;
      break;
    case 'DELETE':
      fn = deleteOne;
      break;
    default:
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
  }
  fn(req, res);
}
