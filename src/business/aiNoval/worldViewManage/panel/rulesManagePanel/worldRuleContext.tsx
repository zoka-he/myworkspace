import { createContext, useContext, useCallback, useMemo, useState, ReactNode } from 'react';
import { IWorldBookGroup, IWorldBookItem } from './types';
import { 
    getWorldRuleGroupList, 
    createOrUpdateWorldRuleGroup, 
    deleteWorldRuleGroup,
    getWorldRuleItemList,
    createOrUpdateWorldRuleItem,
    deleteWorldRuleItem
} from '@/src/api/aiNovel';
import { message } from 'antd';

interface WorldRuleContextState {
    groups: IWorldBookGroup[];
    items: IWorldBookItem[];
    selectedGroupId: number | null;
    selectedItemId: number | null;
    expandedKeys: React.Key[];
    searchValue: string;
}

interface WorldRuleContextValue extends WorldRuleState {
    // 数据加载
    loadData: (worldviewId: number) => Promise<void>;
    loading: boolean;
    
    // 选择操作
    setSelectedGroupId: (id: number | null) => void;
    setSelectedItemId: (id: number | null) => void;
    clearSelection: () => void;
    
    // 展开/折叠
    setExpandedKeys: (keys: React.Key[]) => void;
    expandAll: () => void;
    collapseAll: () => void;
    
    // 搜索
    setSearchValue: (value: string) => void;
    
    // 分组操作（异步，调用 API）
    addGroup: (group: Omit<IWorldBookGroup, 'id'>) => Promise<void>;
    updateGroup: (id: number, updates: Partial<IWorldBookGroup>) => Promise<void>;
    deleteGroup: (id: number) => Promise<void>;
    moveGroup: (id: number, direction: 'up' | 'down') => Promise<void>;
    
    // 条目操作（异步，调用 API）
    addItem: (item: Omit<IWorldBookItem, 'id'>) => Promise<void>;
    updateItem: (id: number, updates: Partial<IWorldBookItem>) => Promise<void>;
    deleteItem: (id: number) => Promise<void>;
    moveItem: (id: number, direction: 'up' | 'down') => Promise<void>;
    
    // 查询方法
    getGroupById: (id: number) => IWorldBookGroup | null;
    getItemById: (id: number) => IWorldBookItem | null;
    getItemsByGroupId: (groupId: number) => IWorldBookItem[];
    
    // 计算属性
    selectedGroup: IWorldBookGroup | null;
    selectedItem: IWorldBookItem | null;
    sortedGroups: IWorldBookGroup[];
}

interface WorldRuleState {
    groups: IWorldBookGroup[];
    items: IWorldBookItem[];
    selectedGroupId: number | null;
    selectedItemId: number | null;
    expandedKeys: React.Key[];
    searchValue: string;
    loading: boolean;
}

const WorldRuleContext = createContext<WorldRuleContextValue | null>(null);

export function WorldRuleContextProvider({ 
    children,
    initialGroups = [],
    initialItems = []
}: { 
    children: ReactNode;
    initialGroups?: IWorldBookGroup[];
    initialItems?: IWorldBookItem[];
}) {
    const [state, setState] = useState<WorldRuleState>({
        groups: initialGroups,
        items: initialItems,
        selectedGroupId: null,
        selectedItemId: null,
        expandedKeys: [],
        searchValue: '',
        loading: false
    });

    // 加载数据
    const loadData = useCallback(async (worldviewId: number) => {
        setState(prev => ({ ...prev, loading: true }));
        try {
            const [groupsResult, itemsResult] = await Promise.all([
                getWorldRuleGroupList(worldviewId, 1, 200),
                getWorldRuleItemList(worldviewId, 1, 1500)
            ]);
            
            setState(prev => ({
                ...prev,
                groups: groupsResult.data || [],
                items: itemsResult.data || [],
                loading: false
            }));
        } catch (error: any) {
            console.error('加载数据失败:', error);
            message.error('加载数据失败: ' + (error.message || '未知错误'));
            setState(prev => ({ ...prev, loading: false }));
        }
    }, []);

    // 选择操作
    const setSelectedGroupId = useCallback((id: number | null) => {
        setState(prev => ({
            ...prev,
            selectedGroupId: id,
            selectedItemId: null // 选择分组时清除条目选择
        }));
    }, []);

    const setSelectedItemId = useCallback((id: number | null) => {
        setState(prev => ({
            ...prev,
            selectedItemId: id,
            selectedGroupId: id ? prev.items.find(item => item.id === id)?.group_id ?? null : prev.selectedGroupId
        }));
    }, []);

    const clearSelection = useCallback(() => {
        setState(prev => ({
            ...prev,
            selectedGroupId: null,
            selectedItemId: null
        }));
    }, []);

    // 展开/折叠
    const setExpandedKeys = useCallback((keys: React.Key[]) => {
        setState(prev => ({ ...prev, expandedKeys: keys }));
    }, []);

    const expandAll = useCallback(() => {
        setState(prev => ({
            ...prev,
            expandedKeys: prev.groups.map(g => `group-${g.id}`)
        }));
    }, []);

    const collapseAll = useCallback(() => {
        setState(prev => ({ ...prev, expandedKeys: [] }));
    }, []);

    // 搜索
    const setSearchValue = useCallback((value: string) => {
        setState(prev => ({ ...prev, searchValue: value }));
    }, []);

    // 分组操作（异步，调用 API）
    const addGroup = useCallback(async (group: Omit<IWorldBookGroup, 'id'>) => {
        try {
            const maxOrder = state.groups.length > 0 
                ? Math.max(...state.groups.map(g => g.order || 0))
                : 0;
            const groupData: IWorldBookGroup = {
                ...group,
                order: group.order || maxOrder + 1
            };
            const result = await createOrUpdateWorldRuleGroup(groupData);
            
            // 如果返回了 ID，更新本地状态
            if (result?.id) {
                setState(prev => ({
                    ...prev,
                    groups: [...prev.groups, { ...groupData, id: result.id }]
                }));
            } else {
                // 重新加载数据
                if (group.worldview_id) {
                    await loadData(group.worldview_id);
                }
            }
        } catch (error: any) {
            console.error('添加分组失败:', error);
            message.error('添加分组失败: ' + (error.message || '未知错误'));
            throw error;
        }
    }, [state.groups, loadData]);

    const updateGroup = useCallback(async (id: number, updates: Partial<IWorldBookGroup>) => {
        try {
            const group = state.groups.find(g => g.id === id);
            if (!group) {
                throw new Error('分组不存在');
            }
            
            const updatedGroup: IWorldBookGroup = {
                ...group,
                ...updates,
                id: id
            };
            await createOrUpdateWorldRuleGroup(updatedGroup);
            
            // 更新本地状态
            setState(prev => ({
                ...prev,
                groups: prev.groups.map(g => g.id === id ? updatedGroup : g)
            }));
        } catch (error: any) {
            console.error('更新分组失败:', error);
            message.error('更新分组失败: ' + (error.message || '未知错误'));
            throw error;
        }
    }, [state.groups]);

    const deleteGroup = useCallback(async (id: number) => {
        try {
            await deleteWorldRuleGroup(id);
            
            // 更新本地状态
            setState(prev => {
                const newGroups = prev.groups.filter(g => g.id !== id);
                // 重新排序
                newGroups.forEach((group, index) => {
                    group.order = (index + 1);
                });
                // 删除该分组下的所有条目
                const newItems = prev.items.filter(item => item.group_id !== id);
                return {
                    ...prev,
                    groups: newGroups,
                    items: newItems,
                    selectedGroupId: prev.selectedGroupId === id ? null : prev.selectedGroupId,
                    selectedItemId: prev.items.some(item => item.group_id === id && item.id === prev.selectedItemId) 
                        ? null 
                        : prev.selectedItemId
                };
            });
        } catch (error: any) {
            console.error('删除分组失败:', error);
            message.error('删除分组失败: ' + (error.message || '未知错误'));
            throw error;
        }
    }, []);

    const moveGroup = useCallback(async (id: number, direction: 'up' | 'down') => {
        try {
            setState(prev => {
                const newGroups = [...prev.groups];
                const index = newGroups.findIndex(g => g.id === id);
                if (index === -1) return prev;

                const targetIndex = direction === 'up' ? index - 1 : index + 1;
                if (targetIndex < 0 || targetIndex >= newGroups.length) return prev;

                // 交换order
                const tempOrder = newGroups[index].order;
                newGroups[index].order = newGroups[targetIndex].order;
                newGroups[targetIndex].order = tempOrder;

                // 交换位置
                [newGroups[index], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[index]];

                // 异步更新到服务器
                Promise.all([
                    createOrUpdateWorldRuleGroup(newGroups[index]),
                    createOrUpdateWorldRuleGroup(newGroups[targetIndex])
                ]).catch(error => {
                    console.error('更新排序失败:', error);
                    message.error('更新排序失败');
                });

                return { ...prev, groups: newGroups };
            });
        } catch (error: any) {
            console.error('移动分组失败:', error);
            message.error('移动分组失败: ' + (error.message || '未知错误'));
            throw error;
        }
    }, []);

    // 条目操作（异步，调用 API）
    const addItem = useCallback(async (item: Omit<IWorldBookItem, 'id'>) => {
        try {
            const itemData: IWorldBookItem = {
                ...item
            };
            const result = await createOrUpdateWorldRuleItem(itemData);
            
            // 如果返回了 ID，更新本地状态
            if (result?.id) {
                setState(prev => ({
                    ...prev,
                    items: [...prev.items, { ...itemData, id: result.id }]
                }));
            } else {
                // 重新加载数据
                if (item.worldview_id) {
                    await loadData(item.worldview_id);
                }
            }
        } catch (error: any) {
            console.error('添加条目失败:', error);
            message.error('添加条目失败: ' + (error.message || '未知错误'));
            throw error;
        }
    }, [loadData]);

    const updateItem = useCallback(async (id: number, updates: Partial<IWorldBookItem>) => {
        try {
            const item = state.items.find(i => i.id === id);
            if (!item) {
                throw new Error('条目不存在');
            }
            
            const updatedItem: IWorldBookItem = {
                ...item,
                ...updates,
                id: id
            };
            await createOrUpdateWorldRuleItem(updatedItem);
            
            // 更新本地状态
            setState(prev => ({
                ...prev,
                items: prev.items.map(i => i.id === id ? updatedItem : i)
            }));
        } catch (error: any) {
            console.error('更新条目失败:', error);
            message.error('更新条目失败: ' + (error.message || '未知错误'));
            throw error;
        }
    }, [state.items]);

    const deleteItem = useCallback(async (id: number) => {
        try {
            await deleteWorldRuleItem(id);
            
            // 更新本地状态
            setState(prev => {
                const item = prev.items.find(i => i.id === id);
                if (!item) return prev;

                const newItems = prev.items.filter(i => i.id !== id);
                // 重新排序同组内的条目
                const groupItems = newItems.filter(i => i.group_id === item.group_id);
                groupItems.forEach((item, index) => {
                    item.order = (index + 1);
                });

                return {
                    ...prev,
                    items: newItems,
                    selectedItemId: prev.selectedItemId === id ? null : prev.selectedItemId
                };
            });
        } catch (error: any) {
            console.error('删除条目失败:', error);
            message.error('删除条目失败: ' + (error.message || '未知错误'));
            throw error;
        }
    }, []);

    const moveItem = useCallback(async (id: number, direction: 'up' | 'down') => {
        try {
            setState(prev => {
                const item = prev.items.find(i => i.id === id);
                if (!item) return prev;

                const groupItems = prev.items.filter(i => i.group_id === item.group_id).sort((a, b) => (a.order || 0) - (b.order || 0));
                const itemIndex = groupItems.findIndex(i => i.id === id);
                if (itemIndex === -1) return prev;

                const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
                if (targetIndex < 0 || targetIndex >= groupItems.length) return prev;

                // 交换order
                const tempOrder = groupItems[itemIndex].order;
                groupItems[itemIndex].order = groupItems[targetIndex].order;
                groupItems[targetIndex].order = tempOrder;

                // 更新items数组
                const newItems = prev.items.map(i => {
                    if (i.id === groupItems[itemIndex].id) {
                        return { ...i, order: groupItems[itemIndex].order };
                    }
                    if (i.id === groupItems[targetIndex].id) {
                        return { ...i, order: groupItems[targetIndex].order };
                    }
                    return i;
                });

                // 异步更新到服务器
                Promise.all([
                    createOrUpdateWorldRuleItem({ ...groupItems[itemIndex], id: groupItems[itemIndex].id! }),
                    createOrUpdateWorldRuleItem({ ...groupItems[targetIndex], id: groupItems[targetIndex].id! })
                ]).catch(error => {
                    console.error('更新排序失败:', error);
                    message.error('更新排序失败');
                });

                return { ...prev, items: newItems };
            });
        } catch (error: any) {
            console.error('移动条目失败:', error);
            message.error('移动条目失败: ' + (error.message || '未知错误'));
            throw error;
        }
    }, []);

    // 查询方法
    const getGroupById = useCallback((id: number): IWorldBookGroup | null => {
        return state.groups.find(g => g.id === id) || null;
    }, [state.groups]);

    const getItemById = useCallback((id: number): IWorldBookItem | null => {
        return state.items.find(i => i.id === id) || null;
    }, [state.items]);

    const getItemsByGroupId = useCallback((groupId: number): IWorldBookItem[] => {
        return state.items.filter(i => i.group_id === groupId).sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [state.items]);

    // 计算属性
    const selectedGroup = useMemo(() => {
        return state.selectedGroupId ? getGroupById(state.selectedGroupId) : null;
    }, [state.selectedGroupId, getGroupById]);

    const selectedItem = useMemo(() => {
        return state.selectedItemId ? getItemById(state.selectedItemId) : null;
    }, [state.selectedItemId, getItemById]);

    const sortedGroups = useMemo(() => {
        return [...state.groups].sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [state.groups]);

    const value: WorldRuleContextValue = {
        ...state,
        loadData,
        setSelectedGroupId,
        setSelectedItemId,
        clearSelection,
        setExpandedKeys,
        expandAll,
        collapseAll,
        setSearchValue,
        addGroup,
        updateGroup,
        deleteGroup,
        moveGroup,
        addItem,
        updateItem,
        deleteItem,
        moveItem,
        getGroupById,
        getItemById,
        getItemsByGroupId,
        selectedGroup,
        selectedItem,
        sortedGroups
    };

    return (
        <WorldRuleContext.Provider value={value}>
            {children}
        </WorldRuleContext.Provider>
    );
}

export function useWorldRule() {
    const context = useContext(WorldRuleContext);
    if (!context) {
        throw new Error('useWorldRule must be used within WorldRuleContextProvider');
    }
    return context;
}
