'use client'

/**
 * AlignmentGuides
 * ------------------------------------------------------------------
 * Renders horizontal/vertical guide lines when a dragged node's
 * center or edges align with other nodes' centers or edges. This
 * gives users visual feedback for snapping — common in Figma/Sketch.
 *
 * The guides are pure overlays computed via useMemo from the current
 * node positions + dragged node id.
 */
import { memo, useMemo } from 'react'
import type { CanvasNode } from '@/types/canvas'

interface Guide {
  orientation: 'horizontal' | 'vertical'
  position: number // canvas coordinate
  start: number
  end: number
}

interface AlignmentGuidesProps {
  nodes: CanvasNode[]
  draggedNodeId: string | null
  viewport: { x: number; y: number; zoom: number }
}

const THRESHOLD = 6 // px snap distance in canvas coords

function AlignmentGuidesImpl({
  nodes,
  draggedNodeId,
  viewport,
}: AlignmentGuidesProps) {
  // Compute alignment guides purely from the current props.
  const guides = useMemo<Guide[]>(() => {
    if (!draggedNodeId) return []
    const dragged = nodes.find((n) => n.id === draggedNodeId)
    if (!dragged) return

    const others = nodes.filter((n) => n.id !== draggedNodeId)
    const newGuides: Guide[] = []

    const dCx = dragged.position.x + (dragged.data.width ?? 100) / 2
    const dCy = dragged.position.y + (dragged.data.height ?? 50) / 2
    const dLeft = dragged.position.x
    const dRight = dragged.position.x + (dragged.data.width ?? 100)
    const dTop = dragged.position.y
    const dBottom = dragged.position.y + (dragged.data.height ?? 50)

    for (const other of others) {
      const oCx = other.position.x + (other.data.width ?? 100) / 2
      const oCy = other.position.y + (other.data.height ?? 50) / 2
      const oLeft = other.position.x
      const oRight = other.position.x + (other.data.width ?? 100)
      const oTop = other.position.y
      const oBottom = other.position.y + (other.data.height ?? 50)

      // Vertical guides (same X)
      if (Math.abs(dCx - oCx) < THRESHOLD) {
        newGuides.push({
          orientation: 'vertical',
          position: oCx,
          start: Math.min(dTop, oTop),
          end: Math.max(dBottom, oBottom),
        })
      }
      if (Math.abs(dLeft - oLeft) < THRESHOLD) {
        newGuides.push({
          orientation: 'vertical',
          position: oLeft,
          start: Math.min(dTop, oTop),
          end: Math.max(dBottom, oBottom),
        })
      }
      if (Math.abs(dRight - oRight) < THRESHOLD) {
        newGuides.push({
          orientation: 'vertical',
          position: oRight,
          start: Math.min(dTop, oTop),
          end: Math.max(dBottom, oBottom),
        })
      }

      // Horizontal guides (same Y)
      if (Math.abs(dCy - oCy) < THRESHOLD) {
        newGuides.push({
          orientation: 'horizontal',
          position: oCy,
          start: Math.min(dLeft, oLeft),
          end: Math.max(dRight, oRight),
        })
      }
      if (Math.abs(dTop - oTop) < THRESHOLD) {
        newGuides.push({
          orientation: 'horizontal',
          position: oTop,
          start: Math.min(dLeft, oLeft),
          end: Math.max(dRight, oRight),
        })
      }
      if (Math.abs(dBottom - oBottom) < THRESHOLD) {
        newGuides.push({
          orientation: 'horizontal',
          position: oBottom,
          start: Math.min(dLeft, oLeft),
          end: Math.max(dRight, oRight),
        })
      }
    }

    return newGuides
  }, [nodes, draggedNodeId])

  // Convert canvas coords to screen coords for SVG overlay.
  const { x: vx, y: vy, zoom } = viewport
  const toScreen = (canvasPos: number, isVertical: boolean) =>
    isVertical ? canvasPos * zoom + vx : canvasPos * zoom + vy

  if (!guides || guides.length === 0) return null

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-40"
      style={{ overflow: 'visible' }}
    >
      {guides.map((g, i) => {
        if (g.orientation === 'vertical') {
          const x = toScreen(g.position, true)
          const y1 = toScreen(g.start, false)
          const y2 = toScreen(g.end, false)
          return (
            <line
              key={i}
              x1={x}
              y1={y1}
              x2={x}
              y2={y2}
              stroke="#6366F1"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.8}
            />
          )
        } else {
          const y = toScreen(g.position, false)
          const x1 = toScreen(g.start, true)
          const x2 = toScreen(g.end, true)
          return (
            <line
              key={i}
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke="#6366F1"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.8}
            />
          )
        }
      })}
    </svg>
  )
}

export const AlignmentGuides = memo(AlignmentGuidesImpl)
