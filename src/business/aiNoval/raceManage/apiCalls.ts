import { IRaceData } from '@/src/types/IAiNoval';
import fetch from '@/src/fetch';

const LIST_URL = '/api/web/aiNoval/race/list';
const RACE_URL = '/api/web/aiNoval/race';

function buildTree(items: IRaceData[], parentId: number | null = null): (IRaceData & { children?: ReturnType<typeof buildTree> })[] {
  return items
    .filter((item) => (item.parent_id ?? null) === parentId)
    .map((item) => ({
      ...item,
      children: buildTree(items, item.id ?? null),
    }));
}

export default {
  getRaceList: async (worldViewId: number, limit = 200) => {
    const response = await fetch.get<IRaceData[]>(LIST_URL, {
      params: { worldview_id: worldViewId, limit },
    });
    return Array.isArray(response) ? response : (response?.data ?? []);
  },

  getRaceTree: async (worldViewId: number) => {
    const list = await fetch.get<IRaceData[]>(LIST_URL, {
      params: { worldview_id: worldViewId, limit: 500 },
    });
    const data = Array.isArray(list) ? list : (list?.data ?? []);
    return buildTree(data);
  },

  addRace: async (race: IRaceData) => {
    return fetch.post(RACE_URL, race);
  },

  updateRace: async (race: IRaceData) => {
    return fetch.post(RACE_URL, race, {
      params: { id: race.id },
    });
  },

  deleteRace: async (id: number) => {
    return fetch.delete(RACE_URL, { params: { id } });
  },

  getRaceOne: async (id: number) => {
    return fetch.get<IRaceData>(RACE_URL, { params: { id } });
  },

  convertRaceListToTree: (items: IRaceData[]) => {
    if (!items?.length) return [];
    return buildTree(items);
  },
};
