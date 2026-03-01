import { NextRequest, NextResponse } from 'next/server';
import RaceDefService from '@/src/services/aiNoval/raceDefService';
import type { IRaceData } from '@/src/types/IAiNoval';

const service = new RaceDefService();

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/web/aiNoval/race?id=1
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { message: 'id is required' },
        { status: 400 }
      );
    }

    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) {
      return NextResponse.json(
        { message: 'id must be a positive integer' },
        { status: 400 }
      );
    }

    const data = await service.queryOne({ id: numId });
    if (!data) {
      return NextResponse.json(
        { message: 'not found, id: ' + id },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '服务器错误';
    return NextResponse.json({ message }, { status: 500 });
  }
}

/**
 * POST /api/web/aiNoval/race (create) or POST /api/web/aiNoval/race?id=1 (update)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const body = (await request.json()) as IRaceData;

    if (idParam === undefined || idParam === null || idParam === '') {
      // create: ensure order_num for same level
      if (body.worldview_id == null) {
        return NextResponse.json(
          { message: 'worldview_id is required' },
          { status: 400 }
        );
      }
      const parentId = body.parent_id ?? null;
      const { data: siblings } = await service.query(
        {
          worldview_id: body.worldview_id,
          parent_id: parentId,
        },
        [],
        ['order_num desc'],
        1,
        1,
        true
      );
      const maxOrder = siblings?.[0]?.order_num ?? 0;
      const payload = {
        ...body,
        order_num: body.order_num ?? (Number(maxOrder) + 1),
      };
      const insertId = await service.insertOne(payload);
      return NextResponse.json({ message: 'created', id: insertId });
    }

    const numId = Number(idParam);
    if (!Number.isInteger(numId) || numId < 1) {
      return NextResponse.json(
        { message: 'id must be a positive integer' },
        { status: 400 }
      );
    }

    await service.updateOne({ id: numId }, { ...body, id: numId });
    return NextResponse.json({ message: 'updated', id: numId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '服务器错误';
    return NextResponse.json({ message }, { status: 500 });
  }
}

/**
 * DELETE /api/web/aiNoval/race?id=1
 * 校验：存在子亚种或角色引用时拒绝
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { message: 'id is required' },
        { status: 400 }
      );
    }

    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) {
      return NextResponse.json(
        { message: 'id must be a positive integer' },
        { status: 400 }
      );
    }

    const hasChildren = await service.hasChildren(numId);
    if (hasChildren) {
      return NextResponse.json(
        { message: '存在子亚种，请先删除其下亚种', code: 'HAS_CHILDREN' },
        { status: 409 }
      );
    }

    const roleCount = await service.countRoleReferences(numId);
    if (roleCount > 0) {
      return NextResponse.json(
        {
          message: `有 ${roleCount} 个角色使用该族群，请先修改角色设定`,
          code: 'ROLE_REFERENCES',
          count: roleCount,
        },
        { status: 409 }
      );
    }

    await service.deleteOne({ id: numId });
    return NextResponse.json({ message: 'deleted', id: numId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '服务器错误';
    return NextResponse.json({ message }, { status: 500 });
  }
}
