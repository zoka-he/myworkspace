import React, { createContext, useContext, useState, useCallback } from 'react';
import { IBrainstorm, IWorldViewData } from '@/src/types/IAiNoval';
import { getWorldViews } from '../common/worldViewUtil';
import apiCalls from './apiCalls';

interface BrainstormManageContextType {
  // 世界观相关
  worldviewId: number | null;
  setWorldviewId: (id: number | null) => void;
  worldviewList: IWorldViewData[];
  loadWorldviewList: () => Promise<IWorldViewData[]>;
  
  // 脑洞列表
  brainstormList: IBrainstorm[];
  loadBrainstormList: () => Promise<void>;
  
  // 当前选中的脑洞
  currentBrainstormId: number | null;
  setCurrentBrainstormId: (id: number | null) => void;
  currentBrainstorm: IBrainstorm | null;
  
  // 筛选条件
  filters: {
    brainstorm_type?: string;
    status?: string | string[];  // 支持单选或多选
    priority?: string;
    category?: string;
    search?: string;
  };
  setFilters: (filters: any) => void;
}

const BrainstormManageContext = createContext<BrainstormManageContextType | undefined>(undefined);

export function BrainstormManageContextProvider({ children }: { children: React.ReactNode }) {
  const [worldviewId, setWorldviewId] = useState<number | null>(null);
  const [worldviewList, setWorldviewList] = useState<IWorldViewData[]>([]);
  const [brainstormList, setBrainstormList] = useState<IBrainstorm[]>([]);
  const [currentBrainstormId, setCurrentBrainstormId] = useState<number | null>(null);
  const [filters, setFilters] = useState<any>({});

  const loadWorldviewList = useCallback(async () => {
    const result = await getWorldViews();
    setWorldviewList(result.data);
    if (result.data.length > 0 && !worldviewId) {
      setWorldviewId(result.data[0].id || null);
    }
    return result.data;
  }, [worldviewId]);

  const loadBrainstormList = useCallback(async () => {
    if (!worldviewId) return;
    const result = await apiCalls.getBrainstormList({
      worldview_id: worldviewId,
      ...filters,
    });
    setBrainstormList(result.data);
  }, [worldviewId, filters]);

  const currentBrainstorm = brainstormList.find(b => b.id === currentBrainstormId) || null;

  return (
    <BrainstormManageContext.Provider
      value={{
        worldviewId,
        setWorldviewId,
        worldviewList,
        loadWorldviewList,
        brainstormList,
        loadBrainstormList,
        currentBrainstormId,
        setCurrentBrainstormId,
        currentBrainstorm,
        filters,
        setFilters,
      }}
    >
      {children}
    </BrainstormManageContext.Provider>
  );
}

export function useBrainstormManageContext() {
  const context = useContext(BrainstormManageContext);
  if (!context) {
    throw new Error('useBrainstormManageContext must be used within BrainstormManageContextProvider');
  }
  return context;
}

// 便捷hooks
export const useWorldviewId = () => {
  const { worldviewId, setWorldviewId } = useBrainstormManageContext();
  return [worldviewId, setWorldviewId] as const;
};

export const useWorldviewList = () => {
  const { worldviewList, loadWorldviewList } = useBrainstormManageContext();
  return [worldviewList, loadWorldviewList] as const;
};

export const useBrainstormList = () => {
  const { brainstormList, loadBrainstormList } = useBrainstormManageContext();
  return [brainstormList, loadBrainstormList] as const;
};

export const useCurrentBrainstorm = () => {
  const { currentBrainstormId, setCurrentBrainstormId, currentBrainstorm } = useBrainstormManageContext();
  return { currentBrainstormId, setCurrentBrainstormId, currentBrainstorm };
};

export const useFilters = () => {
  const { filters, setFilters } = useBrainstormManageContext();
  return [filters, setFilters] as const;
};
