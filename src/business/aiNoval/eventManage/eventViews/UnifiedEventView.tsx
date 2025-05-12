import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Card, Slider, Space } from 'antd'
import { IStoryLine, IWorldViewDataWithExtra, ITimelineDef } from '@/src/types/IAiNoval'
import { CharacterView } from './CharacterView'
import { TIMELINE_CONFIG } from './config'
import { loadGeoTree, IGeoTreeItem } from '@/src/business/aiNoval/common/geoDataUtil'
import fetch from '@/src/fetch'
import { TimelineDateFormatter } from '../../common/novelDateUtils'

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
  worldViews: IWorldViewDataWithExtra[]
  secondsPerPixel: number
  worldview_id: number
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
function formatTimestamp(timestamp: number, worldViews: IWorldViewDataWithExtra[], worldview_id: number): string {
  const worldView = worldViews.find(view => view.id === worldview_id)
  console.info('worldView:', worldView) 
  console.log('worldview_id', worldview_id)
  console.log('worldView timelineDef:', worldView)
  
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

// Add function to get all unique geo codes from events
function getUniqueGeoCodes(events: TimelineEvent[]): string[] {
  const codes = new Set<string>()
  events.forEach(event => {
    if (event.location) codes.add(event.location)
  })
  return Array.from(codes).sort()
}

// Add function to process events with geo codes
function processEventsWithGeo(events: TimelineEvent[], geoTree?: IGeoTreeItem<any>[]): ProcessedEvent[] {
  console.log('Processing events with geo tree:', events)
  console.log('Geo tree available:', !!geoTree)
  
  const processed = events.map(event => {
    console.log('Processing event:', event)
    // 保持原始的 location code
    const result = {
      ...event,
      location: event.location,
      date: event.date
    }
    console.log('Processed event result:', result)
    return result
  }).sort((a, b) => a.date - b.date)
  
  console.log('Final processed events:', processed)
  return processed
}

function getGroups(events: ProcessedEvent[], viewType: ViewType, geoTree?: IGeoTreeItem<any>[]): string[] {
  console.log('Getting groups for events:', events)
  console.log('View type:', viewType)
  console.log('Geo tree available:', !!geoTree)
  
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
  } else if (viewType === 'location' && geoTree) {
    // Use geo codes for location view
    groups = getUniqueGeoCodes(events)
    console.log('Location groups (geo codes):', groups)
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

  console.log('Final groups:', groups)
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
    geoTree?: IGeoTreeItem<any>[]
    worldview_id: number
    worldviews: IWorldViewDataWithExtra[]
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
    .style('background-color', 'white')  // 设置背景为白色

  // Set up dimensions
  const margin = { top: 80, right: 40, bottom: 60, left: 60 }  // 增加顶部边距
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

  // Add legend at the top
  const legendGroup = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${margin.left},${margin.top - 60})`)

  // Calculate legend item width and spacing
  const legendItemWidth = 120
  const legendSpacing = 20
  const totalLegendWidth = props.storyLines.length * (legendItemWidth + legendSpacing)

  // Center the legend
  const legendStartX = (width - totalLegendWidth) / 2

  // Add legend items
  props.storyLines.forEach((storyLine, index) => {
    const x = legendStartX + index * (legendItemWidth + legendSpacing)
    const color = storylineColors.get(storyLine.id?.toString() || '') || '#1890ff'

    // Add colored circle
    legendGroup.append('circle')
      .attr('cx', x)
      .attr('cy', 0)
      .attr('r', 4)
      .attr('fill', color)
      .attr('stroke', color)
      .attr('stroke-width', 2)

    // Add story line name
    legendGroup.append('text')
      .attr('x', x + 10)
      .attr('y', 4)
      .attr('font-size', '12px')
      .attr('fill', color)
      .text(storyLine.name)
  })

  // Process data with geo codes if needed
  const processedEvents = processEventsWithGeo(props.events, props.viewType === 'location' ? props.geoTree : undefined)
  console.log('Processed events:', processedEvents)

  const groups = getGroups(processedEvents, props.viewType, props.geoTree)
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

  // Add x-axis with custom labels but hide it
  const xAxis = d3.axisBottom(xScale)
  if (props.viewType === 'location' && props.geoTree) {
    xAxis.tickFormat((code: string) => {
      const item = findGeoItemByCode(props.geoTree!, code)
      return item ? item.data.name : code
    })
  }
  
  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis)
    .style('display', 'none')  // 隐藏x轴

  // Create axes
  const yAxis = d3.axisLeft(yScale)
    .ticks(10)
    .tickFormat(d => formatTimestamp(d as number, props.worldviews, props.worldview_id))

  // Add y-axis but hide it
  g.append('g')
    .attr('class', 'y-axis')
    .call(yAxis)
    .style('display', 'none')  // 隐藏y轴

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
        } else if (props.viewType === 'location') {
          x = (xScale(event.location) || 0) + xScale.bandwidth() / 2
        } else {
          x = (xScale(event[props.viewType]) || 0) + xScale.bandwidth() / 2
        }
        const y = yScale(event.date)
        console.log('Calculated point:', { x, y, event: event.title })
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
                  <div>时间: ${formatTimestamp(d.date, props.worldviews, props.worldview_id)}</div>
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
            const eventData = d3.select(this).datum() as TimelineEvent
            console.log('Clicked event data:', eventData)
            
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
            console.log('Sending event to parent:', originalEvent)
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

        // Add timestamp label on the left
        eventGroup.append('text')
          .attr('x', -10)
          .attr('y', 4)
          .attr('text-anchor', 'end')
          .attr('font-size', '10px')
          .attr('fill', lineColor)
          .text(formatTimestamp(event.date, props.worldviews, props.worldview_id))

        // Add event title label on the right
        eventGroup.append('text')
          .attr('x', 10)
          .attr('y', 4)
          .attr('text-anchor', 'start')
          .attr('font-size', '12px')
          .attr('fill', lineColor)
          .text(event.title)

        // Add location name only for the latest event in each location group
        if (props.viewType === 'location' && props.geoTree) {
          const locationGroup = locationGroups.get(event.location)
          if (locationGroup) {
            const latestEvent = locationGroup.sort((a, b) => b.event.date - a.event.date)[0]
            if (latestEvent.event.id === event.id) {
              const geoItem = findGeoItemByCode(props.geoTree, event.location)
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
        }
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
  secondsPerPixel,
  worldview_id
}: UnifiedEventViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [geoTree, setGeoTree] = useState<IGeoTreeItem<any>[]>([])

  // Load geo tree data
  useEffect(() => {
    const loadGeoData = async () => {
      console.log('Current viewType:', viewType)
      console.log('Current worldview_id:', worldview_id)
      console.log('Available worldViews:', worldViews)
      
      if (viewType === 'location') {
        // 如果没有传入 worldview_id，尝试从 worldViews 中获取
        const targetWorldviewId = worldview_id || (worldViews.length > 0 ? worldViews[0].id : undefined)
        
        if (!targetWorldviewId) {
          console.error('No worldview_id available')
          return
        }

        console.log('Loading geo tree for worldview_id:', targetWorldviewId)
        try {
          const tree = await loadGeoTree(targetWorldviewId)
          
          if (tree && tree.length > 0) {
            // 打印树的基本信息而不是整个结构
            console.log('Geo tree loaded with', tree.length, 'root items')
            console.log('First item:', {
              title: tree[0].title,
              key: tree[0].key,
              dataType: tree[0].dataType,
              childrenCount: tree[0].children?.length || 0
            })
            setGeoTree(tree)
          } else {
            console.warn('Geo tree is empty')
          }
        } catch (error: any) {
          console.error('Error loading geo tree:', error)
        }
      }
    }
    loadGeoData()
  }, [viewType, worldview_id, worldViews])

  // Add debug effect for geoTree changes
  useEffect(() => {
    if (viewType === 'location') {
      console.log('Geo tree state updated with', geoTree.length, 'items')
      if (geoTree && geoTree.length > 0) {
        // Log all names in the tree
        const logNames = (items: IGeoTreeItem<any>[]) => {
          items.forEach(item => {
            console.log('Item:', {
              title: item.title,
              key: item.key,
              dataType: item.dataType,
              childrenCount: item.children?.length || 0
            })
            if (item.children) {
              logNames(item.children)
            }
          })
        }
        logNames(geoTree)
      }
    }
  }, [geoTree, viewType])

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
      secondsPerPixel,
      geoTree: viewType === 'location' ? geoTree : undefined,
      worldview_id,
      worldviews: worldViews
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
              secondsPerPixel,
              geoTree: viewType === 'location' ? geoTree : undefined,
              worldview_id,
              worldviews: worldViews
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
  }, [events, storyLines, selectedEventId, onEventSelect, viewType, secondsPerPixel, geoTree, worldview_id])

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