import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Card, Slider, Space } from 'antd'
import { IStoryLine, IWorldViewDataWithExtra, ITimelineDef } from '@/src/types/IAiNoval'
import { CharacterView } from './CharacterView'
import { LocationView } from './LocationView'
import { FactionView } from './FactionView'
import { TIMELINE_CONFIG } from './config'
import { loadGeoTree, IGeoTreeItem } from '@/src/business/aiNoval/common/geoDataUtil'
import fetch from '@/src/fetch'
import { TimelineDateFormatter } from '../../common/novelDateUtils'
import { IRootState } from '@/src/store'
import { useSelector } from 'react-redux'

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
  state?: 'enabled' | 'questionable' | 'not_yet' | 'blocked' | 'closed'
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
  onScaleChange?: (newScale: number) => void
  enableHeightLimit?: boolean  // 添加控制是否启用高度限制的选项
  maxContainerHeight?: number  // 添加自定义最大高度选项  
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
  // console.info('worldView:', worldView) 
  // console.log('worldview_id', worldview_id)
  // console.log('worldView timelineDef:', worldView)
  
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
  // console.log('Processing events with geo tree:', events)
  // console.log('Geo tree available:', !!geoTree)
  
  const VALID_STATES = ['enabled', 'questionable', 'not_yet', 'blocked', 'closed'] as const
  const processed = events.map(event => {
    const rawState = event.state
    const state = (typeof rawState === 'string' && VALID_STATES.includes(rawState)) ? rawState : 'enabled'
    return {
      ...event,
      location: event.location,
      date: event.date,
      state
    }
  }).sort((a, b) => a.date - b.date)
  
  // console.log('Final processed events:', processed)
  return processed
}

function getGroups(events: ProcessedEvent[], viewType: ViewType, geoTree?: IGeoTreeItem<any>[]): string[] {
  // console.log('Getting groups for events:', events)
  // console.log('View type:', viewType)
  // console.log('Geo tree available:', !!geoTree)
  
  let groups: string[] = []
  
  if (viewType === 'character') {
    groups = Array.from(
      new Set(events.flatMap(event => event.characters))
    ).filter(Boolean).sort()
    // console.log('Character groups:', groups)
  } else if (viewType === 'faction') {
    groups = Array.from(
      new Set(events.flatMap(event => event.faction))
    ).filter(Boolean).sort()
    // console.log('Faction groups:', groups)
  } else if (viewType === 'location' && geoTree) {
    // Use geo codes for location view
    groups = getUniqueGeoCodes(events)
    // console.log('Location groups (geo codes):', groups)
  } else {
    groups = Array.from(
      new Set(events.map(event => event[viewType]))
    ).filter(Boolean).sort()
    // console.log('Location groups:', groups)
  }

  if (groups.length === 0) {
    // console.warn('No groups found for view type:', viewType)
    // 如果没有找到分组，使用默认值
    if (viewType === 'character') {
      groups = ['默认角色']
    } else if (viewType === 'faction') {
      groups = ['默认阵营']
    } else {
      groups = ['默认地点']
    }
  }

  // console.log('Final groups:', groups)
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
    worldviews: IWorldViewDataWithExtra[],
    containerHeight: number
    timeRange: { min: number; max: number }
    theme: string
  }
) {
  // Clear any existing content
  d3.select(containerElement).selectAll('*').remove()
  d3.select('body').selectAll('.tooltip').remove()

  // Generate colors for storylines
  const storylineColors = generateStorylineColors(props.storyLines)

  // Create a new SVG element
  const svg = d3.select(containerElement)
    .append('svg')
    .attr('width', '100%')
    .attr('viewBox', `0 0 ${containerElement.clientWidth} ${containerElement.clientHeight}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('background-color', props.theme === 'dark' ? '#333' : 'white')

  // Set up dimensions
  const margin = { top: 80, right: 40, bottom: 60, left: 60 }
  const width = containerElement.clientWidth - margin.left - margin.right
  if (width <= 0) return
  const height = containerElement.clientHeight - margin.top - margin.bottom
  if (height <= 0) return

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

  const groups = getGroups(processedEvents, props.viewType, props.geoTree)

  // Create scales
  const xScale = d3.scaleBand()
    .domain(groups)
    .range([0, width])
    .padding(0.2)

  // Use the provided timeRange for y-scale
  const yScale = d3.scaleLinear()
    .domain([
      props.timeRange.min - TIMELINE_CONFIG.TIME_RANGE_PADDING,
      props.timeRange.max + TIMELINE_CONFIG.TIME_RANGE_PADDING
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
    .style('display', 'none')

  // Create axes
  const yAxis = d3.axisLeft(yScale)
    .ticks(10)
    .tickFormat(d => formatTimestamp(d as number, props.worldviews, props.worldview_id))

  // Add y-axis but hide it
  g.append('g')
    .attr('class', 'y-axis')
    .call(yAxis)
    .style('display', 'none')

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

  // Draw storylines based on view type
  if (props.viewType === 'character') {
    CharacterView({
      events: processedEvents,
      storyLines: props.storyLines,
      selectedEventId: props.selectedEventId,
      onEventSelect: props.onEventSelect,
      xScale,
      yScale,
      g,
      storylineColors,
      geoTree: props.geoTree!,
      worldview_id: props.worldview_id,
      worldviews: props.worldviews
    })
  } else if (props.viewType === 'location') {
    LocationView({
      events: processedEvents,
      storyLines: props.storyLines,
      selectedEventId: props.selectedEventId,
      onEventSelect: props.onEventSelect,
      xScale,
      yScale,
      g,
      storylineColors,
      geoTree: props.geoTree!,
      worldview_id: props.worldview_id,
      worldviews: props.worldviews
    })
  } else if (props.viewType === 'faction') {
    FactionView({
      events: processedEvents,
      storyLines: props.storyLines,
      selectedEventId: props.selectedEventId,
      onEventSelect: props.onEventSelect,
      xScale,
      yScale,
      g,
      storylineColors,
      geoTree: props.geoTree!,
      worldview_id: props.worldview_id,
      worldviews: props.worldviews
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
  worldview_id,
  onScaleChange,
  enableHeightLimit,
  maxContainerHeight
}: UnifiedEventViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [geoTree, setGeoTree] = useState<IGeoTreeItem<any>[]>([])
  const [timeRange, setTimeRange] = useState<{ min: number; max: number } | null>(null)
  const isFirstRender = useRef(true)
  // Add ref to store previous timestamps for comparison
  const prevTimestamps = useRef<{ min: number; max: number } | null>(null)

  const theme = useSelector((state: IRootState) => state.themeSlice.currentTheme)

  // Load geo tree data
  useEffect(() => {
    const loadGeoData = async () => {
      if (viewType === 'location') {
        const targetWorldviewId = worldview_id || (worldViews.length > 0 ? worldViews[0].id : undefined)
        
        if (!targetWorldviewId) return

        try {
          const tree = await loadGeoTree(targetWorldviewId)
          if (tree && tree.length > 0) {
            setGeoTree(tree)
          }
        } catch (error: any) {
          console.error('Error loading geo tree:', error)
        }
      }
    }
    loadGeoData()
  }, [viewType, worldview_id, worldViews])

  // Calculate container height based on timeline span
  const calculateContainerHeight = () => {
    if (events.length === 0) return TIMELINE_CONFIG.MIN_CONTAINER_HEIGHT

    const timestamps = events.map(event => event.date)
    const minTime = Math.min(...timestamps)
    const maxTime = Math.max(...timestamps)
    
    // Check if we need to update time range
    const shouldUpdateTimeRange = isFirstRender.current || 
      !prevTimestamps.current ||
      Math.abs(prevTimestamps.current.min - minTime) > TIMELINE_CONFIG.TIME_RANGE_PADDING ||
      Math.abs(prevTimestamps.current.max - maxTime) > TIMELINE_CONFIG.TIME_RANGE_PADDING

    if (shouldUpdateTimeRange) {
      setTimeRange({ min: minTime, max: maxTime })
      prevTimestamps.current = { min: minTime, max: maxTime }
      isFirstRender.current = false
    }
    
    const timeSpan = maxTime - minTime
    const timelineHeight = Math.ceil(timeSpan / secondsPerPixel)
    
    const calculatedHeight = Math.max(
      TIMELINE_CONFIG.MIN_CONTAINER_HEIGHT, 
      timelineHeight + TIMELINE_CONFIG.TIMELINE_PADDING * 2
    )

    if (enableHeightLimit !== false) {
      const MAX_CONTAINER_HEIGHT = maxContainerHeight || 2000
      if (calculatedHeight > MAX_CONTAINER_HEIGHT) {
        const adjustedSecondsPerPixel = timeSpan / (MAX_CONTAINER_HEIGHT - TIMELINE_CONFIG.TIMELINE_PADDING * 2)
        if (secondsPerPixel !== adjustedSecondsPerPixel && onScaleChange) {
          onScaleChange(adjustedSecondsPerPixel)
        }
        return MAX_CONTAINER_HEIGHT
      }
    }

    return calculatedHeight
  }

  // Add effect to handle time range updates
  useEffect(() => {
    // Reset first render flag and previous timestamps when viewType changes
    isFirstRender.current = true
    prevTimestamps.current = null
  }, [viewType])

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

    // Create new visualization with current time range
    createVisualization(container, {
      theme,
      events,
      storyLines,
      selectedEventId,
      onEventSelect,
      viewType,
      secondsPerPixel,
      geoTree: viewType === 'location' ? geoTree : undefined,
      worldview_id,
      worldviews: worldViews,
      containerHeight: containerHeight,
      timeRange: timeRange || {
        min: Math.min(...events.map(e => e.date)),
        max: Math.max(...events.map(e => e.date))
      }
    })

    // Add ResizeObserver to handle container size changes
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === containerRef.current) {
          const width = entry.contentRect.width
          const height = entry.contentRect.height
          if (width > 0 && height > 0) {
            // Clear and recreate visualization when container size changes
            d3.select(containerRef.current).selectAll('*').remove()
            d3.select('body').selectAll('.tooltip').remove()
            createVisualization(containerRef.current, {
              theme,
              events,
              storyLines,
              selectedEventId,
              onEventSelect,
              viewType,
              secondsPerPixel,
              geoTree: viewType === 'location' ? geoTree : undefined,
              worldview_id,
              worldviews: worldViews,
              containerHeight: containerHeight,
              timeRange: timeRange || {
                min: Math.min(...events.map(e => e.date)),
                max: Math.max(...events.map(e => e.date))
              }
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
  }, [events, storyLines, selectedEventId, onEventSelect, viewType, secondsPerPixel, geoTree, worldview_id, timeRange])

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