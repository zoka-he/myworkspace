import { useEffect, useMemo, useState } from 'react';
import { Card, Tree, Input, Button, Space, Empty, message } from 'antd';
import { SearchOutlined, PlusOutlined, BookOutlined, AppstoreOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { useMagicSystemManage } from '../context';
import fetch from '@/src/fetch';
import { IMagicSystemDef } from '@/src/types/IAiNoval';
import _ from 'lodash';
import styles from './SystemTree.module.scss';

interface SystemTreeProps {
    onAddSystem?: () => void;
}

export default function SystemTree({ onAddSystem }: SystemTreeProps) {
    const { state, dispatch } = useMagicSystemManage();
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [loading, setLoading] = useState(false);

    // 一次性加载所有数据
    useEffect(() => {
        loadAllData();
    }, []);

    // 当世界观列表加载完成后，默认展开所有节点
    useEffect(() => {
        if (state.worldviewList.length > 0) {
            const allWorldviewKeys = state.worldviewList.map(worldview => `worldview-${worldview.id}`);
            setExpandedKeys(allWorldviewKeys);
        }
    }, [state.worldviewList]);

    async function loadAllData() {
        try {
            setLoading(true);
            // 并行加载世界观列表和所有技能系统
            const [worldviewResponse, magicSystemResponse] = await Promise.all([
                fetch.get('/api/aiNoval/worldView/list', {
                    params: { page: 1, limit: 1000 }
                }),
                fetch.get('/api/aiNoval/magic_system/def', {
                    params: { page: 1, limit: 10000 }
                })
            ]);
            
            dispatch({ type: 'SET_WORLDVIEW_LIST', payload: worldviewResponse.data || [] });
            dispatch({ type: 'SET_MAGIC_SYSTEM_LIST', payload: magicSystemResponse.data || [] });
        } catch (e: any) {
            console.error(e);
            message.error('加载数据失败: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    // 获取同一世界观下的技能系统列表
    function getBrotherSystems(system: IMagicSystemDef): IMagicSystemDef[] {
        return state.magicSystemList
            .filter(sys => sys.worldview_id === system.worldview_id)
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }

    // 排序处理函数
    async function onReorderSystem(
        system: IMagicSystemDef,
        reorderHandler: (systemList: IMagicSystemDef[], currentPos: number) => IMagicSystemDef[]
    ) {
        const systemList = getBrotherSystems(system);
        const currentPos = _.findIndex(systemList, { id: system.id });
        
        if (currentPos === -1) {
            message.error('找不到技能系统，无法调整顺序');
            return;
        }

        const updateData = reorderHandler(systemList, currentPos);
        if (!updateData || updateData.length === 0) {
            return;
        }

        try {
            await Promise.all(updateData.map(item => {
                return fetch.post(
                    '/api/aiNoval/magic_system/def',
                    { order_num: item.order_num },
                    { params: { id: item.id } }
                );
            }));
            message.success('排序更新成功');
            // 重新加载所有数据
            await loadAllData();
        } catch (e: any) {
            console.error(e);
            message.error('排序更新失败: ' + e.message);
        }
    }

    // 上移
    function handleMoveUp(system: IMagicSystemDef) {
        onReorderSystem(system, (systemList: IMagicSystemDef[], currentPos: number) => {
            if (currentPos === 0) {
                message.warning('已经是第一个，无法上移');
                return [];
            }

            const updateData: IMagicSystemDef[] = [];
            systemList.forEach((item, index) => {
                if (index === currentPos) {
                    updateData.push({ ...item, order_num: systemList[currentPos - 1].order_num || 0 });
                } else if (index === currentPos - 1) {
                    updateData.push({ ...item, order_num: system.order_num || 0 });
                }
            });
            return updateData;
        });
    }

    // 下移
    function handleMoveDown(system: IMagicSystemDef) {
        onReorderSystem(system, (systemList: IMagicSystemDef[], currentPos: number) => {
            if (currentPos === systemList.length - 1) {
                message.warning('已经是最后一个，无法下移');
                return [];
            }

            const updateData: IMagicSystemDef[] = [];
            systemList.forEach((item, index) => {
                if (index === currentPos) {
                    updateData.push({ ...item, order_num: systemList[currentPos + 1].order_num || 0 });
                } else if (index === currentPos + 1) {
                    updateData.push({ ...item, order_num: system.order_num || 0 });
                }
            });
            return updateData;
        });
    }

    // 构建树形数据
    const treeData = useMemo<DataNode[]>(() => {
        const data: DataNode[] = [];

        state.worldviewList.forEach(worldview => {
            const systems = state.magicSystemList
                .filter(sys => sys.worldview_id === worldview.id)
                .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
            
            const children: DataNode[] = systems.map((system, index) => {
                const isFirst = index === 0;
                const isLast = index === systems.length - 1;
                
                return {
                    key: `system-${system.id}`,
                    title: (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch({ type: 'SET_SELECTED_MAGIC_SYSTEM_ID', payload: system.id });
                                }}
                                style={{
                                    color: state.selectedMagicSystemId === system.id ? '#1890ff' : undefined,
                                    fontWeight: state.selectedMagicSystemId === system.id ? 'bold' : undefined,
                                    cursor: 'pointer',
                                    flex: 1
                                }}
                            >
                                {system.system_name}
                            </span>
                            <Space 
                                size={4} 
                                onClick={(e) => e.stopPropagation()}
                                style={{ marginLeft: 8 }}
                            >
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<UpOutlined />}
                                    disabled={isFirst}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveUp(system);
                                    }}
                                />
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<DownOutlined />}
                                    disabled={isLast}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveDown(system);
                                    }}
                                />
                            </Space>
                        </div>
                    ),
                    icon: <AppstoreOutlined />,
                    isLeaf: true,
                };
            });

            data.push({
                key: `worldview-${worldview.id}`,
                title: (
                    <span
                        onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: 'SET_SELECTED_WORLDVIEW_ID', payload: worldview.id });
                        }}
                        style={{
                            color: state.selectedWorldviewId === worldview.id && !state.selectedMagicSystemId ? '#1890ff' : undefined,
                            fontWeight: state.selectedWorldviewId === worldview.id && !state.selectedMagicSystemId ? 'bold' : undefined,
                            cursor: 'pointer'
                        }}
                    >
                        {worldview.title}
                    </span>
                ),
                icon: <BookOutlined />,
                children: children.length > 0 ? children : undefined,
            });
        });

        return data;
    }, [state.worldviewList, state.magicSystemList, state.selectedWorldviewId, state.selectedMagicSystemId]);

    // 过滤树形数据
    const filteredTreeData = useMemo(() => {
        if (!searchValue) return treeData;

        const filterTree = (nodes: DataNode[]): DataNode[] => {
            return nodes
                .map(node => {
                    const title = (node.title as any)?.props?.children || node.title;
                    const titleStr = typeof title === 'string' ? title : '';
                    const match = titleStr.toLowerCase().includes(searchValue.toLowerCase());
                    
                    const children = node.children ? filterTree(node.children) : undefined;
                    const hasMatchingChildren = children && children.length > 0;

                    if (match || hasMatchingChildren) {
                        return {
                            ...node,
                            children: hasMatchingChildren ? children : node.children,
                        };
                    }
                    return null;
                })
                .filter(Boolean) as DataNode[];
        };

        return filterTree(treeData);
    }, [treeData, searchValue]);

    const selectedKeys = useMemo(() => {
        const keys: React.Key[] = [];
        // 如果选中了技能系统，只高亮技能系统节点
        if (state.selectedMagicSystemId) {
            keys.push(`system-${state.selectedMagicSystemId}`);
        } 
        // 如果没有选中技能系统，但选中了世界观，才高亮世界观节点
        else if (state.selectedWorldviewId) {
            keys.push(`worldview-${state.selectedWorldviewId}`);
        }
        return keys;
    }, [state.selectedWorldviewId, state.selectedMagicSystemId]);

    const handleSelect = (selectedKeys: React.Key[]) => {
        // 选择逻辑已在 title 的 onClick 中处理
    };

    const handleExpand = (expandedKeys: React.Key[]) => {
        setExpandedKeys(expandedKeys);
    };

    return (
        <Card
            title={
                <div>
                    <BookOutlined /> 世界观和技能系统
                </div>
            }
            extra={
                state.selectedWorldviewId && !state.selectedMagicSystemId && (
                    <Button
                        size="small"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={onAddSystem}
                    >
                        添加技能系统
                    </Button>
                )
            }
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
            <Space direction="vertical" style={{ width: '100%', marginBottom: 8 }} size="small">
                <Input
                    placeholder="搜索世界观或技能系统..."
                    prefix={<SearchOutlined />}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    allowClear
                />
            </Space>

            <div className={styles.treeContainer} style={{ flex: 1, overflow: 'auto' }}>
                {filteredTreeData.length > 0 ? (
                    <Tree
                        showIcon
                        expandedKeys={expandedKeys}
                        onExpand={handleExpand}
                        selectedKeys={selectedKeys}
                        onSelect={handleSelect}
                        treeData={filteredTreeData}
                        blockNode
                    />
                ) : (
                    <Empty description="暂无数据" />
                )}
            </div>
        </Card>
    );
}
