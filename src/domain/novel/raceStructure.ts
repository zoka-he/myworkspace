import RaceDefService from '@/src/services/aiNoval/raceDefService';
import { IRaceData } from '@/src/types/IAiNoval';

const raceDefService = new RaceDefService();

export interface IRaceTreeNode extends IRaceData {
  children: IRaceTreeNode[];
}

function buildTree(items: IRaceData[], parentId: number | null): IRaceTreeNode[] {
  return items
    .filter((item) => (item.parent_id ?? null) === parentId)
    .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
    .map((item) => ({
      ...item,
      children: buildTree(items, item.id ?? null),
    }));
}

/**
 * 返回指定世界观下的族群树结构（平铺转树，按 order_num 排序）
 */
export default async function getRaceStructure(worldviewId: number): Promise<IRaceTreeNode[]> {
  const wid = Number(worldviewId);
  if (!Number.isInteger(wid) || wid < 1) {
    return [];
  }
  const { data } = await raceDefService.query(
    { worldview_id: wid },
    [],
    ['order_num asc', 'id asc'],
    1,
    500,
    true
  );
  const list = data ?? [];
  return buildTree(list, null);
}
