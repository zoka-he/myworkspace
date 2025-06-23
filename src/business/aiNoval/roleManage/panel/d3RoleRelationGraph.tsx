'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { SimulationNodeDatum } from 'd3'
import type { IRoleRelation, IRoleData, IRoleInfo } from '@/src/types/IAiNoval'
import { RELATION_TYPES } from '@/src/types/IAiNoval'
import apiCalls from '../../../aiNoval/roleManage/apiCalls'

interface RoleNode extends SimulationNodeDatum {
  id: string
  name: string
  type: string
  faction_id?: number | null
  x?: number
  y?: number
}

interface RoleLink extends d3.SimulationLinkDatum<RoleNode> {
  source: RoleNode
  target: RoleNode
  relations: IRoleRelation[]
}

interface RoleGraphData {
  nodes: IRoleData[]
  relations: IRoleRelation[]
}

interface D3RoleRelationGraphProps {
  worldview_id: string
  updateTimestamp?: number
  onNodeClick?: (roleId: string) => void
}

export function D3RoleRelationGraph({ 
  worldview_id,
  updateTimestamp,
  onNodeClick
}: D3RoleRelationGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return

    console.debug('D3RoleRelationGraph useEffect onInit --->> ', containerRef.current);

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDimensions({ width, height })
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Handle graph rendering
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return
    console.debug('D3RoleRelationGraph useEffect --->> ', [worldview_id, dimensions.width, dimensions.height, updateTimestamp]);

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove()

    // Create SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Create a group for the graph
    const g = svg.append('g')

    // Create simulation
    const simulation = d3.forceSimulation<RoleNode>()
      .force('link', d3.forceLink<RoleNode, RoleLink>()
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))

    // 获取数据
    Promise.all([
      apiCalls.getRoleList(Number(worldview_id)),
      apiCalls.getWorldViewRoleRelationList(Number(worldview_id)),
      apiCalls.getWorldViewRoleInfoList(Number(worldview_id), 200)
    ]).then(([roleRes, relationRes, roleInfoRes]) => {
      const data: RoleGraphData = {
        nodes: roleRes.data,
        relations: relationRes.data
      }

      // Create a map of role info by role_id
      const roleInfoMap = new Map<number, IRoleInfo>()
      roleInfoRes.data.forEach((info: IRoleInfo) => {
        if (info.role_id) {
          roleInfoMap.set(info.role_id, info)
        }
      })

      // Convert IRoleData to RoleNode with faction information
      const roleNodes: RoleNode[] = data.nodes.map(role => {
        const roleInfo = role.id ? roleInfoMap.get(role.id) : null
        return {
          id: role.id?.toString() || '',
          name: role.name || '',
          type: 'role',
          faction_id: roleInfo?.faction_id || null
        }
      })

      // Process relations to create links
      const linkMap = new Map<string, RoleLink>()
      
      data.relations.forEach(relation => {
        const key = [relation.role_id, relation.related_role_id].sort().join('-')
        if (!linkMap.has(key)) {
          linkMap.set(key, {
            source: roleNodes.find(n => n.id === relation.related_role_id?.toString())!,
            target: roleNodes.find(n => n.id === relation.role_id?.toString())!,
            relations: []
          })
        }
        linkMap.get(key)!.relations.push(relation)
      })

      const links = Array.from(linkMap.values())

      // Update simulation forces
      simulation
        .force('link', d3.forceLink<RoleNode, RoleLink>()
          .id(d => d.id)
          .distance(d => {
            // 计算双边关系的之和
            const strength = d.relations.reduce((acc, r) => {
              const strength1 = r.relation_strength || 35
              const strength2 = d.relations.find(r2 => 
                r2.role_id === r.related_role_id && r2.related_role_id === r.role_id
              )?.relation_strength || 35
              return strength1 + strength2;
            }, 0)
            
            // 将0-2000的范围映射到600-20的距离范围
            // 关系越强，距离越近
            return 500 - (strength / 200) * 480
          })
          .strength(d => {
            // 计算双边关系的乘积
            const strength = d.relations.reduce((acc, r) => {
              const strength1 = r.relation_strength || 35
              const strength2 = d.relations.find(r2 => 
                r2.role_id === r.related_role_id && r2.related_role_id === r.role_id
              )?.relation_strength || 35
              return Math.min(0, strength1 + strength2 - 35) // 低于50表现为排斥
            }, 0)
            
            // 将0-200的范围映射到0.1-1的强度范围
            // 关系越强，引力越大
            return 0.1 + (strength / 200) * 0.9
          }))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
        // 添加同阵营节点之间的吸引力
        .force('faction', d3.forceManyBody<RoleNode>()
          .strength((d, i, nodes) => {
            // 计算当前节点与其他节点的力
            const node = nodes[i]
            // 如果是同一个节点，返回0
            if (d === node) return 0
            
            // 如果两个节点都有阵营ID且相同，则产生吸引力
            if (d.faction_id && node.faction_id && d.faction_id === node.faction_id) {
              return 0.7 // 同阵营节点之间的吸引力
            }
            
            // 其他情况返回默认的斥力
            return -0.4
          }))
        .alpha(1) // Restart the simulation with full alpha
        .restart() // Force restart to apply new center position

      // Create links with multiple relations
      const linkGroup = g.append('g')
        .selectAll<SVGGElement, RoleLink>('g')
        .data(links)
        .enter()
        .append('g')

      // Create arrow marker for one-way relationships
      svg.append('defs').selectAll('marker')
        .data(['arrow'])
        .enter().append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 15)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#999')

      // Create main link lines
      linkGroup.each(function(d) {
        const isTwoWay = d.relations.some(r1 => 
          d.relations.some(r2 => 
            r1.role_id === r2.related_role_id && r1.related_role_id === r2.role_id
          )
        )

        // Calculate combined strength
        const combinedStrength = d.relations.reduce((acc, r) => {
          const strength1 = r.relation_strength || 35
          const strength2 = d.relations.find(r2 => 
            r2.role_id === r.related_role_id && r2.related_role_id === r.role_id
          )?.relation_strength || 35
          return strength1 + strength2
        }, 0)

        // Set color based on relationship type and strength
        let linkColor = '#999'
        if (isTwoWay) {
          // For two-way relationships, use red if combined strength < 70
          linkColor = combinedStrength < 70 ? '#ff4d4f' : '#999'
        } else {
          // For one-way relationships, use red if any relation strength < 45
          const hasWeakRelation = d.relations.some(r => (r.relation_strength || 35) < 35)
          linkColor = hasWeakRelation ? '#ff4d4f' : '#999'
        }

        if (isTwoWay) {
          // 双向关系显示为双实线
          d3.select(this).append('line')
            .attr('stroke', linkColor)
            .attr('stroke-opacity', 0.4)
            .attr('stroke-width', 1)
            .attr('marker-end', null)

          d3.select(this).append('line')
            .attr('stroke', linkColor)
            .attr('stroke-opacity', 0.4)
            .attr('stroke-width', 1)
            .attr('marker-end', null)
        } else {
          // 单向关系显示为带箭头的线，箭头指向目标角色
          d3.select(this).append('line')
            .attr('stroke', linkColor)
            .attr('stroke-opacity', 0.4)
            .attr('stroke-width', 1)
            .attr('marker-end', 'url(#arrow)')
        }
      })

      // Create relation type labels
      linkGroup.append('text')
        .attr('dy', -5)
        .attr('text-anchor', 'middle')
        .text(d => {
          // 获取所有关系类型的中文标签
          const relationLabels = d.relations.map(r => {
            const relationType = RELATION_TYPES.find(t => t.value === r.relation_type)
            return relationType?.label || r.relation_type
          }).filter((label): label is string => label !== undefined)
          // 去重并合并
          return Array.from(new Set(relationLabels)).join(' / ')
        })
        .attr('font-size', 10)
        .attr('fill', '#666')

      // Create nodes with faction-based colors
      const node = g.append('g')
        .selectAll<SVGCircleElement, RoleNode>('circle')
        .data(roleNodes)
        .enter()
        .append('circle')
        .attr('r', 5)
        .attr('fill', d => {
          if (!d.faction_id) return '#999' // Gray for no faction
          // Generate a color based on faction_id
          const hue = (d.faction_id * 137.5) % 360 // Golden ratio to spread colors
          return `hsl(${hue}, 70%, 35%)`
        })
        .style('cursor', 'pointer') // 添加鼠标指针样式
        .on('click', (event, d) => {
          event.stopPropagation() // 阻止事件冒泡
          onNodeClick?.(d.id)
        })
        .call(d3.drag<SVGCircleElement, RoleNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended))

      // Add node labels with faction information
      const label = g.append('g')
        .selectAll<SVGTextElement, RoleNode>('text')
        .data(roleNodes)
        .enter()
        .append('text')
        .text(d => d.name)
        .attr('font-size', 12)
        .attr('dx', 12)
        .attr('dy', 4)
        .attr('fill', d => {
          if (!d.faction_id) return '#666' // Darker gray for no faction
          const hue = (d.faction_id * 137.5) % 360
          return `hsl(${hue}, 70%, 30%)` // Darker version of the node color
        })

      // Add tooltips for relations
      linkGroup.append('title')
        .text(d => {
          // 按关系类型分组
          const groupedRelations = d.relations.reduce((acc, r) => {
            const relationType = RELATION_TYPES.find(t => t.value === r.relation_type)
            const label = relationType?.label || r.relation_type
            if (label) {
              if (!acc[label]) {
                acc[label] = []
              }
              acc[label].push(r)
            }
            return acc
          }, {} as Record<string, IRoleRelation[]>)

          // 生成工具提示文本
          return Object.entries(groupedRelations).map(([label, relations]) => {
            const descriptions = relations.map(r => r.description).filter((desc): desc is string => desc !== undefined)
            return `${label}${descriptions.length > 0 ? ': ' + descriptions.join('; ') : ''}`
          }).join('\n')
        })

      // Update positions on simulation tick
      simulation.nodes(roleNodes).on('tick', () => {
        linkGroup.selectAll<SVGLineElement, RoleLink>('line')
          .attr('x1', d => d.source.x!)
          .attr('y1', d => d.source.y!)
          .attr('x2', d => d.target.x!)
          .attr('y2', d => d.target.y!)
          .each(function(d) {
            const isTwoWay = d.relations.some(r1 => 
              d.relations.some(r2 => 
                r1.role_id === r2.related_role_id && r1.related_role_id === r2.role_id
              )
            )
            if (isTwoWay) {
              // 调整双线的位置，使其看起来像两条平行的线
              const dx = d.target.x! - d.source.x!
              const dy = d.target.y! - d.source.y!
              const angle = Math.atan2(dy, dx)
              const offset = 3
              const offsetX = Math.sin(angle) * offset
              const offsetY = -Math.cos(angle) * offset

              const lines = d3.select(this.parentNode as Element).selectAll('line')
              lines.each(function(_, i) {
                const sign = i === 0 ? 1 : -1
                d3.select(this)
                  .attr('x1', d.source.x! + offsetX * sign)
                  .attr('y1', d.source.y! + offsetY * sign)
                  .attr('x2', d.target.x! + offsetX * sign)
                  .attr('y2', d.target.y! + offsetY * sign)
              })
            }
          })

        linkGroup.selectAll<SVGTextElement, RoleLink>('text')
          .attr('x', d => (d.source.x! + d.target.x!) / 2)
          .attr('y', d => (d.source.y! + d.target.y!) / 2)

        node
          .attr('cx', d => d.x!)
          .attr('cy', d => d.y!)

        label
          .attr('x', d => d.x!)
          .attr('y', d => d.y!)
      })

      // Add links to simulation
      simulation.force<d3.ForceLink<RoleNode, RoleLink>>('link')!
        .links(links)
    }).catch(error => {
      console.error('Error fetching role graph data:', error)
    })

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, RoleNode, RoleNode>) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, RoleNode, RoleNode>) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, RoleNode, RoleNode>) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [worldview_id, dimensions, updateTimestamp])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
    </div>
  )
}
