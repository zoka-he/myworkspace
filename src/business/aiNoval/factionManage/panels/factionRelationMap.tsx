'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { message } from 'antd'
import apiCalls from '../apiCalls';

// 阵营基础数据结构
interface Faction {
  id: string          // 阵营ID
  name: string        // 阵营名称
  parentId: string | null  // 父阵营ID，null表示根阵营
}

// 阵营层级数据结构，用于构建树形结构
interface HierarchyFaction extends Faction {
  children?: HierarchyFaction[]  // 子阵营数组
  value?: number                 // 节点值，用于计算大小
  depth?: number                 // 节点深度
}

// 组件属性接口
interface D3FactionViewProps {
  worldViewId: string      // 世界视图ID
  updateTimestamp: number  // 更新时间戳，用于触发重新渲染
}

export function D3FactionView({ worldViewId, updateTimestamp }: D3FactionViewProps) {
  // SVG元素引用
  const svgRef = useRef<SVGSVGElement>(null)
  // 阵营数据状态
  const [factions, setFactions] = useState<Faction[]>([])

  // 获取阵营数据
  useEffect(() => {
    const fetchFactions = async () => {
      try {
        const response = await apiCalls.getFactionList(Number(worldViewId));
        if (response?.data) {
          // 确保数据格式正确
          const factionData = response.data.map((faction: any) => ({
            id: faction.id.toString(),
            name: faction.name,
            parentId: faction.parent_id ? faction.parent_id.toString() : null,
          }));
          setFactions(factionData);
        } else {
          message.error('获取阵营数据失败：数据格式错误');
        }
      } catch (error) {
        message.error('获取阵营数据失败');
        console.error('Error fetching factions:', error)
      }
    }

    fetchFactions()
  }, [worldViewId, updateTimestamp])

  // 渲染阵营关系图
  useEffect(() => {
    if (!svgRef.current || factions.length === 0) return

    // 清除之前的SVG内容
    d3.select(svgRef.current).selectAll('*').remove()

    // 设置SVG尺寸和边距
    const width = 800
    const height = 600
    const margin = { top: 30, right: 30, bottom: 30, left: 30 }

    // 创建SVG容器
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // 创建根阵营节点
    const rootFaction: HierarchyFaction = {
      id: 'root',
      name: 'Root',
      parentId: null,
      children: [],
      value: 1,  // 给根节点一个基础值
      depth: 0   // 根节点深度为0
    }

    // 使用Map存储所有阵营节点，提高查找效率
    const factionMap = new Map<string, HierarchyFaction>()
    factionMap.set('root', rootFaction)

    // 第一步：创建所有阵营节点
    factions.forEach(faction => {
      factionMap.set(faction.id, {
        ...faction,
        children: [],
        value: 1,  // 给每个节点一个基础值
      })
    })

    // 第二步：建立父子关系
    // 先收集所有根节点
    const rootFactions = factions.filter(faction => !faction.parentId)
    // 随机打乱根节点顺序
    const shuffledRootFactions = rootFactions.sort(() => Math.random() - 0.5)
    
    // 先处理根节点
    shuffledRootFactions.forEach(faction => {
      const node = factionMap.get(faction.id)!
      rootFaction.children!.push(node)
    })
    
    // 再处理其他节点
    factions.forEach(faction => {
      if (faction.parentId) {
        const node = factionMap.get(faction.id)!
        const parent = factionMap.get(faction.parentId)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(node)
        }
      }
    })

    // 第三步：遍历树形结构，设置深度
    function setNodeDepth(node: HierarchyFaction, depth: number) {
      node.depth = depth
      if (node.children) {
        node.children.forEach(child => setNodeDepth(child, depth + 1))
      }
    }
    setNodeDepth(rootFaction, 0)

    // 创建D3层级结构
    const root = d3.hierarchy<HierarchyFaction>(rootFaction)
      .sum(d => {
        // 根据节点类型和子节点数量设置值
        if (d.children && d.children.length > 0) {
          // 父节点的值要大于所有子节点的值之和
          return Math.max(d.children.length * 2, 3)
        }
        // 叶子节点的值较小
        return 1
      })

    // 创建圆形布局
    const pack = d3.pack<HierarchyFaction>()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
      .padding(100)  // 增加圆形之间的间距

    // 计算每个阵营的位置和大小
    const rootNode = pack(root)

    // 按深度排序节点
    const sortedNodes = rootNode.descendants()
      .slice(1)  // 跳过根节点
      .sort((a, b) => (a.data.depth || 0) - (b.data.depth || 0))

    // 创建颜色比例尺
    const maxDepth = d3.max(rootNode.descendants(), d => d.data.depth) || 0
    
    // 为每个根节点分配一个随机色相，并计算其子树的最大深度
    const rootHues = new Map<string, number>()
    const rootMaxDepths = new Map<string, number>()
    
    rootFaction.children?.forEach(rootChild => {
      rootHues.set(rootChild.id, Math.random() * 360)
      
      // 计算该根节点子树的最大深度
      const rootNode = sortedNodes.find(n => n.data.id === rootChild.id)
      if (rootNode) {
        const rootNodes = getAllChildNodes(rootNode)
        const maxDepth = d3.max(rootNodes, d => d.data.depth) || 0
        rootMaxDepths.set(rootChild.id, maxDepth)
      }
    })
    
    // 创建默认颜色比例尺（用于根节点）
    const defaultColorScale = d3.scaleSequential()
      .domain([1, maxDepth])
      .interpolator(d3.interpolate('#e6f7ff', '#1890ff'))

    // 存储节点的随机偏移量
    const nodeOffsets = new Map<string, { x: number; y: number }>()

    // 创建阵营节点组
    const node = svg.append('g')
      .selectAll('g')
      .data(sortedNodes)
      .enter()
      .append('g')
      .attr('transform', d => {
        // 添加随机偏移
        const randomAngle = Math.random() * Math.PI * 2
        const randomDistance = Math.random() * 10 // 最大偏移12像素
        const offsetX = Math.cos(randomAngle) * randomDistance
        const offsetY = Math.sin(randomAngle) * randomDistance
        // 存储偏移量
        nodeOffsets.set(d.data.id, { x: offsetX, y: offsetY })
        return `translate(${d.x + offsetX},${d.y + offsetY})`
      })

    // 计算每个节点的半径
    const nodeRadius = node.data().map(d => {
      if (d.children && d.children.length > 0) {
        const maxChildRadius = Math.max(...d.children.map(child => child.r))
        return Math.max(d.r, maxChildRadius + 16)  // 父节点至少比最大子节点大20像素
      }
      return Math.max(d.r, 8)  // 叶子节点最小为8px
    })

    // 第一步：绘制所有圆形
    node.append('circle')
      .attr('r', (d, i) => nodeRadius[i])
      .attr('fill', d => {
        // 找到所属的根节点
        let current = d
        while (current.parent && current.parent.data.id !== 'root') {
          current = current.parent
        }
        
        // 获取根节点的色相和最大深度
        const hue = rootHues.get(current.data.id)
        const maxDepth = rootMaxDepths.get(current.data.id)
        
        if (hue !== undefined && maxDepth !== undefined) {
          // 使用HSL颜色空间，根据相对深度调整亮度
          const depth = d.data.depth || 0
          const lightness = 0.5 + 0.5 * (1 - depth / maxDepth )
          return d3.hsl(hue, 0.7, lightness).toString()
        }
        
        // 如果找不到对应的色相，使用默认颜色
        return defaultColorScale(d.data.depth || 0)
      })

    // 第二步：计算文本位置
    const textGroups = new Map<string, { x: number; y: number; nodes: any[]; isLeft: boolean }>()
    
    // 计算所有根节点的平均x位置
    const rootNodes = rootFaction.children?.map(child => 
      sortedNodes.find(n => n.data.id === child.id)
    ).filter(Boolean) || []
    
    const avgRootX = rootNodes.reduce((sum, node) => sum + node!.x, 0) / rootNodes.length
    
    // 递归获取所有子节点
    function getAllChildNodes(node: any): any[] {
      const children = sortedNodes.filter(n => n.data.parentId === node.data.id)
      return [node, ...children.flatMap(getAllChildNodes)]
    }
    
    // 收集左右两侧的根节点
    const leftRoots: { node: any; y: number; size: number }[] = []
    const rightRoots: { node: any; y: number; size: number }[] = []
    
    // 为每个根阵营创建文本组
    rootFaction.children?.forEach((rootChild, rootIndex) => {
      const rootNode = sortedNodes.find(n => n.data.id === rootChild.id)
      if (rootNode) {
        const rootIndex = sortedNodes.indexOf(rootNode)
        const offset = nodeOffsets.get(rootNode.data.id) || { x: 0, y: 0 }
        const nodeX = rootNode.x + offset.x
        const nodeY = rootNode.y + offset.y
        
        // 根据当前根节点相对于平均x值的位置决定文本位置
        const isLeftSide = nodeX < avgRootX
        
        // 收集该根阵营及其所有子阵营的节点
        const groupNodes = getAllChildNodes(rootNode)
        
        // 将根节点添加到对应的数组中，同时记录文本组大小
        if (isLeftSide) {
          leftRoots.push({ node: rootNode, y: nodeY, size: groupNodes.length })
        } else {
          rightRoots.push({ node: rootNode, y: nodeY, size: groupNodes.length })
        }
        
        textGroups.set(rootChild.id, {
          x: isLeftSide ? 100 : width - 150,
          y: nodeY,
          nodes: groupNodes,
          isLeft: isLeftSide
        })
      }
    })
    
    // 对左右两侧的根节点按y值排序
    leftRoots.sort((a, b) => a.y - b.y)
    rightRoots.sort((a, b) => a.y - b.y)

    const groupHeight = 40
    
    // 计算左右两侧文本组的总高度（包括组间距）
    const leftTotalHeight = leftRoots.reduce((sum, root) => sum + root.size * 20, 0) + (leftRoots.length - 1) * groupHeight
    const rightTotalHeight = rightRoots.reduce((sum, root) => sum + root.size * 20, 0) + (rightRoots.length - 1) * groupHeight
    
    // 计算左右两侧文本组的起始位置
    const leftStartY = (height - leftTotalHeight) / 2
    const rightStartY = (height - rightTotalHeight) / 2
    
    // 重新设置左右两侧文本组的位置
    let currentLeftY = leftStartY
    leftRoots.forEach((root, index) => {
      const group = textGroups.get(root.node.data.id)
      if (group) {
        group.y = currentLeftY
        currentLeftY += root.size * 20 + (index < leftRoots.length - 1 ? groupHeight : 0)
      }
    })
    
    let currentRightY = rightStartY
    rightRoots.forEach((root, index) => {
      const group = textGroups.get(root.node.data.id)
      if (group) {
        group.y = currentRightY
        currentRightY += root.size * 20 + (index < rightRoots.length - 1 ? groupHeight : 0)
      }
    })

    // 第三步：绘制跳线
    textGroups.forEach((group, rootId) => {
      group.nodes.forEach((node, index) => {
        const nodeIndex = sortedNodes.indexOf(node)
        if (nodeIndex === -1) return // 跳过无效节点
        
        const radius = nodeRadius[nodeIndex]
        const textY = group.y + index * 20 // 垂直排列，每个文本间隔20像素
        
        // 获取节点的实际位置（包括随机偏移）
        const offset = nodeOffsets.get(node.data.id) || { x: 0, y: 0 }
        const nodeX = node.x + offset.x
        const nodeY = node.y + offset.y
        
        // 计算从圆心到文本的角度
        const endX = group.isLeft ? group.x + 5 : group.x - 5
        const endY = textY
        const dx = endX - nodeX
        const dy = endY - nodeY
        const angle = Math.atan2(dy, dx)
        
        // 计算圆形边缘的起点
        const startX = nodeX + Math.cos(angle) * radius
        const startY = nodeY + Math.sin(angle) * radius
        
        // 创建跳线路径
        const path = d3.path()
        path.moveTo(startX, startY)
        path.lineTo(endX, endY)
        
        svg.append('path')
          .attr('d', path.toString())
          .attr('stroke', '#aaaaaa')
          .attr('stroke-width', 0.5)
          .attr('fill', 'none')
      })
    })

    // 第四步：绘制所有文本
    textGroups.forEach((group, rootId) => {
      group.nodes.forEach((node, index) => {
        const nodeIndex = sortedNodes.indexOf(node)
        if (nodeIndex === -1) return // 跳过无效节点
        
        const textY = group.y + index * 20 // 垂直排列，每个文本间隔20像素
        
        svg.append('text')
          .attr('x', group.x)
          .attr('y', textY)
          .style('text-anchor', group.isLeft ? 'end' : 'start')
          .text(node.data.name)
          .style('font-size', () => {
            // 根节点使用14px，其他节点使用10px
            return node.data.parentId === null ? '14px' : '10px'
          })
          .style('fill', '#333333')
          .style('pointer-events', 'none')
      })
    })

  }, [factions])

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  )
}