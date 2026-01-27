import { useMemo, useCallback } from 'react';
import { Input, Tree, Card, Empty, Space, Button } from 'antd';
import { SearchOutlined, FolderOutlined, FileTextOutlined, BookOutlined, CheckSquareOutlined, BorderOutlined } from '@ant-design/icons';
import { useSnapshotData } from '../snapshotContext';
import styles from '../index.module.scss';

interface CheckboxTreeProps {
    checkedKeys: React.Key[];
    onCheck: (checkedKeys: React.Key[], checkedInfo: any) => void;
}

export default function CheckboxTree({
    checkedKeys,
    onCheck
}: CheckboxTreeProps) {
    const {
        sortedGroups,
        items,
        expandedKeys,
        searchValue,
        setExpandedKeys,
        setSearchValue,
        getItemsByGroupId,
        expandAll,
        collapseAll
    } = useSnapshotData();

    // 将数据转换为Tree组件需要的格式（带复选框）
    const treeData = useMemo(() => {
        return sortedGroups.map(group => {
            const groupItems = getItemsByGroupId(group.id!);
            return {
                title: group.title,
                key: `group-${group.id}`,
                icon: <FolderOutlined />,
                checkable: false, // 分组不可选，只选条目
                children: groupItems.map(item => ({
                    title: item.summary || '未命名条目',
                    key: `item-${item.id}`,
                    icon: <FileTextOutlined />,
                    item: item,
                    group: group
                }))
            };
        });
    }, [sortedGroups, getItemsByGroupId]);

    // 过滤树数据
    const filteredTreeData = useMemo(() => {
        if (!searchValue) return treeData;
        
        return treeData.reduce((acc, node) => {
            const groupMatches = node.title?.toLowerCase().includes(searchValue.toLowerCase());
            
            const filteredItems = node.children?.filter((childNode: any) => {
                const item = childNode.item;
                return item.summary?.toLowerCase().includes(searchValue.toLowerCase()) ||
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

    // 获取所有可选的条目key（考虑搜索过滤）
    const allItemKeys = useMemo(() => {
        const dataToUse = filteredTreeData.length > 0 ? filteredTreeData : treeData;
        const keys: React.Key[] = [];
        dataToUse.forEach(node => {
            if (node.children) {
                node.children.forEach((child: any) => {
                    if (child.key && typeof child.key === 'string' && child.key.startsWith('item-')) {
                        keys.push(child.key);
                    }
                });
            }
        });
        return keys;
    }, [filteredTreeData, treeData]);

    // 全选
    const handleSelectAll = useCallback(() => {
        onCheck(allItemKeys, {});
    }, [allItemKeys, onCheck]);

    // 全不选
    const handleDeselectAll = useCallback(() => {
        onCheck([], {});
    }, [onCheck]);

    return (
        <Card 
            title={
                <div className={styles.cardTitle}>
                    <BookOutlined /> 选择条目
                </div>
            }
            className={styles.treeCard}
            size="small"
            styles={{
                body: { padding: '12px' }
            }}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Input
                    size="small"
                    placeholder="搜索章节或内容..."
                    prefix={<SearchOutlined />}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    allowClear
                />
                <Space size="small" wrap>
                    <Button size="small" onClick={expandAll}>展开全部</Button>
                    <Button size="small" onClick={collapseAll}>折叠全部</Button>
                    <Button 
                        size="small" 
                        icon={<CheckSquareOutlined />}
                        onClick={handleSelectAll}
                    >
                        全选
                    </Button>
                    <Button 
                        size="small" 
                        icon={<BorderOutlined />}
                        onClick={handleDeselectAll}
                    >
                        全不选
                    </Button>
                </Space>
            </Space>
            
            <div className={styles.treeContainer} style={{ marginTop: 8, minHeight: '500px' }}>
                {filteredTreeData.length > 0 ? (
                    <Tree
                        checkable
                        showIcon
                        expandedKeys={expandedKeys}
                        onExpand={setExpandedKeys}
                        checkedKeys={checkedKeys}
                        onCheck={onCheck}
                        treeData={filteredTreeData}
                        blockNode
                        style={{ fontSize: '13px' }}
                    />
                ) : (
                    <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
            </div>
        </Card>
    );
}
