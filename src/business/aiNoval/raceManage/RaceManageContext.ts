import { IRaceData, IWorldViewData } from '@/src/types/IAiNoval';
import { createContext, createElement, Dispatch, useContext, useReducer } from 'react';
import apiCalls from './apiCalls';
import { getWorldViews } from '@/src/api/aiNovel';
import { RaceEditRef } from './edit/raceEdit';

interface RaceManageContextData {
  worldViewId: number | null;
  worldViewList: IWorldViewData[];
  raceList: IRaceData[];
  raceTree: (IRaceData & { children?: unknown[] })[];
  currentRaceId: number | null;
  editModalRef: React.RefObject<RaceEditRef> | null;
}

const defaultData = (): RaceManageContextData => ({
  worldViewId: null,
  worldViewList: [],
  raceList: [],
  raceTree: [],
  currentRaceId: null,
  editModalRef: null,
});

type Action =
  | { type: 'SET_WORLD_VIEW_ID'; payload: number | null }
  | { type: 'SET_WORLD_VIEW_LIST'; payload: IWorldViewData[] }
  | { type: 'SET_RACE_LIST'; payload: IRaceData[] }
  | { type: 'SET_RACE_TREE'; payload: (IRaceData & { children?: unknown[] })[] }
  | { type: 'SET_CURRENT_RACE_ID'; payload: number | null }
  | { type: 'SET_EDIT_MODAL_REF'; payload: React.RefObject<RaceEditRef> | null };

function reducer(state: RaceManageContextData, action: Action): RaceManageContextData {
  switch (action.type) {
    case 'SET_WORLD_VIEW_ID':
      return { ...state, worldViewId: action.payload };
    case 'SET_WORLD_VIEW_LIST':
      return { ...state, worldViewList: action.payload };
    case 'SET_RACE_LIST':
      return { ...state, raceList: action.payload };
    case 'SET_RACE_TREE':
      return { ...state, raceTree: action.payload };
    case 'SET_CURRENT_RACE_ID':
      return { ...state, currentRaceId: action.payload };
    case 'SET_EDIT_MODAL_REF':
      return { ...state, editModalRef: action.payload };
    default:
      return state;
  }
}

const RaceManageContext = createContext<RaceManageContextData>(defaultData());
const RaceManageDispatchContext = createContext<Dispatch<Action>>(() => {});

export function RaceManageContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultData());
  return createElement(
    RaceManageContext.Provider,
    { value: state },
    createElement(RaceManageDispatchContext.Provider, { value: dispatch }, children)
  );
}

export function useLoadWorldViewList() {
  const dispatch = useContext(RaceManageDispatchContext);
  return async () => {
    const res = await getWorldViews();
    const data = (res as { data?: IWorldViewData[] })?.data ?? [];
    dispatch({ type: 'SET_WORLD_VIEW_LIST', payload: data });
    return data;
  };
}

export function useLoadRaceList() {
  const { worldViewId } = useContext(RaceManageContext);
  const dispatch = useContext(RaceManageDispatchContext);
  return async () => {
    if (!worldViewId) return { list: [], tree: [] };
    const list = await apiCalls.getRaceList(worldViewId, 500);
    const tree = apiCalls.convertRaceListToTree(list);
    dispatch({ type: 'SET_RACE_LIST', payload: list });
    dispatch({ type: 'SET_RACE_TREE', payload: tree });
    return { list, tree };
  };
}

export function useWorldViewId() {
  const { worldViewId } = useContext(RaceManageContext);
  const dispatch = useContext(RaceManageDispatchContext);
  return [worldViewId, (id: number | null) => dispatch({ type: 'SET_WORLD_VIEW_ID', payload: id })] as const;
}

export function useWorldViewList() {
  const { worldViewList } = useContext(RaceManageContext);
  return [worldViewList] as const;
}

export function useRaceList() {
  const { raceList } = useContext(RaceManageContext);
  return [raceList] as const;
}

export function useRaceTree() {
  const { raceTree } = useContext(RaceManageContext);
  return [raceTree] as const;
}

export function useCurrentRaceId() {
  const { currentRaceId } = useContext(RaceManageContext);
  const dispatch = useContext(RaceManageDispatchContext);
  return [currentRaceId, (id: number | null) => dispatch({ type: 'SET_CURRENT_RACE_ID', payload: id })] as const;
}

export function useCurrentRace() {
  const { currentRaceId, raceList } = useContext(RaceManageContext);
  return raceList.find((r) => r.id === currentRaceId) ?? null;
}

export function useSetEditModalRef() {
  const dispatch = useContext(RaceManageDispatchContext);
  return (ref: React.RefObject<RaceEditRef> | null) => dispatch({ type: 'SET_EDIT_MODAL_REF', payload: ref });
}

export function useGetEditModal() {
  const { editModalRef } = useContext(RaceManageContext);
  return () => editModalRef?.current ?? null;
}
