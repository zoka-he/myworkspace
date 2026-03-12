import { NextRequest, NextResponse } from 'next/server';
import RaceDefService from '@/src/services/aiNoval/raceDefService';

const service = new RaceDefService();

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/web/aiNoval/race/list?worldview_id=1&limit=200
 * 按 worldview_id 查询，按 order_num 升序
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worldviewId = searchParams.get('worldview_id');
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 200, 1), 500);

    if (!worldviewId) {
      return NextResponse.json(
        { message: 'worldview_id is required' },
        { status: 400 }
      );
    }

    const wid = Number(worldviewId);
    if (!Number.isInteger(wid) || wid < 1) {
      return NextResponse.json(
        { message: 'worldview_id must be a positive integer' },
        { status: 400 }
      );
    }

    const { data } = await service.query(
      { worldview_id: wid },
      [],
      ['order_num asc', 'id asc'],
      1,
      limit,
      true
    );

    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '服务器错误';
    return NextResponse.json({ message }, { status: 500 });
  }
}
