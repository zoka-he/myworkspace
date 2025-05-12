import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Card, Slider, Space } from 'antd'
import { IStoryLine, IWorldViewData } from '@/src/types/IAiNoval'
import { CharacterView } from './CharacterView'
import { TIMELINE_CONFIG } from './config'

export type ViewType = 'location' | 'faction' | 'character'

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

interface UnifiedEventViewProps {
  events: TimelineEvent[]
  storyLines: IStoryLine[]
  selectedEventId?: string
  onEventSelect: (event: TimelineEvent) => void
  onEventDelete: (eventId: string) => void
  viewType: ViewType
  worldViews: IWorldViewData[]
  secondsPerPixel: number
}

// Generate evenly distributed colors for storylines
function generateStorylineColors(storyLines: IStoryLine[]): Map<string, string> {
  const colorMap = new Map<string, string>()
  const hueStep = 360 / storyLines.length

  storyLines.forEach((storyLine, index) => {
    const hue = (index * hueStep) % 360
    // Use HSL color with fixed saturation and lightness for better visibility
    colorMap.set(storyLine.id?.toString() || '', `hsl(${hue}, 70%, 50%)`)
  })

  return colorMap
}

// 添加时间格式化函数
function formatTimestamp(timestamp: number): string {
  // 这里可以根据实际需求自定义时间格式
  return `时间点 ${timestamp}`
}

function getGroups(events: ProcessedEvent[], viewType: ViewType): string[] {
  console.log('Getting groups for events:', events, 'viewType:', viewType)
  let groups: string[] = []
  
  if (viewType === 'character') {
    groups = Array.from(
      new Set(events.flatMap(event => event.characters))
    ).filter(Boolean).sort()
    console.log('Character groups:', groups)
  } else if (viewType === 'faction') {
    groups = Array.from(
      new Set(events.flatMap(event => event.faction))
    ).filter(Boolean).sort()
    console.log('Faction groups:', groups)
  } else {
    groups = Array.from(
      new Set(events.map(event => event[viewType]))
    ).filter(Boolean).sort()
    console.log('Location groups:', groups)
  }

  if (groups.length === 0) {
    console.warn('No groups found for view type:', viewType)
    // 如果没有找到分组，使用默认值
    if (viewType === 'character') {
      groups = ['默认角色']
    } else if (viewType === 'faction') {
      groups = ['默认阵营']
    } else {
      groups = ['默认地点']
    }
  }

  return groups
}

function createVisualization(
  containerElement: HTMLDivElement,
  props: {
    events: TimelineEvent[]
    storyLines: IStoryLine[]
    selectedEventId?: string
    onEventSelect: (event: TimelineEvent) => void
    viewType: ViewType
    secondsPerPixel: number
  }
) {
  console.log('Creating visualization with props:', props)
  // Clear any existing content
  d3.select(containerElement).selectAll('*').remove()
  d3.select('body').selectAll('.tooltip').remove()

  // Generate colors for storylines
  const storylineColors = generateStorylineColors(props.storyLines)
  console.log('Generated storyline colors:', storylineColors)

  // Create a new SVG element
  const svg = d3.select(containerElement)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${containerElement.clientWidth} ${containerElement.clientHeight}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')

  // Set up dimensions
  const margin = { top: 40, right: 40, bottom: 60, left: 60 }
  const width = containerElement.clientWidth - margin.left - margin.right
  console.log('Container width:', width)
  if (width <= 0) {
    console.warn('容器宽度为0，无法绘制横轴')
    return
  }
  const height = containerElement.clientHeight - margin.top - margin.bottom
  console.log('Container height:', height)
  if (height <= 0) {
    console.warn('容器高度为0，无法绘制纵轴')
    return
  }

  // Create SVG container
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // Process data
  const processedEvents: ProcessedEvent[] = props.events.map(event => {
    console.log('Processing event:', event)
    return {
      ...event,
      date: event.date // 保持原始时间戳
    }
  }).sort((a, b) => a.date - b.date) // 按时间顺序排序
  console.log('Processed events:', processedEvents)

  const groups = getGroups(processedEvents, props.viewType)
  console.log('Groups for view type', props.viewType, ':', groups)

  // Create scales
  const xScale = d3.scaleBand()
    .domain(groups)
    .range([0, width])
    .padding(0.2)
  console.log('xScale domain:', xScale.domain())

  // 计算时间轴范围
  const minTime = Math.min(...processedEvents.map(d => d.date))
  const maxTime = Math.max(...processedEvents.map(d => d.date))
  console.log('Time range:', { minTime, maxTime, padding: TIMELINE_CONFIG.TIME_RANGE_PADDING })

  // 使用线性比例尺替代时间比例尺
  const yScale = d3.scaleLinear()
    .domain([
      minTime - TIMELINE_CONFIG.TIME_RANGE_PADDING,
      maxTime + TIMELINE_CONFIG.TIME_RANGE_PADDING
    ])
    .range([height, 0])

  // Add x-axis
  const xAxis = d3.axisBottom(xScale)
  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis)
    .selectAll('text')
    .attr('transform', 'rotate(-45)')
    .style('text-anchor', 'end')

  // Create axes
  const yAxis = d3.axisLeft(yScale)
    .ticks(10)
    .tickFormat(d => formatTimestamp(d as number))

  // Add y-axis
  g.append('g')
    .attr('class', 'y-axis')
    .call(yAxis)

  // Add grid lines
  g.append('g')
    .attr('class', 'grid')
    .selectAll('line')
    .data(yScale.ticks(10))
    .enter()
    .append('line')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', d => yScale(d))
    .attr('y2', d => yScale(d))
    .attr('stroke', '#e8e8e8')
    .attr('stroke-dasharray', '4,4')

  // Create tooltip
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background-color', 'white')
    .style('border', '1px solid #ddd')
    .style('padding', '10px')
    .style('border-radius', '4px')
    .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)')
    .style('z-index', '1000')
    .style('max-width', '300px')

  // Draw storylines
  if (props.viewType === 'character') {
    // Use CharacterView for character view
    console.log('Using CharacterView with events:', processedEvents)
    CharacterView({
      events: processedEvents,
      storyLines: props.storyLines,
      selectedEventId: props.selectedEventId,
      onEventSelect: props.onEventSelect,
      xScale,
      yScale,
      g,
      storylineColors
    })
  } else {
    // Draw storylines for other views
    props.storyLines.forEach(storyLine => {
      console.log('Processing storyline:', storyLine)
      const storyEvents = processedEvents
        .filter(event => event.storyLine === storyLine.id?.toString())
        .sort((a, b) => a.date - b.date) // 按时间顺序排序
      console.log('Filtered story events for', storyLine.name, ':', storyEvents)
      
      // 即使只有一个事件也显示
      if (storyEvents.length === 0) {
        console.log('No events found for storyline:', storyLine.name)
        return
      }

      const points: [number, number][] = storyEvents.map(event => {
        let x: number
        if (props.viewType === 'character') {
          x = (xScale(event.characters[0]) || 0) + xScale.bandwidth() / 2
        } else if (props.viewType === 'faction') {
          x = (xScale(event.faction[0]) || 0) + xScale.bandwidth() / 2
        } else {
          x = (xScale(event[props.viewType]) || 0) + xScale.bandwidth() / 2
        }
        const y = yScale(event.date)
        console.log('Calculated point:', { x, y, event: event.title })
        return [x, y]
      })

      // Add intermediate points for vertical lines
      const enhancedPoints: [number, number][] = []
      if (points.length > 1) {
        for (let i = 0; i < points.length - 1; i++) {
          const [x1, y1] = points[i]
          const [x2, y2] = points[i + 1]
          const midY = (y1 + y2) / 2

          // Add points for vertical line and curve
          enhancedPoints.push([x1, y1]) // Start point
          enhancedPoints.push([x1, midY]) // Vertical line end
          enhancedPoints.push([x2, midY]) // Curve end
          enhancedPoints.push([x2, y2]) // End point
        }

        // Create the path
        const line = d3.line<[number, number]>()
          .x(d => d[0])
          .y(d => d[1])
          .curve(d3.curveBasis)

        const lineColor = storylineColors.get(storyLine.id?.toString() || '') || '#1890ff'
        
        // Draw the path
        g.append('path')
          .datum(enhancedPoints)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', lineColor)
          .attr('stroke-width', 2)
          .style('pointer-events', 'none') // Make the path non-interactive
      }

      // Add event markers (circles) for each point
      const lineColor = storylineColors.get(storyLine.id?.toString() || '') || '#1890ff'
      points.forEach(([x, y], index) => {
        const event = storyEvents[index]
        console.log('Drawing event marker:', { x, y, event: event.title })
        
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
                <div style="font-weight: bold; margin-bottom: 5px;">${d.title}</div>
                <div style="color: #666; margin-bottom: 5px;">${d.description}</div>
                <div style="color: #999; font-size: 12px;">
                  <div>时间: ${formatTimestamp(d.date)}</div>
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
            // 使用当前事件组绑定的数据
            const eventData = d3.select(this).datum() as TimelineEvent
            console.log('Clicked event data:', eventData) // 添加日志
            
            // 确保所有必要字段都存在
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
            console.log('Sending event to parent:', originalEvent) // 添加日志
            props.onEventSelect(originalEvent)
          })

        // Add event marker (circle)
        eventGroup.append('circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', 4)
          .attr('fill', lineColor)
          .attr('stroke', lineColor)
          .attr('stroke-width', 2)

        // Add event title label
        eventGroup.append('text')
          .attr('x', 0)
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .attr('fill', lineColor)
          .text(event.title)
      })
    })
  }

  // Clean up tooltip on component unmount
  return () => {
    d3.select('body').selectAll('.tooltip').remove()
  }
}

export function UnifiedEventView({
  events,
  storyLines,
  selectedEventId,
  onEventSelect,
  onEventDelete,
  viewType,
  worldViews,
  secondsPerPixel
}: UnifiedEventViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate container height based on timeline span
  const calculateContainerHeight = () => {
    if (events.length === 0) return TIMELINE_CONFIG.MIN_CONTAINER_HEIGHT

    const timestamps = events.map(event => event.date)
    const minTime = Math.min(...timestamps)
    const maxTime = Math.max(...timestamps)
    const timeSpan = maxTime - minTime
    
    // Calculate height based on time span
    const timelineHeight = Math.ceil(timeSpan / secondsPerPixel)
    // Add padding above and below
    const calculatedHeight = Math.max(
      TIMELINE_CONFIG.MIN_CONTAINER_HEIGHT, 
      timelineHeight + TIMELINE_CONFIG.TIMELINE_PADDING * 2
    )
    return calculatedHeight
  }

  useEffect(() => {
    if (!containerRef.current) return

    // Clear any existing content
    d3.select(containerRef.current).selectAll('*').remove()
    d3.select('body').selectAll('.tooltip').remove()

    // Set dynamic height for the container based on timeline span
    const container = containerRef.current
    const containerHeight = calculateContainerHeight()
    container.style.height = `${containerHeight}px`
    container.style.minHeight = '600px'
    container.style.position = 'relative'

    // Create new visualization
    createVisualization(container, {
      events,
      storyLines,
      selectedEventId,
      onEventSelect,
      viewType,
      secondsPerPixel
    })

    // Add ResizeObserver to handle container size changes
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === containerRef.current) {
          const width = entry.contentRect.width
          const height = entry.contentRect.height
          console.log('Container resized:', { width, height })
          if (width > 0 && height > 0) {
            // Clear and recreate visualization when container size changes
            d3.select(containerRef.current).selectAll('*').remove()
            d3.select('body').selectAll('.tooltip').remove()
            createVisualization(containerRef.current, {
              events,
              storyLines,
              selectedEventId,
              onEventSelect,
              viewType,
              secondsPerPixel
            })
          }
        }
      }
    })

    resizeObserver.observe(containerRef.current)

    // Cleanup
    return () => {
      resizeObserver.disconnect()
      d3.select('body').selectAll('.tooltip').remove()
    }
  }, [events, storyLines, selectedEventId, onEventSelect, viewType, secondsPerPixel])

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: `${calculateContainerHeight()}px`,
        minHeight: '600px',
        position: 'relative'
      }}
    />
  )
}