import { NextApiRequest, NextApiResponse } from 'next';
import { ApiListDataResponse } from '@/src/types/ApiResponse';
import _ from 'lodash';
import findRoleGroup from '@/src/domain/novel/findRoleGroup';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiListDataResponse>
) {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'only GET method is allowed' });
    return;
  }

  const { worldviewId, page, limit, group_status, role_name, group_name } = req.query;

  if (!worldviewId || worldviewId instanceof Array || !/^\d+$/.test(String(worldviewId))) {
    res.status(400).json({ success: false, error: 'worldviewId is required and must be a number' });
    return;
  }

  const pageNum = page != null ? _.toNumber(page) : 1;
  const limitNum = limit != null ? _.toNumber(limit) : 100;
  if (!Number.isInteger(pageNum) || pageNum < 1 || !Number.isInteger(limitNum) || limitNum < 1) {
    res.status(400).json({ success: false, error: 'page and limit must be positive integers' });
    return;
  }

  try {
    const result = await findRoleGroup(_.toNumber(worldviewId), {
      page: pageNum,
      limit: limitNum,
      group_status: group_status as string | undefined,
      role_name: (role_name as string | undefined) ?? undefined,
      group_name: (group_name as string | undefined) ?? undefined,
    });
    res.status(200).json({ success: true, data: { data: result.data }, count: result.count });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'server error' });
  }
}
