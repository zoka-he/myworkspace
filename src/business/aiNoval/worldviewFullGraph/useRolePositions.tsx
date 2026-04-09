import useSWR from "swr";
import fetch from "@/src/fetch";
import { useMemo } from "react";
import type { IRolePositionRecord } from "@/src/types/IAiNoval";

/** 按世界观拉取角色位置列表 */
export function useRolePositions(worldviewId: number | null | undefined, limit: number = 2000) {
  const params = useMemo(
    () => ({
      worldviewId,
      limit,
    }),
    [worldviewId, limit]
  );

  return useSWR(params, async () => {
    if (!worldviewId) return [];
    const response = await fetch.get("/api/aiNoval/role/position/list", {
      params: {
        worldview_id: worldviewId,
        page: 1,
        limit: limit || 2000,
      },
    });
    return (response as any)?.data?.data as IRolePositionRecord[] || [];
  });
}

