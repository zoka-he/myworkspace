import React from 'react'
import * as d3 from 'd3'
import { IStoryLine, IWorldViewDataWithExtra } from '@/src/types/IAiNoval'
import { IGeoTreeItem } from '../../common/geoDataUtil'
import { TimelineDateFormatter } from '../../common/novelDateUtils'

interface TimelineEvent {
  id: string
  title: string
  description: string
  date: number // seconds
  location: string
  faction: string[]
  characters: string[]
  storyLine: string
}

interface CharacterViewProps {
  events: TimelineEvent[]
  storyLines: IStoryLine[]
  selectedEventId?: string
  onEventSelect: (event: TimelineEvent) => void
  xScale: d3.ScaleBand<string>
  yScale: d3.ScaleLinear<number, number>
  g: d3.Selection<SVGGElement, unknown, null, undefined>
  storylineColors: Map<string, string>
  geoTree: IGeoTreeItem<any>[]
  worldview_id: number
  worldviews: IWorldViewDataWithExtra[]
}

// 添加时间格式化函数
// 添加时间格式化函数
function formatTimestamp(timestamp: number, worldViews: IWorldViewDataWithExtra[], worldview_id: number): string {
  const worldView = worldViews.find(view => view.id === worldview_id)
  
  // 使用默认的时间线定义创建格式化器
  const formatter = new TimelineDateFormatter({
    id: worldview_id,
    worldview_id: worldview_id,
    epoch: worldView?.tl_epoch || '公元',
    start_seconds: worldView?.tl_start_seconds || 0,
    hour_length_in_seconds: worldView?.tl_hour_length_in_seconds || 3600,
    day_length_in_hours: worldView?.tl_day_length_in_hours || 24,
    month_length_in_days: worldView?.tl_month_length_in_days || 30,
    year_length_in_months: worldView?.tl_year_length_in_months || 12
  })
  return formatter.formatSecondsToDate(timestamp)
}

export function CharacterView({
  events,
  storyLines,
  selectedEventId,
  onEventSelect,
  xScale,
  yScale,
  g,
  storylineColors,
  geoTree,
  worldview_id,
  worldviews
}: CharacterViewProps) {
  // 过滤掉characters为空或空数组的事件
  const filteredEvents = events.filter(event => Array.isArray(event.characters) && event.characters.length > 0)

  console.log('CharacterView received events:', filteredEvents)
  console.log('CharacterView received storyLines:', storyLines)

  // Create tooltip
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background-color', 'rgba(255, 255, 255, 0.8)')
    .style('border', '1px solid #ddd')
    .style('padding', '10px')
    .style('border-radius', '4px')
    .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)')
    .style('z-index', '1000')
    .style('max-width', '300px')

  // Draw storylines
  // 1. 预处理：收集所有event的所有节点x坐标
  const eventNodeMap = new Map<string, { minX: number, maxX: number, minChar: string, maxChar: string }>()
  storyLines.forEach(storyLine => {
    const storyEvents = filteredEvents.filter(event => event.storyLine === storyLine.id?.toString())
    if (storyEvents.length === 0) return
    const characterGroups = new Map<string, { event: TimelineEvent, character: string }[]>()
    storyEvents.forEach(event => {
      event.characters.forEach(character => {
        if (!characterGroups.has(character)) characterGroups.set(character, [])
        characterGroups.get(character)!.push({ event, character })
      })
    })
    characterGroups.forEach((group, character) => {
      group.forEach(({ event }) => {
        const x = (xScale(character) || 0) + xScale.bandwidth() / 2
        const info = eventNodeMap.get(event.id)
        if (!info) {
          eventNodeMap.set(event.id, { minX: x, maxX: x, minChar: character, maxChar: character })
        } else {
          if (x < info.minX) {
            info.minX = x
            info.minChar = character
          }
          if (x > info.maxX) {
            info.maxX = x
            info.maxChar = character
          }
        }
      })
    })
  })

  // 在所有节点渲染前，连接同一event的最左和最右节点
  eventNodeMap.forEach((info, eventId) => {
    const event = filteredEvents.find(e => e.id === eventId)
    if (!event) return
    const y = yScale(event.date)
    // 获取该event所属storyLine的颜色
    const storyLine = storyLines.find(sl => sl.id?.toString() === event.storyLine)
    const lineColor = storylineColors.get(storyLine?.id?.toString() || '') || '#1890ff'
    g.append('line')
      .attr('x1', info.minX)
      .attr('y1', y)
      .attr('x2', info.maxX)
      .attr('y2', y)
      .attr('stroke', lineColor)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', 'none')
  })

  // Draw storylines
  storyLines.forEach(storyLine => {
    // 只处理属于当前storyLine的事件
    const storyEvents = filteredEvents.filter(event => event.storyLine === storyLine.id?.toString())
    if (storyEvents.length === 0) return

    // 1. 按角色分组
    const characterGroups = new Map<string, { event: TimelineEvent, character: string }[]>()
    storyEvents.forEach(event => {
      event.characters.forEach(character => {
        if (!characterGroups.has(character)) characterGroups.set(character, [])
        characterGroups.get(character)!.push({ event, character })
      })
    })

    const lineColor = storylineColors.get(storyLine.id?.toString() || '') || '#1890ff'

    // 2. 对每个角色组绘制虚线和节点
    characterGroups.forEach((group, character) => {
      // 按时间排序
      const sortedGroup = group.slice().sort((a, b) => a.event.date - b.event.date)
      // 计算点
      const points = sortedGroup.map(({ event }) => [
        (xScale(character) || 0) + xScale.bandwidth() / 2,
        yScale(event.date)
      ])
      // 绘制虚线
      if (points.length > 1) {
        for (let i = 0; i < points.length - 1; i++) {
          g.append('path')
            .datum([points[i], points[i + 1]])
            .attr('d', d3.line() as any)
            .attr('fill', 'none')
            .attr('stroke', lineColor)
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,4')
            .style('pointer-events', 'none')
        }
      }
      // 绘制节点
      sortedGroup.forEach(({ event }, idx) => {
        const [x, y] = points[idx]
        const eventGroup = g.append('g')
          .attr('class', 'event-group')
          .attr('transform', `translate(${x},${y})`)
          .datum(event)
          .style('cursor', 'pointer')
          .on('mouseover', function(mouseEvent, d) {
            d3.select(this).select('circle')
              .attr('r', 6)
              .attr('stroke-width', 3)
            tooltip
              .style('visibility', 'visible')
              .html(`
                <div style=\"font-weight: bold; margin-bottom: 5px;\">${d.title}</div>
                <div style=\"color: #666; margin-bottom: 5px;\">${d.description}</div>
                <div style=\"color: #999; font-size: 12px;\">
                  <div>时间: ${formatTimestamp(d.date, worldviews, worldview_id)}</div>
                  <div>地点: ${d.location}</div>
                  <div>阵营: ${d.faction.join(', ')}</div>
                  <div>角色: ${d.characters.join(', ')}</div>
                </div>
              `)
              .style('left', (mouseEvent.pageX + 10) + 'px')
              .style('top', (mouseEvent.pageY - 10) + 'px')
          })
          .on('mouseout', function() {
            d3.select(this).select('circle')
              .attr('r', 4)
              .attr('stroke-width', 2)
            tooltip.style('visibility', 'hidden')
          })
          .on('click', function(mouseEvent, d) {
            onEventSelect(d)
          })
        // Add event marker (circle)
        eventGroup.append('circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', 4)
          .attr('fill', lineColor)
          .attr('stroke', lineColor)
          .attr('stroke-width', 2)
        // 判断是否为该event的最左/最右节点
        const eventInfo = eventNodeMap.get(event.id)
        if (eventInfo && x === eventInfo.minX) {
          eventGroup.append('text')
            .attr('x', -10)
            .attr('y', 4)
            .attr('text-anchor', 'end')
            .attr('font-size', '10px')
            .attr('fill', lineColor)
            .text(formatTimestamp(event.date, worldviews, worldview_id))
        }
        if (eventInfo && x === eventInfo.maxX) {
          eventGroup.append('text')
            .attr('x', 10)
            .attr('y', 4)
            .attr('text-anchor', 'start')
            .attr('font-size', '12px')
            .attr('fill', lineColor)
            .text(event.title)
        }
        // 最后一个node上方显示角色名称
        if (idx === sortedGroup.length - 1) {
          eventGroup.append('text')
            .attr('x', 0)
            .attr('y', -16)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .attr('fill', lineColor)
            .text(character)
        }
      })
    })
  })

  // Clean up tooltip on component unmount
  return () => {
    d3.select('body').selectAll('.tooltip').remove()
  }
}

// 计算CharacterView所需高度（可导出供外部容器调用）
export function getCharacterViewHeight({ events, secondsPerPixel = 100000000, minHeight = 600, timelinePadding = 20 }: {
  events: TimelineEvent[]
  secondsPerPixel?: number
  minHeight?: number
  timelinePadding?: number
}): number {
  // 过滤掉无效事件
  const filteredEvents = events.filter(event => Array.isArray(event.characters) && event.characters.length > 0)
  if (filteredEvents.length === 0) return minHeight
  const timestamps = filteredEvents.map(event => event.date)
  const minTime = Math.min(...timestamps)
  const maxTime = Math.max(...timestamps)
  const timeSpan = maxTime - minTime
  const timelineHeight = Math.ceil(timeSpan / secondsPerPixel)
  return Math.max(minHeight, timelineHeight + timelinePadding * 2)
} 