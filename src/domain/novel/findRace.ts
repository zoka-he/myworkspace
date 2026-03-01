import _ from 'lodash';
import RaceDefService from '@/src/services/aiNoval/raceDefService';
import { chromaService } from '@/src/server/chroma';
import embedService from '@/src/services/aiNoval/embedService';
import { distanceToSimilarity } from '@/src/utils/rag/scores';
import { IRaceData } from '@/src/types/IAiNoval';

const raceDefService = new RaceDefService();

export type FindRaceResult = IRaceData & { score?: number };

/**
 * 按世界观 ID + 关键词（向量召回）查询族群，返回匹配列表及相似度
 */
export default async function findRace(
  worldviewId: number,
  keywords: string[],
  threshold: number = 0.5
): Promise<FindRaceResult[]> {
  const wid = _.toNumber(worldviewId);
  if (!Number.isFinite(wid) || wid < 1) {
    return [];
  }
  if (!keywords?.length || !keywords.every((k) => _.isString(k) && k.trim())) {
    return [];
  }

  const collectionName = `ai_noval_races_${wid}`;
  let chromaResults: { id: string; content: string; metadata: Record<string, unknown> | null; distance: number }[] = [];

  try {
    const queryEmbedding = await embedService.embedQuery(keywords.join(' ').trim());
    chromaResults = await chromaService.similaritySearch(collectionName, queryEmbedding, 10);
  } catch (e) {
    // collection 可能不存在或未嵌入
    return [];
  }

  if (!chromaResults?.length) {
    return [];
  }

  const ids = chromaResults.map((r) => _.toNumber(r.id)).filter((id) => Number.isFinite(id) && id > 0);
  if (!ids.length) {
    return [];
  }

  const { data: raceList } = await raceDefService.query(
    { id: { $in: ids } },
    [],
    ['order_num asc', 'id asc'],
    1,
    ids.length,
    true
  );
  if (!raceList?.length) {
    return [];
  }

  const byId = new Map<number, IRaceData>();
  raceList.forEach((r: IRaceData) => {
    if (r.id != null) byId.set(r.id, r);
  });

  const results: FindRaceResult[] = chromaResults
    .map((r) => {
      const id = _.toNumber(r.id);
      const race = byId.get(id);
      if (!race) return null;
      const score = distanceToSimilarity(r.distance ?? 0);
      return { ...race, score };
    })
    .filter((r): r is FindRaceResult => r != null && (r.score ?? 0) >= threshold)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return results;
}
