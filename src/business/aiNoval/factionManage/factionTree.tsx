import { Tree, Button, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Key, useEffect, useState } from 'react';
import { IFactionDefData } from '@/src/types/IAiNoval';

interface IFactionTreeProps {
    worldViewId: number | null;
    factions: IFactionDefData[];
    onAddChild: (faction: IFactionDefData) => void;
    onDelete: (faction: IFactionDefData) => void;
    onSelect: (faction: IFactionDefData) => void;
}

interface TreeNodeData {
    key: number;
    title: JSX.Element;
    children?: TreeNodeData[];
    isLeaf?: boolean;
}

const FactionTree: React.FC<IFactionTreeProps> = ({
    worldViewId,
    factions,
    onAddChild,
    onDelete,
    onSelect,
}) => {
    const [treeData, setTreeData] = useState<TreeNodeData[]>([]);

    useEffect(() => {
        if (factions.length > 200) {
            message.warning('阵营数量超过请求数量，请检查程序！');
        }
        const transformedData = transformFactionData(factions);
        setTreeData(transformedData);
    }, [factions]);

    const transformFactionData = (factions: IFactionDefData[]): TreeNodeData[] => {
        const buildTree = (parentId: number | null): TreeNodeData[] => {
            return factions
                .filter(f => f.parent_id === parentId)
                .map(faction => {
                    const children = buildTree(faction.id || 0);
                    const isLeaf = children.length === 0;

                    return {
                        key: faction.id || 0,
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
        <div style={{ height: '100%', overflow: 'auto' }}>
            <Tree
                treeData={treeData}
                showLine
                showIcon={false}
                blockNode
                onSelect={(selectedKeys, info) => {
                    if (selectedKeys.length > 0) {
                        const faction = factions.find(f => f.id === selectedKeys[0]);
                        if (faction) {
                            onSelect(faction);
                        }
                    }
                }}
            />
        </div>
    );
};

export default FactionTree;
