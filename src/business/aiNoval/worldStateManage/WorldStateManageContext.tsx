import React, { createContext, useContext, useState, useCallback } from 'react';
import { IWorldState, IWorldViewData } from '@/src/types/IAiNoval';
import { getWorldViews } from '../common/worldViewUtil';
import apiCalls from './apiCalls';

interface WorldStateManageContextType {
  // 世界观相关
  worldviewId: number | null;
  setWorldviewId: (id: number | null) => void;
  worldviewList: IWorldViewData[];
  loadWorldviewList: () => Promise<IWorldViewData[]>;
  
  // 世界态列表
  worldStateList: IWorldState[];
  loadWorldStateList: () => Promise<void>;
  
  // 当前选中的世界态
  currentWorldStateId: number | null;
  setCurrentWorldStateId: (id: number | null) => void;
  currentWorldState: IWorldState | null;
  
  // 视图模式
  viewMode: 'list' | 'timeline' | 'graph';
  setViewMode: (mode: 'list' | 'timeline' | 'graph') => void;
  
  // 筛选条件
  filters: {
    state_type?: string;
    status?: string;
    impact_level?: string;
    sort_by?: 'impact_level' | 'status' | 'id';
    sort_order?: 'asc' | 'desc';
  };
  setFilters: (filters: any) => void;
}

const WorldStateManageContext = createContext<WorldStateManageContextType | undefined>(undefined);

export function WorldStateManageContextProvider({ children }: { children: React.ReactNode }) {
  const [worldviewId, setWorldviewId] = useState<number | null>(null);
  const [worldviewList, setWorldviewList] = useState<IWorldViewData[]>([]);
  const [worldStateList, setWorldStateList] = useState<IWorldState[]>([]);
  const [currentWorldStateId, setCurrentWorldStateId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'graph'>('list');
  const [filters, setFilters] = useState<any>({
    sort_by: 'impact_level',
    sort_order: 'desc',
  });

  const loadWorldviewList = useCallback(async () => {
    const result = await getWorldViews();
    setWorldviewList(result.data);
    if (result.data.length > 0 && !worldviewId) {
      setWorldviewId(result.data[0].id || null);
    }
    return result.data;
  }, [worldviewId]);

  const loadWorldStateList = useCallback(async () => {
    if (!worldviewId) return;
    const result = await apiCalls.getWorldStateList({
      worldview_id: worldviewId,
      ...filters,
    });
    setWorldStateList(result.data);
  }, [worldviewId, filters]);

  const currentWorldState = worldStateList.find(w => w.id === currentWorldStateId) || null;

  return (
    <WorldStateManageContext.Provider
      value={{
        worldviewId,
        setWorldviewId,
        worldviewList,
        loadWorldviewList,
        worldStateList,
        loadWorldStateList,
        currentWorldStateId,
        setCurrentWorldStateId,
        currentWorldState,
        viewMode,
        setViewMode,
        filters,
        setFilters,
      }}
    >
      {children}
    </WorldStateManageContext.Provider>
  );
}

export function useWorldStateManageContext() {
  const context = useContext(WorldStateManageContext);
  if (!context) {
    throw new Error('useWorldStateManageContext must be used within WorldStateManageContextProvider');
  }
  return context;
}

// 便捷hooks
export const useWorldviewId = () => {
  const { worldviewId, setWorldviewId } = useWorldStateManageContext();
  return [worldviewId, setWorldviewId] as const;
};

export const useWorldviewList = () => {
  const { worldviewList, loadWorldviewList } = useWorldStateManageContext();
  return [worldviewList, loadWorldviewList] as const;
};

export const useWorldStateList = () => {
  const { worldStateList, loadWorldStateList } = useWorldStateManageContext();
  return [worldStateList, loadWorldStateList] as const;
};

export const useCurrentWorldState = () => {
  const { currentWorldStateId, setCurrentWorldStateId, currentWorldState } = useWorldStateManageContext();
  return { currentWorldStateId, setCurrentWorldStateId, currentWorldState };
};

export const useViewMode = () => {
  const { viewMode, setViewMode } = useWorldStateManageContext();
  return [viewMode, setViewMode] as const;
};

export const useFilters = () => {
  const { filters, setFilters } = useWorldStateManageContext();
  return [filters, setFilters] as const;
};
