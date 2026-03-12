'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { IRaceData } from '@/src/types/IAiNoval';
import apiCalls from '@/src/business/aiNoval/raceManage/apiCalls';

function getRacePath(list: IRaceData[], raceId: number | null | undefined): string {
  if (raceId == null) return '—';
  const race = list.find((r) => r.id === raceId);
  if (!race) return String(raceId);
  const path: string[] = [];
  let current: IRaceData | undefined = race;
  while (current) {
    path.unshift(current.name ?? '');
    if (current.parent_id == null) break;
    current = list.find((r) => r.id === current!.parent_id);
  }
  return path.filter(Boolean).join(' / ') || String(raceId);
}

export interface RacePathDisplayProps {
  worldviewId: number | null | undefined;
  raceId: number | null | undefined;
}

export default function RacePathDisplay({ worldviewId, raceId }: RacePathDisplayProps) {
  const { data: list = [] } = useSWR<IRaceData[]>(
    worldviewId ? ['race-list', worldviewId] : null,
    () => apiCalls.getRaceList(worldviewId!, 500)
  );
  const path = useMemo(() => getRacePath(list, raceId), [list, raceId]);
  return <span>{path}</span>;
}
