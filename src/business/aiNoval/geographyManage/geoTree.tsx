import { Button, Tree, message, Input } from 'antd';
import { IGeoStarSystemData } from '@/src/types/IAiNoval';
import React, { Key, useEffect, useRef, useState, useMemo } from 'react';
import { type IGeoTreeItem, loadGeoTree } from '../common/geoDataUtil';
import { CheckOutlined, CheckCircleOutlined, IssuesCloseOutlined, SearchOutlined } from '@ant-design/icons';

interface IGeoTreeProps {
    worldViewId: null | number;
    updateTimestamp: any;

    onRaiseObject(data: IGeoTreeItem<IGeoStarSystemData>): void;
}


export type { IGeoTreeItem };

export default function(props: IGeoTreeProps) {

    let [treeData, setTreeData] = useState<IGeoTreeItem<IGeoStarSystemData>[]>([]);
    let [originalTreeData, setOriginalTreeData] = useState<IGeoTreeItem<IGeoStarSystemData>[]>([]);

    let [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
    let [searchValue, setSearchValue] = useState<string>('');

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
        setOriginalTreeData(starSystemData);
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
            // 先重置展开状态，如果正在搜索，搜索逻辑会在数据更新后自动处理
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

    /**
     * 收起所有节点
     */
    function collapseAll() {
        setExpandedKeys([]);
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

    /**
     * 过滤树数据：根据搜索关键词过滤树节点
     */
    function filterTreeData(
        data: IGeoTreeItem<IGeoStarSystemData>[],
        searchValue: string
    ): IGeoTreeItem<IGeoStarSystemData>[] {
        if (!searchValue) {
            return data;
        }

        const searchLower = searchValue.toLowerCase();

        function filterNode(node: IGeoTreeItem<IGeoStarSystemData>): IGeoTreeItem<IGeoStarSystemData> | null {
            const title = node.title?.toString().toLowerCase() || '';
            const isMatch = title.includes(searchLower);

            // 过滤子节点
            let filteredChildren: IGeoTreeItem<IGeoStarSystemData>[] = [];
            if (node.children && node.children.length > 0) {
                node.children.forEach((child) => {
                    const filteredChild = filterNode(child);
                    if (filteredChild) {
                        filteredChildren.push(filteredChild);
                    }
                });
            }

            // 如果当前节点匹配或有匹配的子节点，则保留该节点
            if (isMatch || filteredChildren.length > 0) {
                return {
                    ...node,
                    children: filteredChildren.length > 0 ? filteredChildren : node.children,
                };
            }

            return null;
        }

        const filtered: IGeoTreeItem<IGeoStarSystemData>[] = [];
        data.forEach((node) => {
            const filteredNode = filterNode(node);
            if (filteredNode) {
                filtered.push(filteredNode);
            }
        });

        return filtered;
    }

    /**
     * 获取包含匹配项的节点及其所有父节点的 key
     */
    function getExpandedKeysForSearch(
        data: IGeoTreeItem<IGeoStarSystemData>[],
        searchValue: string
    ): Key[] {
        if (!searchValue) {
            return [];
        }

        const searchLower = searchValue.toLowerCase();
        const expandedKeys: Key[] = [];

        function traverse(node: IGeoTreeItem<IGeoStarSystemData>, parentKeys: Key[] = []) {
            const title = node.title?.toString().toLowerCase() || '';
            const isMatch = title.includes(searchLower);

            if (isMatch) {
                // 如果当前节点匹配，展开所有父节点
                expandedKeys.push(...parentKeys);
                expandedKeys.push(node.key);
            }

            if (node.children && node.children.length > 0) {
                const currentParentKeys = [...parentKeys, node.key];
                node.children.forEach((child) => {
                    traverse(child, currentParentKeys);
                });
            }
        }

        data.forEach((node) => {
            traverse(node);
        });

        // 去重
        return Array.from(new Set(expandedKeys));
    }

    /**
     * 高亮匹配的文本
     */
    function highlightText(text: string, searchValue: string): React.ReactNode {
        if (!searchValue) {
            return text;
        }

        const searchLower = searchValue.toLowerCase();
        const textLower = text.toLowerCase();
        const index = textLower.indexOf(searchLower);

        if (index === -1) {
            return text;
        }

        const before = text.substring(0, index);
        const match = text.substring(index, index + searchValue.length);
        const after = text.substring(index + searchValue.length);

        return (
            <>
                {before}
                <span style={{ backgroundColor: '#ffc069', fontWeight: 'bold' }}>{match}</span>
                {after}
            </>
        );
    }

    // 根据搜索值过滤树数据
    const filteredTreeData = useMemo(() => {
        return filterTreeData(originalTreeData, searchValue);
    }, [originalTreeData, searchValue]);

    // 当搜索值变化时，自动展开包含匹配项的节点
    useEffect(() => {
        if (searchValue) {
            const keys = getExpandedKeysForSearch(originalTreeData, searchValue);
            setExpandedKeys(keys);
        } else {
            // 如果没有搜索值，恢复默认展开状态
            resetExpandedKeys(originalTreeData);
        }
    }, [searchValue, originalTreeData]);

    // 更新显示的树数据
    useEffect(() => {
        setTreeData(filteredTreeData);
    }, [filteredTreeData]);

    function renderNode(nodeData: any) {
        // let hasChildren = nodeData?.children && nodeData?.children.length > 0;
        let hasDocument = nodeData?.data?.dify_document_id && nodeData?.data?.dify_dataset_id;

        let hasRefDocument = !hasDocument && nodeData?.data?.described_in_llm;

        const titleText = nodeData?.title?.toString() || '';
        const highlightedTitle = searchValue ? highlightText(titleText, searchValue) : titleText;

        return (
            <>
                <span>{highlightedTitle}</span>
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
            <div style={{ marginBottom: 8, width: '100%', display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input
                    placeholder="搜索节点名称..."
                    prefix={<SearchOutlined />}
                    allowClear
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    style={{ flex: 1 }}
                    size="small"
                />
                <Button
                    size="small"
                    onClick={collapseAll}
                >
                    收起全部
                </Button>
            </div>
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