'use client'

/**
 * ConnectionLine
 * ------------------------------------------------------------------
 * Custom rendering for the temporary line shown while the user drags
 * from a node handle to another. Uses a bezier curve in the active
 * tool's accent colour so the feedback is immediate and clear.
 */
import { memo } from 'react'
import { getBezierPath, type ConnectionLineComponent } from '@xyflow/react'

const ConnectionLineImpl: ConnectionLineComponent = ({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  connectionLineType,
}) => {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <g>
      {/* Wide invisible hit area */}
      <path d={path} fill="none" stroke="transparent" strokeWidth={12} />
      {/* Visible connection line */}
      <path
        d={path}
        fill="none"
        stroke="#6366F1"
        strokeWidth={2}
        strokeDasharray="4 3"
        strokeLinecap="round"
        className="animated"
        style={{
          animation: 'dashdraw 0.6s linear infinite',
        }}
      />
      {/* Target dot */}
      <circle
        cx={targetX}
        cy={targetY}
        r={4}
        fill="#6366F1"
        stroke="white"
        strokeWidth={1.5}
      />
    </g>
  )
}

export const ConnectionLine = memo(ConnectionLineImpl) as typeof ConnectionLineImpl
