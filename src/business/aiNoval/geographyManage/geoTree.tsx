import { Button, Tree, message } from 'antd';
import { IGeoStarSystemData } from '@/src/types/IAiNoval';
import React, { Key, useEffect, useRef, useState } from 'react';
import { type IGeoTreeItem, loadGeoTree } from '../common/geoDataUtil';
import { CheckOutlined, CheckCircleOutlined, IssuesCloseOutlined } from '@ant-design/icons';

interface IGeoTreeProps {
    worldViewId: null | number;
    updateTimestamp: any;

    onRaiseObject(data: IGeoTreeItem<IGeoStarSystemData>): void;
}


export type { IGeoTreeItem };

export default function(props: IGeoTreeProps) {

    let [treeData, setTreeData] = useState<IGeoTreeItem<IGeoStarSystemData>[]>([]);

    let [expandedKeys, setExpandedKeys] = useState<Key[]>([]);

    let lastRaiseObject = useRef<IGeoTreeItem<IGeoStarSystemData> | null>(null);


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
        } catch (e: any) {
            message.error(e?.message || '加载地理资源树失败！');
            return;
        }

        setTreeData(starSystemData);
        return starSystemData;
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

        loadTree().then((starSystemData) => {
            resetExpandedKeys(starSystemData);
        }).then(() => {
            if (lastRaiseObject.current && lastRaiseObject.current.data.worldview_id === props.worldViewId && typeof props.onRaiseObject === 'function') {
                props.onRaiseObject(lastRaiseObject.current);
            }
        });
    }, [props.worldViewId, props.updateTimestamp]);

    function handleExpand(expandedKeys: Key[]) {
        console.log('expandedKeys', expandedKeys);
        setExpandedKeys(expandedKeys);
    }

    function resetExpandedKeys(starSystemData?: IGeoTreeItem<IGeoStarSystemData>[]) {
        setExpandedKeys([]);

        if (!starSystemData) {
            return;
        }

        let expandedKeys: Key[] = [];
        function findParent(item: IGeoTreeItem<IGeoStarSystemData>) {
            if (!item.children?.length) {
                return;
            }

            expandedKeys.push(item.key);

            item.children.forEach((child) => {
                findParent(child);
            });
        }

        starSystemData.forEach((item) => {
            findParent(item);
        });

        setExpandedKeys(expandedKeys);
    }

    function renderNode(nodeData: any) {
        // let hasChildren = nodeData?.children && nodeData?.children.length > 0;
        let hasDocument = nodeData?.data?.dify_document_id && nodeData?.data?.dify_dataset_id;

        let hasRefDocument = !hasDocument && nodeData?.data?.described_in_llm;

        return (
            <>
                <span>{nodeData?.title}</span>
                {hasDocument ? <span style={{color: 'green', marginLeft: 10}}>
                    <CheckCircleOutlined />
                </span> : null}
                {hasRefDocument ? <span style={{color: 'orange', marginLeft: 10}}>
                    <IssuesCloseOutlined />
                </span> : null}
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
                treeData={treeData}
                titleRender={renderNode}
                expandedKeys={expandedKeys}
                onExpand={handleExpand}
                onSelect={(selectedKeys, info) => {
                    if (typeof props.onRaiseObject === 'function') {
                        lastRaiseObject.current = info.node;
                        props.onRaiseObject(info.node);
                    }
                }}
            >
            </Tree>
        </div>
    );
}