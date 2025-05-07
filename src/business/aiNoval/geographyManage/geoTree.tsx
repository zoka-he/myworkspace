import { Button, Tree, message } from 'antd';
import { IGeoStarSystemData } from '@/src/types/IAiNoval';
import React, { useEffect, useState } from 'react';
import { type IGeoTreeItem, loadGeoTree } from '../common/geoDataUtil';

interface IGeoTreeProps {
    worldViewId: null | number;
    updateTimestamp: any;

    onRaiseObject(data: IGeoTreeItem<IGeoStarSystemData>): void;
}


export type { IGeoTreeItem };

export default function(props: IGeoTreeProps) {

    let [treeData, setTreeData] = useState<IGeoTreeItem<IGeoStarSystemData>[]>([]);


    /**
     * 更新地理资源树：
     * 1.加载星系数据
     * 2.加载恒星数据
     * 3.加载行星数据
     * 4.加载卫星数据
     * 5.加载行星地貌数据
     */
    async function loadTree() {
        if (!props.worldViewId) {
            setTreeData([]);
            message.info('请选择世界观！');
            return;
        }

        let starSystemData = [];
        try {
            starSystemData = await loadGeoTree(props.worldViewId);
            if (starSystemData.length === 0) {
                message.info('该世界观没有星系数据！');
                return;
            }
        } catch (e: unknown) {
            message.error(e?.message || '加载地理资源树失败！');
            return;
        }

        setTreeData(starSystemData);
    }

    /**
     * 侦测世界观更新：
     * 1.更新地理资源树
     */
    useEffect(() => {
        console.log('侦测到世界观更新');

        if (props.worldViewId === null) {
            setTreeData([]);

            message.info('请选择世界观！');
            return;
        }

        loadTree();
    }, [props.worldViewId, props.updateTimestamp]);

    function renderNode(nodeData: any) {
        // let hasChildren = nodeData?.children && nodeData?.children.length > 0;

        return (
            <>
                <span>{nodeData?.title}</span>
                {/* <span>
                    { !hasChildren && <Button type="text" danger size="small">删除</Button> }
                </span> */}
            </>
        );
    }

    return (
        <div style={{minHeight: 200}}>
            <Tree
                showLine
                defaultExpandAll={true}
                autoExpandParent={true}
                defaultExpandParent={true}
                treeData={treeData}
                titleRender={renderNode}
                onSelect={(selectedKeys, info) => {
                    if (typeof props.onRaiseObject === 'function') {
                        props.onRaiseObject(info.node);
                    }
                }}
            >
            </Tree>
        </div>
    );
}