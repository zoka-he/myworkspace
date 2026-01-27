import { useMemo } from 'react';
import { Space, Button, Input, Tree, Card, Empty } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, UpOutlined, DownOutlined, FolderOutlined, FileTextOutlined, BookOutlined } from '@ant-design/icons';
import { useWorldRule } from '../worldRuleContext';
import styles from '../index.module.scss';

interface GroupTreeProps {
    onAddGroup: () => void;
    onEditGroup: (groupId: number) => void;
}

export default function GroupTree({
    onAddGroup,
    onEditGroup
}: GroupTreeProps) {
    const {
        sortedGroups,
        items,
        selectedGroupId,
        selectedItemId,
        expandedKeys,
        searchValue,
        setSelectedGroupId,
        setSelectedItemId,
        setExpandedKeys,
        setSearchValue,
        moveGroup,
        moveItem,
        getItemsByGroupId,
        expandAll,
        collapseAll
    } = useWorldRule();
    // 将数据转换为Tree组件需要的格式
    const treeData = useMemo(() => {
        return sortedGroups.map(group => {
            const groupItems = getItemsByGroupId(group.id!);
            return {
                title: (
                    <div className={styles.treeNode}>
                        <span className={styles.treeNodeTitle}>{group.title}</span>
                        <Space size={4} className={styles.treeNodeActions}>
                            <Button 
                                type="text" 
                                size="small" 
                                icon={<EditOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditGroup(group.id!);
                                }}
                            />
                            <Button 
                                type="text" 
                                size="small" 
                                icon={<UpOutlined />}
                                disabled={group.order === 1}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    moveGroup(group.id!, 'up');
                                }}
                            />
                            <Button 
                                type="text" 
                                size="small" 
                                icon={<DownOutlined />}
                                disabled={group.order === sortedGroups.length}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    moveGroup(group.id!, 'down');
                                }}
                            />
                        </Space>
                    </div>
                ),
                key: `group-${group.id}`,
                icon: <FolderOutlined />,
                children: groupItems.map(item => ({
                    title: (
                        <div className={styles.treeNode}>
                            <span className={styles.treeNodeTitle}>{item.summary}</span>
                            <Space size={4} className={styles.treeNodeActions}>
                                <Button 
                                    type="text" 
                                    size="small" 
                                    icon={<UpOutlined />}
                                    disabled={item.order === 1}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        moveItem(item.id!, 'up');
                                    }}
                                />
                                <Button 
                                    type="text" 
                                    size="small" 
                                    icon={<DownOutlined />}
                                    disabled={item.order === groupItems.length}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        moveItem(item.id!, 'down');
                                    }}
                                />
                            </Space>
                        </div>
                    ),
                    key: `item-${item.id}`,
                    icon: <FileTextOutlined />,
                    item: item,
                    group: group
                })),
                group: group
            };
        });
    }, [sortedGroups, getItemsByGroupId, onEditGroup, moveGroup, moveItem]);

    // 过滤树数据
    const filteredTreeData = useMemo(() => {
        if (!searchValue) return treeData;
        
        return treeData.reduce((acc, node) => {
            const group = node.group;
            const groupMatches = group.title.toLowerCase().includes(searchValue.toLowerCase());
            
            const filteredItems = node.children?.filter((childNode: any) => {
                const item = childNode.item;
                return item.summary.toLowerCase().includes(searchValue.toLowerCase()) ||
                    item.content?.toLowerCase().includes(searchValue.toLowerCase());
            }) || [];
            
            if (groupMatches || filteredItems.length > 0) {
                acc.push({
                    ...node,
                    children: filteredItems.length > 0 ? filteredItems : (groupMatches ? node.children : [])
                });
            }
            
            return acc;
        }, [] as any[]);
    }, [treeData, searchValue]);

    // 计算选中的key
    const selectedKeys = useMemo(() => {
        if (selectedItemId) {
            return [`item-${selectedItemId}`];
        }
        if (selectedGroupId) {
            return [`group-${selectedGroupId}`];
        }
        return [];
    }, [selectedItemId, selectedGroupId]);

    // 处理选择
    const handleSelect = (selectedKeys: React.Key[]) => {
        if (selectedKeys.length === 0) {
            setSelectedGroupId(null);
            setSelectedItemId(null);
            return;
        }
        
        const key = selectedKeys[0] as string;
        if (key.startsWith('group-')) {
            const groupId = parseInt(key.replace('group-', ''));
            setSelectedGroupId(groupId);
            setSelectedItemId(null);
        } else if (key.startsWith('item-')) {
            const itemId = parseInt(key.replace('item-', ''));
            setSelectedItemId(itemId);
        }
    };

    return (
        <Card 
            title={
                <div className={styles.cardTitle}>
                    <BookOutlined /> 世界书目录
                </div>
            }
            extra={
                <Space>
                    <Button 
                        size="small" 
                        icon={<PlusOutlined />}
                        onClick={onAddGroup}
                    >
                        添加分组
                    </Button>
                </Space>
            }
            className={styles.treeCard}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Input
                    placeholder="搜索章节或内容..."
                    prefix={<SearchOutlined />}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    allowClear
                />
                <Space size="small">
                    <Button size="small" onClick={expandAll}>展开全部</Button>
                    <Button size="small" onClick={collapseAll}>折叠全部</Button>
                </Space>
            </Space>
            
            <div className={styles.treeContainer}>
                {filteredTreeData.length > 0 ? (
                    <Tree
                        showIcon
                        expandedKeys={expandedKeys}
                        onExpand={setExpandedKeys}
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
