import { Tree, Button, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Key, useEffect, useState } from 'react';
import { IFactionDefData } from '@/src/types/IAiNoval';
import apiCalls from './apiCalls';

interface IFactionTreeProps {
    worldViewId: number | null;
    onAddChild: (faction: IFactionDefData) => void;
    onDelete: (faction: IFactionDefData) => void;
    timestamp?: number;
}

interface TreeNodeData {
    key: number;
    title: JSX.Element;
    children?: TreeNodeData[];
    isLeaf?: boolean;
}

const FactionTree: React.FC<IFactionTreeProps> = ({
    worldViewId,
    onAddChild,
    onDelete,
    timestamp
}) => {
    const [treeData, setTreeData] = useState<TreeNodeData[]>([]);

    const fetchFactionTree = async () => {
        if (!worldViewId) return;
        
        try {
            const response = await apiCalls.getFactionList(worldViewId);
            const transformedData = transformFactionData(response.data);
            setTreeData(transformedData);
        } catch (error) {
            message.error('获取阵营树失败');
            console.error(error);
        }
    };

    useEffect(() => {
        fetchFactionTree();
    }, [worldViewId, timestamp]);

    const transformFactionData = (factions: IFactionDefData[]): TreeNodeData[] => {
        const buildTree = (parentId: number | null): TreeNodeData[] => {
            return factions
                .filter(f => f.parent_id === parentId)
                .map(faction => {
                    const children = buildTree(faction.id);
                    const isLeaf = children.length === 0;

                    return {
                        key: faction.id,
                        title: (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>{faction.name}</span>
                                <div>
                                    <Button 
                                        type="text" 
                                        icon={<PlusOutlined />} 
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAddChild(faction);
                                        }}
                                    />
                                    <Button 
                                        type="text" 
                                        icon={<DeleteOutlined />} 
                                        size="small"
                                        disabled={!isLeaf}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(faction);
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
    };

    return (
        <div style={{ height: '100%', overflowY: 'auto' }}>
            <Tree
                treeData={treeData}
                showLine
                showIcon={false}
            />
        </div>
    );
};

export default FactionTree;
