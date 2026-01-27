import { createContext, useContext, useCallback, useMemo, useState, ReactNode } from 'react';
import { IWorldBookGroup, IWorldBookItem } from '../rulesManagePanel/types';
import { 
    getWorldRuleGroupList,
    getWorldRuleItemList
} from '@/src/api/aiNovel';
import { message } from 'antd';
import { ISnapshotData, ISnapshotConfig } from './types';

interface SnapshotContextState {
    groups: IWorldBookGroup[];
    items: IWorldBookItem[];
    expandedKeys: React.Key[];
    searchValue: string;
    loading: boolean;
    // 快照编辑相关状态
    checkedKeys: React.Key[];
    snapshotContent: string;
    snapshotTitle: string;
    includeItemTitle: boolean; // 是否包含条目标题
    editingSnapshot: ISnapshotData | null;
    isEditModalOpen: boolean;
}

interface SnapshotContextValue extends SnapshotContextState {
    // 数据加载
    loadData: (worldviewId: number) => Promise<void>;
    
    // 展开/折叠
    setExpandedKeys: (keys: React.Key[]) => void;
    expandAll: () => void;
    collapseAll: () => void;
    
    // 搜索
    setSearchValue: (value: string) => void;
    
    // 查询方法
    getGroupById: (id: number) => IWorldBookGroup | null;
    getItemById: (id: number) => IWorldBookItem | null;
    getItemsByGroupId: (groupId: number) => IWorldBookItem[];
    
    // 计算属性
    sortedGroups: IWorldBookGroup[];
    snapshotConfig: ISnapshotConfig;
    
    // 快照编辑操作
    setCheckedKeys: (keys: React.Key[]) => void;
    setSnapshotContent: (content: string) => void;
    setSnapshotTitle: (title: string) => void;
    setIncludeItemTitle: (include: boolean) => void;
    setEditingSnapshot: (snapshot: ISnapshotData | null) => void;
    setIsEditModalOpen: (open: boolean) => void;
    generateContentFromSelection: (selectedItemIds: number[]) => string;
    handleCheck: (checkedKeysValue: React.Key[], checkedInfo: any) => void;
    openNewSnapshot: () => void;
    openEditSnapshot: (snapshot: ISnapshotData) => void;
    closeEditModal: () => void;
}

const SnapshotContext = createContext<SnapshotContextValue | null>(null);

export function SnapshotContextProvider({ 
    children,
    initialGroups = [],
    initialItems = []
}: { 
    children: ReactNode;
    initialGroups?: IWorldBookGroup[];
    initialItems?: IWorldBookItem[];
}) {
    const [state, setState] = useState<SnapshotContextState>({
        groups: initialGroups,
        items: initialItems,
        expandedKeys: [],
        searchValue: '',
        loading: false,
        checkedKeys: [],
        snapshotContent: '',
        snapshotTitle: '',
        includeItemTitle: true, // 默认包含条目标题
        editingSnapshot: null,
        isEditModalOpen: false
    });

    // 加载数据（只读）
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

    // 展开/折叠
    const setExpandedKeys = useCallback((keys: React.Key[]) => {
        setState(prev => ({ ...prev, expandedKeys: keys }));
    }, []);

    const expandAll = useCallback(() => {
        setState(prev => ({
            ...prev,
            expandedKeys: prev.groups.map(group => `group-${group.id}`).filter(Boolean)
        }));
    }, []);

    const collapseAll = useCallback(() => {
        setState(prev => ({ ...prev, expandedKeys: [] }));
    }, []);

    // 搜索
    const setSearchValue = useCallback((value: string) => {
        setState(prev => ({ ...prev, searchValue: value }));
    }, []);

    // 查询方法
    const getGroupById = useCallback((id: number) => {
        return state.groups.find(g => g.id === id) || null;
    }, [state.groups]);

    const getItemById = useCallback((id: number) => {
        return state.items.find(item => item.id === id) || null;
    }, [state.items]);

    const getItemsByGroupId = useCallback((groupId: number) => {
        return state.items
            .filter(item => item.group_id === groupId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [state.items]);

    // 计算属性
    const sortedGroups = useMemo(() => {
        return [...state.groups].sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [state.groups]);

    // 根据选中的条目生成快照正文
    const generateContentFromSelection = useCallback((selectedItemIds: number[], includeItemTitle: boolean = true) => {
        if (selectedItemIds.length === 0) {
            return '';
        }

        const selectedItems = selectedItemIds
            .map(id => getItemById(id))
            .filter(Boolean) as IWorldBookItem[];

        // 按分组和顺序排序
        const sortedItems = selectedItems.sort((a, b) => {
            const groupA = getGroupById(a.group_id!);
            const groupB = getGroupById(b.group_id!);
            if (groupA?.order !== groupB?.order) {
                return (groupA?.order || 0) - (groupB?.order || 0);
            }
            return (a.order || 0) - (b.order || 0);
        });

        // 按分组组织内容
        const contentByGroup: { [groupId: number]: IWorldBookItem[] } = {};
        sortedItems.forEach(item => {
            if (!contentByGroup[item.group_id!]) {
                contentByGroup[item.group_id!] = [];
            }
            contentByGroup[item.group_id!].push(item);
        });

        // 生成正文
        let content = '';
        Object.keys(contentByGroup).forEach(groupId => {
            const group = getGroupById(parseInt(groupId));
            const groupItems = contentByGroup[parseInt(groupId)];
            
            if (group) {
                content += `## ${group.title}\n`;
            }
            
            groupItems.forEach(item => {
                if (includeItemTitle && item.summary) {
                    content += `### ${item.summary}\n`;
                }
                if (item.content) {
                    content += `${item.content}\n`;
                }
            });
            
            content += '\n';
        });

        return content.trim();
    }, [getItemById, getGroupById]);

    // 处理勾选变化
    const handleCheck = useCallback((checkedKeysValue: React.Key[], checkedInfo: any) => {
        setState(prev => {
            // 提取选中的条目ID
            const selectedItemIds = checkedKeysValue
                .filter(key => typeof key === 'string' && key.startsWith('item-'))
                .map(key => {
                    const id = typeof key === 'string' ? parseInt(key.replace('item-', '')) : key;
                    return id;
                });

            // 自动生成正文（使用当前的 includeItemTitle 状态）
            const generatedContent = generateContentFromSelection(selectedItemIds, prev.includeItemTitle);
            
            return {
                ...prev,
                checkedKeys: checkedKeysValue,
                snapshotContent: generatedContent
            };
        });
    }, [generateContentFromSelection]);

    // 计算快照配置
    const snapshotConfig: ISnapshotConfig = useMemo(() => {
        const selectedItemIds = state.checkedKeys
            .filter(key => typeof key === 'string' && key.startsWith('item-'))
            .map(key => {
                const id = typeof key === 'string' ? parseInt(key.replace('item-', '')) : key;
                return id;
            });

        // 获取相关的分组ID
        const selectedGroupIds = Array.from(new Set(
            selectedItemIds
                .map(itemId => {
                    const item = getItemById(itemId);
                    return item?.group_id;
                })
                .filter(Boolean) as number[]
        ));

        return {
            selectedGroupIds,
            selectedItemIds
        };
    }, [state.checkedKeys, getItemById]);

    // 快照编辑操作
    const setCheckedKeys = useCallback((keys: React.Key[]) => {
        setState(prev => ({ ...prev, checkedKeys: keys }));
    }, []);

    const setSnapshotContent = useCallback((content: string) => {
        setState(prev => ({ ...prev, snapshotContent: content }));
    }, []);

    const setSnapshotTitle = useCallback((title: string) => {
        setState(prev => ({ ...prev, snapshotTitle: title }));
    }, []);

    const setIncludeItemTitle = useCallback((include: boolean) => {
        setState(prev => {
            // 当选项改变时，重新生成正文
            const selectedItemIds = prev.checkedKeys
                .filter(key => typeof key === 'string' && key.startsWith('item-'))
                .map(key => {
                    const id = typeof key === 'string' ? parseInt(key.replace('item-', '')) : key;
                    return id;
                });
            
            const generatedContent = generateContentFromSelection(selectedItemIds, include);
            
            return {
                ...prev,
                includeItemTitle: include,
                snapshotContent: generatedContent
            };
        });
    }, [generateContentFromSelection]);

    const setEditingSnapshot = useCallback((snapshot: ISnapshotData | null) => {
        setState(prev => ({ ...prev, editingSnapshot: snapshot }));
    }, []);

    const setIsEditModalOpen = useCallback((open: boolean) => {
        setState(prev => ({ ...prev, isEditModalOpen: open }));
    }, []);

    const openNewSnapshot = useCallback(() => {
        setState(prev => ({
            ...prev,
            editingSnapshot: null,
            checkedKeys: [],
            snapshotContent: '',
            snapshotTitle: '',
            includeItemTitle: true, // 重置为默认值
            isEditModalOpen: true
        }));
    }, []);

    const openEditSnapshot = useCallback((snapshot: ISnapshotData) => {
        // 解析配置
        let config: ISnapshotConfig = { selectedGroupIds: [], selectedItemIds: [] };
        if (snapshot.config) {
            try {
                config = JSON.parse(snapshot.config);
            } catch (e) {
                console.error('解析快照配置失败:', e);
            }
        }
        
        // 恢复勾选状态
        const itemKeys = config.selectedItemIds.map(id => `item-${id}`);
        
        setState(prev => ({
            ...prev,
            editingSnapshot: snapshot,
            checkedKeys: itemKeys,
            snapshotContent: snapshot.content || '',
            snapshotTitle: snapshot.title || '',
            isEditModalOpen: true
        }));
    }, []);

    const closeEditModal = useCallback(() => {
        setState(prev => ({
            ...prev,
            isEditModalOpen: false,
            editingSnapshot: null,
            checkedKeys: [],
            snapshotContent: '',
            snapshotTitle: '',
            includeItemTitle: true // 重置为默认值
        }));
    }, []);

    const value: SnapshotContextValue = {
        ...state,
        loadData,
        setExpandedKeys,
        expandAll,
        collapseAll,
        setSearchValue,
        getGroupById,
        getItemById,
        getItemsByGroupId,
        sortedGroups,
        snapshotConfig,
        setCheckedKeys,
        setSnapshotContent,
        setSnapshotTitle,
        setIncludeItemTitle,
        setEditingSnapshot,
        setIsEditModalOpen,
        generateContentFromSelection,
        handleCheck,
        openNewSnapshot,
        openEditSnapshot,
        closeEditModal
    };

    return (
        <SnapshotContext.Provider value={value}>
            {children}
        </SnapshotContext.Provider>
    );
}

export function useSnapshotData() {
    const context = useContext(SnapshotContext);
    if (!context) {
        throw new Error('useSnapshotData must be used within SnapshotContextProvider');
    }
    return context;
}
