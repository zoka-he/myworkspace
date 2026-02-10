import * as d3 from 'd3'

// Timeline visualization configuration
export const TIMELINE_CONFIG = {
  // Number of seconds per pixel in the timeline
  SECONDS_PER_PIXEL: 100000000,
  // Padding above and below the timeline points (in pixels)
  TIMELINE_PADDING: 20,
  // Minimum height of the timeline container (in pixels)
  MIN_CONTAINER_HEIGHT: 600,
  // Fixed time range padding in seconds
  TIME_RANGE_PADDING: 1000,
  // Scale range configuration
  SCALE_RANGE: {
    MIN: 1,  // 1 pixel per 1 seconds
    MAX: 200000000  // 1 pixel per 1000000000 seconds
  }
} as const

/** 事件状态：用于节点形状与标签 */
export type EventStateKey = 'enabled' | 'questionable' | 'not_yet' | 'blocked' | 'closed'

export const EVENT_STATE_CONFIG: Record<EventStateKey, { label: string; title: string }> = {
  enabled: { label: '●', title: '启用' },
  questionable: { label: '▲', title: '存疑' },
  not_yet: { label: '□', title: '未到' },
  blocked: { label: '◆', title: '阻塞' },
  closed: { label: '✕', title: '关闭' }
}

const MARKER_R = 4

/**
 * 在 D3 的 g 下追加按 state 区分的节点形状，并加上 class="event-marker" 便于 hover 选中
 * @param parent - d3 的 g 选择集（已 translate 到点位）
 * @param state - 状态
 * @param color - 填充/描边颜色
 */
export function appendEventStateMarker(
  parent: d3.Selection<SVGGElement, any, null, undefined>,
  state: EventStateKey | undefined,
  color: string
) {
  const s = state && EVENT_STATE_CONFIG[state] ? state : 'enabled'
  const marker = parent.append('g').attr('class', 'event-marker').attr('transform', 'translate(0,0)')

  switch (s) {
    case 'enabled':
      marker.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', MARKER_R)
        .attr('fill', color)
        .attr('stroke', color)
        .attr('stroke-width', 2)
      break
    case 'questionable':
      marker.append('path')
        .attr('d', `M 0 ${-MARKER_R} L ${MARKER_R * 0.87} ${MARKER_R} L ${-MARKER_R * 0.87} ${MARKER_R} Z`)
        .attr('fill', color)
        .attr('stroke', color)
        .attr('stroke-width', 2)
      break
    case 'not_yet':
      marker.append('rect')
        .attr('x', -MARKER_R)
        .attr('y', -MARKER_R)
        .attr('width', MARKER_R * 2)
        .attr('height', MARKER_R * 2)
        .attr('fill', color)
        .attr('stroke', color)
        .attr('stroke-width', 2)
      break
    case 'blocked':
      marker.append('path')
        .attr('d', `M 0 ${-MARKER_R} L ${MARKER_R} 0 L 0 ${MARKER_R} L ${-MARKER_R} 0 Z`)
        .attr('fill', color)
        .attr('stroke', color)
        .attr('stroke-width', 2)
      break
    case 'closed':
      marker.append('path')
        .attr('d', `M ${-MARKER_R} ${-MARKER_R} L ${MARKER_R} ${MARKER_R} M ${MARKER_R} ${-MARKER_R} L ${-MARKER_R} ${MARKER_R}`)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
      break
    default:
      marker.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', MARKER_R)
        .attr('fill', color)
        .attr('stroke', color)
        .attr('stroke-width', 2)
  }
}