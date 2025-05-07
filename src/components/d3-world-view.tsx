'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Faction extends d3.SimulationNodeDatum {
  id: string
  name: string
  color: string
  relations: {
    targetId: string
    value: number // -100 to 100, representing hostility to alliance
  }[]
}

interface D3WorldViewProps {
  worldViewId: string
  updateTimestamp: number
}

export function D3WorldView({ worldViewId, updateTimestamp }: D3WorldViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove()

    // Set up the SVG dimensions
    const width = 800
    const height = 600
    const margin = { top: 20, right: 20, bottom: 20, left: 20 }

    // Create SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Create a force simulation
    const simulation = d3.forceSimulation<Faction>()
      .force('link', d3.forceLink<Faction, any>().id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody<Faction>().strength(-300))
      .force('center', d3.forceCenter<Faction>(width / 2, height / 2))

    // Create links array from faction relations
    const links: { source: string; target: string; value: number }[] = []
    const factions: Faction[] = [] // This would be populated with your actual faction data

    // Add your faction data processing here
    // Example:
    // factions.forEach(faction => {
    //   faction.relations.forEach(relation => {
    //     links.push({
    //       source: faction.id,
    //       target: relation.targetId,
    //       value: relation.value
    //     })
    //   })
    // })

    // Create the links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.abs(d.value) / 10)

    // Create the nodes
    const node = svg.append('g')
      .selectAll('circle')
      .data(factions)
      .enter()
      .append('circle')
      .attr('r', 20)
      .attr('fill', d => d.color)
      .call(d3.drag<SVGCircleElement, Faction>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))

    // Add faction names
    const labels = svg.append('g')
      .selectAll('text')
      .data(factions)
      .enter()
      .append('text')
      .text(d => d.name)
      .attr('font-size', 12)
      .attr('dx', 25)
      .attr('dy', 4)

    // Update positions on each tick
    simulation.nodes(factions).on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x!)
        .attr('y1', d => (d.source as any).y!)
        .attr('x2', d => (d.target as any).x!)
        .attr('y2', d => (d.target as any).y!)

      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!)

      labels
        .attr('x', d => d.x!)
        .attr('y', d => d.y!)
    })

    simulation.force<d3.ForceLink<Faction, any>>('link')?.links(links)

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, Faction, Faction>) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, Faction, Faction>) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, Faction, Faction>) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

  }, [worldViewId, updateTimestamp])

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  )
} 