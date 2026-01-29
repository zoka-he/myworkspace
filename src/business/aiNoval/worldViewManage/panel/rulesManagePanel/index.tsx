import { useState, useEffect } from 'react';
import { Row, Col, message } from 'antd';
import { useWorldViewData } from '../../worldviewManageContext';
import { WorldRuleContextProvider, useWorldRule } from './worldRuleContext';
import GroupTree from './components/GroupTree';
import ContentEditor from './components/ContentEditor';
import ItemModal from './components/ItemModal';
import GroupModal from './components/GroupModal';
import styles from './index.module.scss';
import { IWorldBookGroup, IWorldBookItem } from './types';

// 内部组件 - 使用 Context
function RulesManagePanelContent() {
    const [worldViewData] = useWorldViewData();
    const {
        selectedGroupId,
        selectedItemId,
        selectedGroup,
        selectedItem,
        expandedKeys,
        addGroup,
        updateGroup,
        addItem,
        updateItem,
        getItemsByGroupId,
        setExpandedKeys
    } = useWorldRule();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isGroupEditModalOpen, setIsGroupEditModalOpen] = useState(false);
    const [isGroupAddModalOpen, setIsGroupAddModalOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState<number | null>(null);
    const [editingGroupId, setEditingGroupId] = useState<number | null>(null);

    // 处理添加分组
    const handleAddGroup = () => {
        setEditingGroupId(null);
        setIsGroupAddModalOpen(true);
    };

    // 处理编辑分组
    const handleEditGroup = (groupId: number) => {
        setEditingGroupId(groupId);
        setIsGroupEditModalOpen(true);
    };

    // 处理添加条目
    const handleAddItem = () => {
        if (!selectedGroupId) {
            message.warning('请先选择一个分组');
            return;
        }
        setEditingItemId(null);
        setIsAddModalOpen(true);
    };

    // 处理编辑条目
    const handleEditItem = () => {
        if (!selectedItemId) {
            message.warning('请先选择一个条目');
            return;
        }
        setEditingItemId(selectedItemId);
        setIsEditModalOpen(true);
    };

    // 保存添加分组
    const handleAddGroupSave = async (values: { title: string }) => {
        if (!worldViewData?.id) {
            message.error('世界观ID不存在');
            return;
        }

        try {
            await addGroup({
                worldview_id: worldViewData.id,
                title: values.title,
                parent_id: null,
                order: 0, // 将在 Context 中计算
                content: ''
            });
            setIsGroupAddModalOpen(false);
            message.success('添加成功');
        } catch (error) {
            // 错误已在 Context 中处理
        }
    };

    // 保存编辑分组
    const handleEditGroupSave = async (values: { title: string }) => {
        if (!editingGroupId) return;
        try {
            await updateGroup(editingGroupId, { title: values.title });
            setIsGroupEditModalOpen(false);
            setEditingGroupId(null);
            message.success('保存成功');
        } catch (error) {
            // 错误已在 Context 中处理
        }
    };

    // 保存添加条目
    const handleAddItemSave = async (values: any) => {
        if (!worldViewData?.id || !selectedGroupId) {
            message.error('世界观ID或分组ID不存在');
            return;
        }

        try {
            const groupItems = getItemsByGroupId(selectedGroupId);
            await addItem({
                worldview_id: worldViewData.id,
                group_id: selectedGroupId,
                summary: values.summary,
                content: values.content || '',
                order: groupItems.length + 1
            });
            setIsAddModalOpen(false);
            message.success('添加成功');
            
            // 自动展开分组
            setExpandedKeys([...expandedKeys, `group-${selectedGroupId}`]);
        } catch (error) {
            // 错误已在 Context 中处理
        }
    };

    // 保存编辑条目
    const handleEditItemSave = async (values: any) => {
        if (!editingItemId) return;
        try {
            await updateItem(editingItemId, {
                summary: values.summary,
                content: values.content
            });
            setIsEditModalOpen(false);
            setEditingItemId(null);
            message.success('保存成功');
        } catch (error) {
            // 错误已在 Context 中处理
        }
    };

    const editingGroup = editingGroupId ? selectedGroup : null;
    const editingItem = editingItemId ? selectedItem : null;

    return (
        <div className={styles.rulesManagePanel}>
            <Row gutter={16} className={styles.panelRow}>
                {/* 左侧：分组树 */}
                <Col span={8} className={styles.leftPanel}>
                    <GroupTree
                        onAddGroup={handleAddGroup}
                        onEditGroup={handleEditGroup}
                    />
                </Col>

                {/* 右侧：编辑器 */}
                <Col span={16} className={styles.rightPanel}>
                    <ContentEditor
                        onAddItem={handleAddItem}
                        onEditItem={handleEditItem}
                        onEditGroup={handleEditGroup}
                    />
                </Col>
            </Row>

            {/* 添加/编辑条目模态框 */}
            <ItemModal
                open={isAddModalOpen || isEditModalOpen}
                editingItem={editingItem}
                groupId={selectedGroupId || undefined}
                onOk={editingItem ? handleEditItemSave : handleAddItemSave}
                onCancel={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                    setEditingItemId(null);
                }}
            />

            {/* 添加/编辑分组模态框 */}
            <GroupModal
                open={isGroupAddModalOpen || isGroupEditModalOpen}
                editingGroup={editingGroup}
                onOk={editingGroup ? handleEditGroupSave : handleAddGroupSave}
                onCancel={() => {
                    setIsGroupAddModalOpen(false);
                    setIsGroupEditModalOpen(false);
                    setEditingGroupId(null);
                }}
            />
        </div>
    );
}

// 主组件 - 提供 Context
export default function RulesManagePanel() {
    const [worldViewData] = useWorldViewData();
    const [groups, setGroups] = useState<IWorldBookGroup[]>([]);
    const [items, setItems] = useState<IWorldBookItem[]>([]);
    const [loading, setLoading] = useState(true);

    // 从 API 加载数据
    useEffect(() => {
        if (worldViewData?.id) {
            setLoading(true);
            // 数据将在 Context 中加载
            setGroups([]);
            setItems([]);
            setLoading(false);
        }
    }, [worldViewData?.id]);

    return (
        <WorldRuleContextProvider
            initialGroups={groups}
            initialItems={items}
        >
            <RulesManagePanelWithData worldviewId={worldViewData?.id} />
        </WorldRuleContextProvider>
    );
}

// 数据加载组件
function RulesManagePanelWithData({ worldviewId }: { worldviewId?: number }) {
    const { loadData, loading } = useWorldRule();

    useEffect(() => {
        if (worldviewId) {
            loadData(worldviewId);
        }
    }, [worldviewId, loadData]);

    if (loading) {
        return <div>加载中...</div>;
    }

    return <RulesManagePanelContent />;
}
