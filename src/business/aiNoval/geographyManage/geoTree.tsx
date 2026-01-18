import { Button, Tree, message, Input, Tag, Space } from 'antd';
import { IGeoStarSystemData } from '@/src/types/IAiNoval';
import React, { Key, useEffect, useRef, useState, useMemo } from 'react';
import { type IGeoTreeItem, loadGeoTree } from '../common/geoDataUtil';
import { CheckOutlined, CheckCircleOutlined, IssuesCloseOutlined, SearchOutlined } from '@ant-design/icons';
import { useGeoData } from './GeoDataProvider';
import { useManageState } from './ManageStateProvider';

interface IGeoTreeProps {
    
}


export type { IGeoTreeItem };

export default function(props: IGeoTreeProps) {

    const { state: geoDataState } = useGeoData();
    const { geoTree } = geoDataState;

    const { state: manageState, setTreeRaisedObject } = useManageState();
    const { treeRaisedObject } = manageState;

    let [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
    let [searchValue, setSearchValue] = useState<string>('');

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

        // 添加根级
        expandedKeys.push(...starSystemData.map((item) => item.key));

        // 添加第一层
        expandedKeys.push(...starSystemData.flatMap((item) => item.children?.map((child) => child.key) || []));

        // 由于根级和第一层都展开，所以显示出来就是展开到第二层

        setExpandedKeys(expandedKeys);
    }

    /**
     * 过滤树数据：根据搜索关键词过滤树节点
     */
    function filterTreeData(
        data: IGeoTreeItem<IGeoStarSystemData>[],
        searchValue: string
    ): IGeoTreeItem<IGeoStarSystemData>[] {
        if (!(typeof searchValue === 'string') || searchValue.length === 0) {
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
        console.log('geoTree', geoTree);

        return filterTreeData(geoTree || [], searchValue);
    }, [geoTree, searchValue]);

    // 当搜索值或者树数据变化时，自动展开包含匹配项的节点
    useEffect(() => {
        if (searchValue) {
            const keys = getExpandedKeysForSearch(geoTree || [], searchValue);
            setExpandedKeys(keys);
        } else {
            // 如果没有搜索值，恢复默认展开状态
            resetExpandedKeys(geoTree || []);
        }
    }, [searchValue, geoTree]);

    function renderNode(nodeData: any) {
        let hasDocument = nodeData?.data?.dify_document_id && nodeData?.data?.dify_dataset_id;

        let hasRefDocument = !hasDocument && nodeData?.data?.described_in_llm;

        const titleText = nodeData?.title?.toString() || '';
        const highlightedTitle = searchValue ? highlightText(titleText, searchValue) : titleText;

        return (
            <Space>
                <span>{highlightedTitle}</span>
                <Tag>{nodeData.data.code}</Tag>
                {hasDocument ? <span style={{color: 'green'}}>
                    <CheckCircleOutlined />
                </span> : null}
                {hasRefDocument ? <span style={{color: 'orange'}}>
                    <IssuesCloseOutlined />
                </span> : null}
            </Space>
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
                treeData={filteredTreeData}
                titleRender={renderNode}
                expandedKeys={expandedKeys}
                onExpand={handleExpand}
                onSelect={(selectedKeys, info) => {
                    setTreeRaisedObject(info.node);
                }}
            >
            </Tree>
        </div>
    );
}