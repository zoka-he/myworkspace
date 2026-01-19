import React from 'react'
import * as d3 from 'd3'
import { IStoryLine, IWorldViewDataWithExtra } from '@/src/types/IAiNoval'
import { IGeoTreeItem } from '@/src/business/aiNoval/common/geoDataUtil'
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
  faction_ids?: number[]
  role_ids?: number[]
}

interface ProcessedEvent extends Omit<TimelineEvent, 'date'> {
  date: number // 保持为时间戳
}

interface LocationViewProps {
  events: ProcessedEvent[]
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

// Add function to find geo item by code
function findGeoItemByCode(geoTree: IGeoTreeItem<any>[], code: string): IGeoTreeItem<any> | undefined {
  const findInTree = (items: IGeoTreeItem<any>[]): IGeoTreeItem<any> | undefined => {
    for (const item of items) {
      if (item.key === code) {
        return item
      }
      if (item.children) {
        const found = findInTree(item.children)
        if (found) return found
      }
    }
    return undefined
  }
  return findInTree(geoTree)
}

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
    year_length_in_months: worldView?.tl_year_length_in_months || 12,
    base_seconds: worldView?.tl_base_seconds ?? 0
  })
  return formatter.formatSecondsToDate(timestamp)
}

export function LocationView({
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
}: LocationViewProps) {
  // Draw storylines for location view
  storyLines.forEach(storyLine => {
    const storyEvents = events
      .filter(event => event.storyLine === storyLine.id?.toString())
      .sort((a, b) => a.date - b.date) // 按时间顺序排序
    
    // 即使只有一个事件也显示
    if (storyEvents.length === 0) {
      return
    }

    const points: [number, number][] = storyEvents.map(event => {
      const x = (xScale(event.location) || 0) + xScale.bandwidth() / 2
      const y = yScale(event.date)
      return [x, y]
    })

    // Group events by location
    const locationGroups = new Map<string, { event: TimelineEvent, point: [number, number] }[]>()
    storyEvents.forEach((event, index) => {
      const location = event.location
      if (!locationGroups.has(location)) {
        locationGroups.set(location, [])
      }
      locationGroups.get(location)?.push({
        event,
        point: points[index]
      })
    })

    // Draw straight dashed lines for each location group
    const lineColor = storylineColors.get(storyLine.id?.toString() || '') || '#1890ff'
    
    // Create a line generator
    const line = d3.line<[number, number]>()
      .x(d => d[0])
      .y(d => d[1])

    // For each location group, connect events chronologically
    locationGroups.forEach((group, location) => {
      // Sort events by date
      const sortedGroup = group.sort((a, b) => a.event.date - b.event.date)
      
      // Draw lines between consecutive points
      for (let i = 0; i < sortedGroup.length - 1; i++) {
        g.append('path')
          .datum([sortedGroup[i].point, sortedGroup[i + 1].point])
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', lineColor)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,4') // Create dashed line
          .style('pointer-events', 'none') // Make the line non-interactive
      }
    })

    // Add event markers (circles) for each point
    points.forEach(([x, y], index) => {
      const event = storyEvents[index]
      
      const eventGroup = g.append('g')
        .attr('class', 'event-group')
        .attr('transform', `translate(${x},${y})`)
        .datum(event)
        .style('cursor', 'pointer')
        .on('mouseover', function(mouseEvent, d) {
          d3.select(this).select('circle')
            .attr('r', 6)
            .attr('stroke-width', 3)

          const tooltip = d3.select('body').select('.tooltip')
          tooltip
            .style('visibility', 'visible')
            .html(`
              <div style="font-weight: bold; margin-bottom: 5px;">${d.title}</div>
              <div style="color: #666; margin-bottom: 5px;">${d.description}</div>
              <div style="color: #999; font-size: 12px;">
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
          d3.select('body').select('.tooltip').style('visibility', 'hidden')
        })
        .on('click', function(mouseEvent, d) {
          const eventData = d3.select(this).datum() as TimelineEvent
          
          const originalEvent: TimelineEvent = {
            id: eventData.id,
            title: eventData.title,
            description: eventData.description,
            date: eventData.date,
            location: eventData.location,
            faction: eventData.faction || [],
            characters: eventData.characters || [],
            storyLine: eventData.storyLine,
            faction_ids: eventData.faction_ids || [],
            role_ids: eventData.role_ids || []
          }
          onEventSelect(originalEvent)
        })

      // Add event marker (circle)
      eventGroup.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 4)
        .attr('fill', lineColor)
        .attr('stroke', lineColor)
        .attr('stroke-width', 2)

      // Add timestamp label on the left
      eventGroup.append('text')
        .attr('x', -10)
        .attr('y', 4)
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .attr('fill', lineColor)
        .text(formatTimestamp(event.date, worldviews, worldview_id))

      // Add event title label on the right
      eventGroup.append('text')
        .attr('x', 10)
        .attr('y', 4)
        .attr('text-anchor', 'start')
        .attr('font-size', '12px')
        .attr('fill', lineColor)
        .text(event.title)

      // Add location name only for the latest event in each location group
      const locationGroup = locationGroups.get(event.location)
      if (locationGroup) {
        const latestEvent = locationGroup.sort((a, b) => b.event.date - a.event.date)[0]
        if (latestEvent.event.id === event.id) {
          const geoItem = findGeoItemByCode(geoTree, event.location)
          if (geoItem) {
            eventGroup.append('text')
              .attr('x', 0)
              .attr('y', -14)  // 向下偏移1行
              .attr('text-anchor', 'middle')
              .attr('font-size', '10px')
              .attr('fill', lineColor)
              .text(geoItem.data.name)
          }
        }
      }
    })
  })

  return null
} 