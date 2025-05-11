import React from 'react'
import * as d3 from 'd3'
import { IStoryLine } from '@/src/types/IAiNoval'

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
}

// 添加时间格式化函数
function formatTimestamp(timestamp: number): string {
  // 这里可以根据实际需求自定义时间格式
  return `时间点 ${timestamp}`
}

export function CharacterView({
  events,
  storyLines,
  selectedEventId,
  onEventSelect,
  xScale,
  yScale,
  g,
  storylineColors
}: CharacterViewProps) {
  console.log('CharacterView received events:', events)
  console.log('CharacterView received storyLines:', storyLines)

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
  storyLines.forEach(storyLine => {
    console.log('Processing storyline in CharacterView:', storyLine)
    const storyEvents = events.filter(event => {
      const matches = event.storyLine === storyLine.id?.toString()
      console.log('Checking event in CharacterView:', {
        eventId: event.id,
        eventStoryLine: event.storyLine,
        storyLineId: storyLine.id?.toString(),
        matches
      })
      return matches
    })
    console.log('Filtered events for storyline in CharacterView:', storyEvents)
    
    // 即使只有一个事件也显示
    if (storyEvents.length === 0) {
      console.log('No events found for storyline in CharacterView:', storyLine.name)
      return
    }

    const points: [number, number][] = storyEvents.map(event => {
      const x = (xScale(event.characters[0]) || 0) + xScale.bandwidth() / 2
      const y = yScale(event.date)
      console.log('Calculated point in CharacterView:', { x, y, event: event.title })
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

  // Clean up tooltip on component unmount
  return () => {
    d3.select('body').selectAll('.tooltip').remove()
  }
} 