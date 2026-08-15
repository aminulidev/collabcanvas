'use client'

/**
 * AnimatedEdge — multi-style edge with optional label chip, animation,
 * and configurable end markers (arrowheads, dots, none).
 *
 * Path styles: bezier, smoothstep, straight
 * Markers: none, arrow, dot (applied at the target end)
 */
import { memo } from 'react'
import {
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react'

interface AnimatedEdgeData {
  label?: string
  color: string
  strokeWidth: number
  animated: boolean
  kind?: 'bezier' | 'smoothstep' | 'straight'
  markerEnd?: 'none' | 'arrow' | 'dot'
  markerStart?: 'none' | 'arrow' | 'dot'
}

function AnimatedEdgeImpl({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  id,
}: EdgeProps) {
  const edgeData = (data ?? {}) as AnimatedEdgeData
  const kind = edgeData.kind ?? 'bezier'
  const markerEnd = edgeData.markerEnd ?? 'arrow'

  let path: string
  let labelX: number
  let labelY: number

  if (kind === 'smoothstep') {
    ;[path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 12,
    })
  } else if (kind === 'straight') {
    ;[path, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    })
  } else {
    ;[path, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    })
  }

  const color = edgeData.color ?? '#64748B'
  const strokeWidth = edgeData.strokeWidth ?? 2
  const markerEndId = `marker-end-${id}-${markerEnd}`
  const markerStartVal = edgeData.markerStart ?? 'none'
  const markerStartId = `marker-start-${id}-${markerStartVal}`

  // Build marker definition for a given type + id + direction.
  const buildMarker = (type: string, mid: string, isStart: boolean) => {
    if (type === 'arrow') {
      return (
        <marker
          id={mid}
          markerWidth="12"
          markerHeight="12"
          refX={isStart ? 2 : 10}
          refY="6"
          orient={isStart ? 'auto-start-reverse' : 'auto'}
          markerUnits="userSpaceOnUse"
        >
          <path d="M 2 2 L 10 6 L 2 10 Z" fill={color} />
        </marker>
      )
    }
    if (type === 'dot') {
      return (
        <marker
          id={mid}
          markerWidth="10"
          markerHeight="10"
          refX="5"
          refY="5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <circle cx="5" cy="5" r="4" fill={color} />
        </marker>
      )
    }
    return null
  }

  const endMarkerDef = buildMarker(markerEnd, markerEndId, false)
  const startMarkerDef = buildMarker(markerStartVal, markerStartId, true)

  return (
    <>
      {/* Marker definitions */}
      <defs>
        {endMarkerDef}
        {startMarkerDef}
      </defs>

      {/* Wide invisible hit area so the edge is easy to click. */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={selected ? strokeWidth + 1.5 : strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={markerEnd !== 'none' ? `url(#${markerEndId})` : undefined}
        markerStart={markerStartVal !== 'none' ? `url(#${markerStartId})` : undefined}
        className={edgeData.animated ? 'react-flow__edge-animated' : ''}
        style={{
          strokeDasharray: edgeData.animated ? '6 4' : undefined,
          animation: edgeData.animated
            ? 'dashdraw 0.6s linear infinite'
            : undefined,
          opacity: selected ? 1 : 0.85,
        }}
      />
      {edgeData.label && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-auto px-2 py-0.5 rounded-md text-[11px] font-medium shadow-sm border backdrop-blur-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              // Background uses the edge color at low opacity, text is
              // the full-saturation color for contrast.
              background: `${color}15`,
              color,
              borderColor: `${color}50`,
            }}
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
      <style>{`
        @keyframes dashdraw {
          to { stroke-dashoffset: -10; }
        }
      `}</style>
    </>
  )
}

export const AnimatedEdge = memo(AnimatedEdgeImpl)
