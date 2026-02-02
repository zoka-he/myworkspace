'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { message, Typography } from 'antd'
import apiCalls from '../apiCalls';
import styles from './factionRelationPanel.module.scss';
import * as echarts from 'echarts';
import { IFactionDefData, IFactionRelation } from '@/src/types/IAiNoval';
import _ from 'lodash';
import { useCurrentFactionId } from '../FactionManageContext';
import { getRelationTypeText } from '../utils/relationTypeMap';

const {
  Title,
  Text
} = Typography;

interface D3FactionViewProps {
  factions: IFactionDefData[];
  factionRelations: IFactionRelation[];
}

export function D3FactionView({ factions = [], factionRelations = [] }: D3FactionViewProps) {
  return (
    <div className={`${styles.container}`}>
      <EChartsFactionView factions={factions} factionRelations={factionRelations} />
    </div>
  )
}

export function EChartsFactionView({ factions, factionRelations }: D3FactionViewProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts>(null);
  const [currentFactionId, setCurrentFactionId] = useCurrentFactionId();
  const setCurrentFactionIdRef = useRef(setCurrentFactionId);

  // 保持 setCurrentFactionId 引用最新
  useEffect(() => {
    setCurrentFactionIdRef.current = setCurrentFactionId;
  }, [setCurrentFactionId]);

  // 初始化图表
  useEffect(() => {
    if (!divRef.current) return;

    const chart = echarts.init(divRef.current);
    chartRef.current = chart;
    
    // 添加点击事件监听器
    chart.on('click', (params: any) => {
      // 只处理节点点击，忽略边的点击
      if (params.dataType === 'node' && params.data) {
        const nodeId = params.data.id;
        // 过滤掉占位节点（ID < 0）
        if (nodeId >= 0) {
          setCurrentFactionIdRef.current(nodeId);
        }
      }
    });
    
    // 窗口大小改变时重新调整大小
    const handleResize = () => {
      chartRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.off('click'); // 移除点击事件监听器
      chart.dispose();
    };
  }, [divRef]);

  // 当 factions 或 factionRelations 变化时更新图表
  useEffect(() => {
    if (!chartRef.current) return;
    updateChart();
  }, [factions, factionRelations]);

  function getFactionRootId(faction: IFactionDefData, factionsList: IFactionDefData[], depth: number = 0) {
    if (!faction || typeof faction.parent_id === 'undefined' || faction.parent_id === null) {
      return faction?.id;
    }

    let parent = factionsList.find(f => f.id === faction.parent_id);
    if (!parent) {
      return faction.id;
    }

    return getFactionRootId(parent, factionsList, depth + 1);
  }

  function getFactionDepth(faction: IFactionDefData, factionsList: IFactionDefData[], depth: number = 0) {
    if (!faction || typeof faction.parent_id === 'undefined' || faction.parent_id === null) {
      return depth;
    } 

    let parent = factionsList.find(f => f.id === faction.parent_id);
    if (!parent) {
      return depth;
    }

    return getFactionDepth(parent, factionsList, depth + 1);
  }

  function processData() {
    const currentFactions = factions;
    
    const processedData = currentFactions.map((faction) => {
      const rootId = getFactionRootId(faction, currentFactions);
      const depth = getFactionDepth(faction, currentFactions);
      return {
        name: faction.name,
        value: faction.name,
        id: Number(faction.id),
        parentId: faction.parent_id,
        rootId: rootId,
        symbolSize: 15 - depth * 2,
      };
    });
    
    // 改进排序：让 parent 和 children 尽量靠在一起，不同 rootId 组之间拉开间距
    // 使用深度优先的方式，先排父节点，再排其子节点
    const sortedData: typeof processedData = [];
    const processedSet = new Set<number>();
    
    // 按 rootId 分组
    const rootGroups = new Map<number | null, typeof processedData>();
    processedData.forEach(node => {
      const rootId = node.rootId;
      if (!rootGroups.has(rootId)) {
        rootGroups.set(rootId, []);
      }
      rootGroups.get(rootId)!.push(node);
    });
    
    // 对每个 rootId 组进行排序
    const groupSizes: number[] = [];
    rootGroups.forEach((group, rootId) => {
      // 创建 id 到节点的映射
      const nodeMap = new Map<number, typeof processedData[0]>();
      group.forEach(node => {
        nodeMap.set(node.id, node);
      });
      
      // 找到所有根节点（没有 parentId 或 parentId 不在当前组中）
      const rootNodes = group.filter(node => {
        if (!node.parentId) return true;
        return !nodeMap.has(node.parentId);
      });
      
      // 深度优先遍历：递归添加节点及其子节点
      const groupStartIndex = sortedData.length;
      const addNodeAndChildren = (node: typeof processedData[0]) => {
        if (processedSet.has(node.id)) return;
        
        sortedData.push(node);
        processedSet.add(node.id);
        
        // 添加所有子节点
        const children = group.filter(n => n.parentId === node.id);
        children.forEach(child => addNodeAndChildren(child));
      };
      
      // 对根节点排序后，依次添加其子树
      rootNodes.sort((a, b) => a.id - b.id);
      rootNodes.forEach(root => addNodeAndChildren(root));
      
      // 记录当前组的节点数量
      groupSizes.push(sortedData.length - groupStartIndex);
    });
    
    // 在不同 rootId 组之间插入占位节点来拉开间距
    // 占位节点不显示，只用于增加间距
    const spacingNodesPerGroup = 3; // 每组之间插入3个占位节点
    const finalData: typeof processedData = [];
    let groupIndex = 0;
    let currentGroupStart = 0;
    
    rootGroups.forEach((group, rootId) => {
      const groupSize = groupSizes[groupIndex];
      const groupNodes = sortedData.slice(currentGroupStart, currentGroupStart + groupSize);
      
      // 如果不是第一组，添加占位节点
      if (groupIndex > 0) {
        for (let i = 0; i < spacingNodesPerGroup; i++) {
          finalData.push({
            name: '',
            value: '',
            id: -1000 - groupIndex * 100 - i, // 使用负数 ID 避免冲突
            parentId: null,
            rootId: null,
            symbolSize: 0, // 大小为0，不显示
          } as any);
        }
      }
      
      // 添加当前组的节点
      finalData.push(...groupNodes);
      
      currentGroupStart += groupSize;
      groupIndex++;
    });
    
    return finalData;
  }

  function updateChart() {
    if (!chartRef.current) return;

    const processedData = processData();
    
    // 为不同的 rootId 生成颜色映射
    const rootIdSet = new Set(processedData.map(node => node.rootId));
    const rootIdArray = Array.from(rootIdSet).sort((a, b) => Number(a) - Number(b));
    
    // 使用颜色调色板，为每个 rootId 分配不同的颜色
    const colorPalette = [
      '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
      '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ff9f7f',
      '#ffdb5c', '#ff6e76', '#e690d1', '#7c7ce0', '#dd6b66',
      '#759aa0', '#e69d87', '#8dc1a9', '#ea7ccc', '#ffd93d'
    ];
    
    const rootIdColorMap = new Map<number, string>();
    rootIdArray.forEach((rootId, index) => {
      rootIdColorMap.set(Number(rootId), colorPalette[index % colorPalette.length]);
    });
    
    // 为每个节点添加颜色和 category（只处理真实节点）
    processedData.forEach(node => {
      // 占位节点跳过
      if (node.id < 0) {
        (node as any).itemStyle = {
          opacity: 0, // 完全透明，不显示
        };
        return;
      }
      
      const rootId = Number(node.rootId);
      const color = rootIdColorMap.get(rootId) || '#d9d9d9';
      // 添加 itemStyle 来设置节点颜色
      (node as any).itemStyle = {
        color: color,
        borderColor: '#fff',
        borderWidth: 1,
      };
      // 设置 category 用于分组（ECharts graph 使用 category 来分组节点）
      (node as any).category = rootIdArray.indexOf(rootId);
    });
    
    // 创建节点 ID 到索引的映射
    // 注意：ECharts graph 在使用 id 或 name 匹配时可能存在 bug，使用索引是最可靠的方式
    const nodeIdToIndexMap = new Map<number, number>();
    processedData.forEach((node, index) => {
      // 只映射真实节点（ID >= 0），占位节点（ID < 0）不参与链接
      if (node.id >= 0) {
        nodeIdToIndexMap.set(Number(node.id), index);
      }
    });
    
    // 创建节点 ID 集合和映射，用于快速检查节点是否存在（只包含真实节点）
    const realNodes = processedData.filter(node => node.id >= 0);
    const nodeIdSet = new Set(realNodes.map(node => Number(node.id)));
    const nodeIdMap = new Map(realNodes.map(node => [Number(node.id), node]));
    
    // 根据关系强度计算颜色：0=红色，50=淡黄色，100=蓝色，平滑渐变
    const getRelationColor = (strength: number): string => {
      // 将强度从 0-100 映射到颜色
      // 0 -> 红色 (#ef4444)
      // 50 -> 淡黄色 (#fbbf24)
      // 100 -> 蓝色 (#3b82f6)
      const normalized = Math.max(0, Math.min(100, strength)) / 100;
      
      let r, g, b;
      
      if (normalized <= 0.5) {
        // 红色到淡黄色 (0 -> 0.5)
        const t = normalized * 2; // 0 -> 1
        // 红色: rgb(239, 68, 68) -> 淡黄色: rgb(255, 233, 178)
        r = Math.round(239 + (255 - 239) * t);
        g = Math.round(68 + (233 - 68) * t);
        b = Math.round(68 + (178 - 68) * t);
      } else {
        // 淡黄色到蓝色 (0.5 -> 1)
        const t = (normalized - 0.5) * 2; // 0 -> 1
        // 淡黄色: rgb(255, 233, 178) -> 蓝色: rgb(151, 231, 255)
        r = Math.round(255 + (151 - 255) * t);
        g = Math.round(233 + (231 - 233) * t);
        b = Math.round(178 + (255 - 178) * t);
      }
      
      return `rgb(${r}, ${g}, ${b})`;
    };
    
    // 根据关系强度计算线宽：50最细，0和100最粗
    const getRelationWidth = (strength: number): number => {
      // 距离50的绝对值，范围是 0-50
      const distanceFrom50 = Math.abs(strength - 50);
      // 归一化到 0-1
      const normalized = distanceFrom50 / 50;
      // 最小宽度 1，最大宽度 5
      const minWidth = 0.5;
      const maxWidth = 3;
      return minWidth + (maxWidth - minWidth) * normalized;
    };

    // 处理 links：统一使用数字类型的 id
    // ECharts graph 在使用 id 时，需要确保 id 类型一致
    const validLinks = ((factionRelations || []) as IFactionRelation[])
      .filter(relation => {
        // 统一转换为数字进行比较
        const sourceId = Number(relation.source_faction_id);
        const targetId = Number(relation.target_faction_id);
        
        const sourceExists = nodeIdSet.has(sourceId);
        const targetExists = nodeIdSet.has(targetId);
        
        // 静默过滤无效链接（节点不存在）
        
        return sourceExists && targetExists;
      })
      .map(relation => {
        // 统一转换为数字类型，确保与节点 id 类型一致
        const sourceId = Number(relation.source_faction_id);
        const targetId = Number(relation.target_faction_id);
        
        const sourceNode = nodeIdMap.get(sourceId);
        const targetNode = nodeIdMap.get(targetId);
        
        if (!sourceNode || !targetNode) {
          return null;
        }
        
        const sourceIndex = nodeIdToIndexMap.get(sourceId);
        const targetIndex = nodeIdToIndexMap.get(targetId);
        
        if (sourceIndex === undefined || targetIndex === undefined) {
          return null;
        }
        
        const strength = relation.relation_strength;
        return {
          source: sourceIndex, // 使用节点的索引（数字）- ECharts graph 最可靠的方式
          target: targetIndex, // 使用节点的索引（数字）- ECharts graph 最可靠的方式
          value: strength,
          label: {
            show: true,
            formatter: getRelationTypeText(relation.relation_type), // 显示中文关系类型
          },
          relationType: relation.relation_type, // 保留原始英文类型用于内部处理
          relationTypeText: getRelationTypeText(relation.relation_type), // 添加中文文本字段
          relationStrength: strength,
          lineStyle: {
            color: getRelationColor(strength), // 根据强度设置颜色：0=红色，100=蓝色
            width: getRelationWidth(strength), // 根据强度设置宽度：50最细，0和100最粗
            opacity: 0.8,
            curveness: 0.2,
          },
        };
      })
      .filter(link => link !== null);

    // 为所有 parent-child 关系添加 links
    const parentChildLinks = processedData
      .filter(node => node.parentId != null)
      .map(node => {
        const childId = Number(node.id);
        const parentId = Number(node.parentId);
        
        const childIndex = nodeIdToIndexMap.get(childId);
        const parentIndex = nodeIdToIndexMap.get(parentId);
        
        if (childIndex === undefined || parentIndex === undefined) {
          return null;
        }
        
        return {
          source: parentIndex, // parent 节点索引
          target: childIndex,   // child 节点索引
          value: 100, // parent-child 关系强度设为 100
          label: {
            show: false, // 不显示标签，避免混乱
          },
          relationType: 'parent-child',
          relationStrength: 100,
          lineStyle: {
            color: '#999999', // 灰色虚线表示层级关系
            width: 1,
            opacity: 0.5,
            curveness: 0.1,
            type: 'dashed', // 虚线样式
          },
        };
      })
      .filter(link => link !== null);

    // 合并关系 links 和 parent-child links
    const allLinks = [...validLinks, ...parentChildLinks];

    chartRef.current.setOption({
      title: {
        text: '阵营关系图',
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'edge') {
            // 边的提示信息：显示中文关系类型
            const relationTypeText = params.data.relationTypeText || getRelationTypeText(params.data.relationType || 'neutral');
            const sourceName = processedData[params.data.source]?.name || '';
            const targetName = processedData[params.data.target]?.name || '';
            return `${sourceName} → ${targetName}<br/>关系: ${relationTypeText}<br/>强度: ${params.data.relationStrength}`;
          } else {
            // 节点的提示信息
            return `${params.data.name}<br/>ID: ${params.data.id}`;
          }
        },
      },
      series: [{
        type: 'graph',
        layout: 'circular',
        circular: {
          rotateLabel: true,
        },
        roam: true, // 允许缩放和平移
        focusNodeAdjacency: true, // 鼠标悬停时高亮相邻节点和边
        // 明确指定使用 id 字段进行匹配
        id: 'factionGraph',
        label: {
          show: true, // 显示节点标签
          position: 'right',
          formatter: '{b}', // 显示节点名称
        },
        // 根据 rootId 设置不同的颜色类别
        // categories 数组的索引对应节点的 category 值
        categories: rootIdArray.map((rootId, index) => ({
          name: `Root ${rootId}`, // 类别名称，可以显示在图例中
          itemStyle: {
            color: rootIdColorMap.get(Number(rootId)) || '#d9d9d9',
          },
        })),
        data: processedData.map(node => {
          // 占位节点设置为不可见
          if (node.id < 0) {
            return {
              ...node,
              symbolSize: 0, // 大小为0，不显示
              itemStyle: {
                opacity: 0, // 完全透明
              },
            };
          }
          return node;
        }),
        links: allLinks, // 合并后的所有链接（关系链接 + parent-child 链接）
        // 确保 ECharts 使用 id 字段进行匹配
        // 如果使用 id，links 的 source/target 必须与 data 中节点的 id 完全匹配（每个 link 已包含 lineStyle 颜色配置）
        // 全局 lineStyle 作为默认值（如果 link 对象中没有设置 lineStyle，会使用这个）
        lineStyle: {
          color: '#d9d9d9', // 默认灰色
          width: 1,
          opacity: 0.8,
          curveness: 0.3, // 曲线度
        },
        edgeLabel: {
          show: true, // 显示边的标签
          formatter: '{c}', // 显示关系类型
          fontSize: 10,
        },
        emphasis: {
          // 高亮样式
          focus: 'adjacency',
          lineStyle: {
            width: 4,
            opacity: 1,
          },
        },
      }]
    }, true); // 第二个参数 true 表示不合并，完全替换配置，确保 links 被正确更新
  }

  return (
    <div ref={divRef} className="w-full h-full"></div>
  )
}