'use client'

/**
 * ShapeNode — rectangle / ellipse / diamond with an optional label.
 * The shape is drawn with SVG so we get crisp strokes at any zoom.
 */
import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { NodeShell, useNodeShellProps } from './node-shell'
import { useNodeContext } from './node-context'

interface ShapeData {
  label: string
  color: string
  stroke: string
  width: number
  height: number
  radius: number
  zIndex: number
  lastEditedBy?: string
}

function ShapeNodeImpl(props: NodeProps) {
  const shell = useNodeShellProps<Record<string, unknown>>(props)
  const data = shell.data as ShapeData
  const { editingBy, updateData } = useNodeContext()
  const remoteEditor = editingBy[props.id]

  // The diamond variant clips its content; we render the label centred.
  const isDiamond = (props.type as string) === 'diamond'
  const isEllipse = (props.type as string) === 'ellipse'

  return (
    <NodeShell
      {...shell}
      bare
      editedBy={remoteEditor?.name}
      editedByColor={remoteEditor?.color}
      onToggleLock={() => updateData(props.id, { locked: !shell.locked })}
      className={isEllipse || isDiamond ? 'overflow-visible' : 'overflow-hidden'}
    >
      <svg
        width={data.width}
        height={data.height}
        viewBox={`0 0 ${data.width} ${data.height}`}
        className="absolute inset-0 pointer-events-none"
      >
        {isDiamond ? (
          <polygon
            points={`${data.width / 2},0 ${data.width},${data.height / 2} ${data.width / 2},${data.height} 0,${data.height / 2}`}
            fill={data.color}
            stroke={data.stroke}
            strokeWidth={1.5}
          />
        ) : isEllipse ? (
          <ellipse
            cx={data.width / 2}
            cy={data.height / 2}
            rx={data.width / 2 - 1}
            ry={data.height / 2 - 1}
            fill={data.color}
            stroke={data.stroke}
            strokeWidth={1.5}
          />
        ) : (
          <rect
            x={0.75}
            y={0.75}
            width={data.width - 1.5}
            height={data.height - 1.5}
            rx={data.radius}
            ry={data.radius}
            fill={data.color}
            stroke={data.stroke}
            strokeWidth={1.5}
          />
        )}
      </svg>
      <div
        className="relative w-full h-full flex items-center justify-center p-3 select-none"
        style={{ zIndex: 1 }}
      >
        <span
          className="text-sm font-medium text-center text-foreground/90"
          style={{ color: data.stroke }}
        >
          {data.label}
        </span>
      </div>
    </NodeShell>
  )
}

export const ShapeNode = memo(ShapeNodeImpl)
