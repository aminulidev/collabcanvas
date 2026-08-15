'use client'

/**
 * GroupNode
 * ------------------------------------------------------------------
 * A labeled container that visually groups other nodes. The group is
 * purely cosmetic — it doesn't own its children (they remain
 * independent Yjs nodes), but it renders a translucent background,
 * a header label, and a subtle border so users can visually cluster
 * related content.
 *
 * The group can be resized and moved independently. Child nodes
 * inside it are not automatically moved with the group (that would
 * require parent-child wiring in React Flow); instead, users drag
 * nodes into the group manually.
 */
import { memo, useState } from 'react'
import { type NodeProps, NodeResizer } from '@xyflow/react'
import { Group, Lock, Unlock } from 'lucide-react'
import { useNodeContext } from './node-context'
import { cn } from '@/lib/utils'

interface GroupData {
  label: string
  color: string
  stroke: string
  width: number
  height: number
  zIndex: number
  locked?: boolean
}

function GroupNodeImpl(props: NodeProps) {
  const data = props.data as GroupData
  const { updateData } = useNodeContext()
  const [editing, setEditing] = useState(false)

  const locked = !!data.locked

  return (
    <div
      className={cn(
        'relative w-full h-full rounded-2xl border-2 border-dashed transition-colors',
        locked ? 'opacity-60' : 'opacity-100'
      )}
      style={{
        background: `${data.color}20`,
        borderColor: `${data.stroke}80`,
        zIndex: data.zIndex,
      }}
    >
      {/* Resize handles (hidden when locked) */}
      {!locked && (
        <NodeResizer
          minWidth={120}
          minHeight={80}
          isVisible={!!props.selected}
          lineClassName="!border-primary/50"
          handleClassName="!w-2.5 !h-2.5 !bg-white !border-2 !border-primary !rounded-full"
        />
      )}

      {/* Header bar */}
      <div
        className="absolute -top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium shadow-sm backdrop-blur-sm"
        style={{ background: data.color, color: data.stroke }}
      >
        <Group className="w-3 h-3" />
        {editing ? (
          <input
            autoFocus
            value={data.label}
            onChange={(e) => updateData(props.id, { label: e.target.value })}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') setEditing(false)
            }}
            className="bg-transparent outline-none w-32"
            style={{ color: data.stroke }}
          />
        ) : (
          <button
            onDoubleClick={() => setEditing(true)}
            className="cursor-text"
          >
            {data.label || 'Untitled group'}
          </button>
        )}
        {/* Lock toggle */}
        <button
          onClick={() => updateData(props.id, { locked: !locked })}
          className="ml-1 hover:opacity-70 transition-opacity"
          title={locked ? 'Unlock group' : 'Lock group'}
        >
          {locked ? (
            <Lock className="w-2.5 h-2.5" />
          ) : (
            <Unlock className="w-2.5 h-2.5" />
          )}
        </button>
      </div>

      {/* Empty state hint */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-xs text-muted-foreground/40 italic">
          {data.height > 100 && data.width > 150 ? 'Drag nodes here to group them' : ''}
        </span>
      </div>
    </div>
  )
}

export const GroupNode = memo(GroupNodeImpl)
