import { Tree, Button, message, Modal, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Key, useEffect, useMemo, useState } from 'react';
import { IFactionDefData } from '@/src/types/IAiNoval';
import { useCurrentFactionId, useFactionEmbedDocuments, useFactionList, useFactionTree, useWorldViewId } from './FactionManageContext';
import { useGetEditModal, useLoadFactionList, useLoadFactionEmbedDocuments } from './FactionManageContext';
import apiCalls from './apiCalls';
import SparkMD5 from 'spark-md5';


interface IFactionTreeProps {
    
}

interface TreeNodeData {
    key: number;
    title: JSX.Element;
    children?: TreeNodeData[];
    isLeaf?: boolean;
}

const FactionTree: React.FC<IFactionTreeProps> = ({
    // worldViewId,
    // factions,
    // onAddChild,
    // onDelete,
    // onSelect,
}) => {
    const [treeData] = useFactionTree();
    const [factions] = useFactionList();
    const getEditModal = useGetEditModal();
    const [worldViewId] = useWorldViewId();
    const [currentFactionId, setCurrentFactionId] = useCurrentFactionId();
    const loadFactionList = useLoadFactionList();
    const [factionEmbedDocuments] = useFactionEmbedDocuments();

    function handleAddChild(faction: IFactionDefData) {
        // onAddChild(faction);
        getEditModal()?.showAndEdit({
            worldview_id: worldViewId,
            parent_id: faction.id
        } as IFactionDefData);
    }

    function handleDelete(faction: IFactionDefData) {
        if (!faction.id) {
            message.error('无效的阵营ID');
            return;
        }

        const factionId = faction.id; // Store the ID in a variable to satisfy TypeScript
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除阵营"${faction.name}"吗？`,
            okText: '确认',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await apiCalls.deleteFaction(factionId);
                    message.success('阵营删除成功');
                    // setSelectedFaction(null);
                    // setTreeTimestamp(Date.now());
                } catch (error) {
                    console.error('Delete failed:', error);
                    message.error('阵营删除失败');
                } finally {
                    loadFactionList();
                    // loadFactionEmbedDocuments();
                }
            }
        });
    }

    const transformFactionData = useMemo((): TreeNodeData[] => {
        const buildTree = (parentId: number | null): TreeNodeData[] => {
            return factions
                .filter(f => f.parent_id === parentId)
                .map(faction => {
                    const children = buildTree(faction.id || 0);
                    const isLeaf = children.length === 0;

                    let embedState: React.ReactNode | null = <Tag color="green">向量就绪</Tag>;
                    let document = factionEmbedDocuments.find(item => item.id === String(faction.id));
                    if (!document) {
                        embedState = null;
                    } else if (document?.metadata?.fingerprint !== SparkMD5.hash(faction.embed_document || '')) {
                        embedState = <Tag color="red">向量过期</Tag>;
                    }

                    return {
                        key: faction.id || 0,
                        title: (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>{faction.name}</span>
                                <div>
                                    {embedState}
                                    <Button 
                                        type="link" 
                                        icon={<PlusOutlined />} 
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddChild(faction);
                                        }}
                                    />
                                    <Button 
                                        type="text" 
                                        icon={<DeleteOutlined />} 
                                        size="small"
                                        disabled={!isLeaf}
                                        danger={isLeaf}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(faction);
                                        }}
                                    />
                                </div>
                            </div>
                        ),
                        children: children.length > 0 ? children : undefined,
                        isLeaf
                    };
                });
        };

        return buildTree(null);
    }, [factions, factionEmbedDocuments]);

    return (
        <div style={{ height: '100%', overflow: 'auto' }}>
            <Tree
                treeData={transformFactionData}
                showLine
                showIcon={false}
                blockNode
                onSelect={(selectedKeys, info) => {
                    if (selectedKeys.length > 0 && selectedKeys[0]) {
                        setCurrentFactionId(selectedKeys[0]);
                    }
                }}
            />
        </div>
    );
};

export default FactionTree;
