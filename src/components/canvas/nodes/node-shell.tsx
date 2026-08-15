'use client'

/**
 * NodeShell
 * ------------------------------------------------------------------
 * Shared chrome for every canvas node: selection ring, connection
 * handles, remote-edit badge, and a consistent hit area.
 *
 * Concrete node types render their body inside `<NodeShell.Body>`.
 */
import { memo, type ReactNode } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { useNodeContext } from './node-context'

interface NodeShellProps {
  selected: boolean
  width: number
  height: number
  radius: number
  color: string
  stroke: string
  zIndex: number
  editing: boolean
  /** Node id — used to look up remote selection rings. */
  nodeId: string
  editedBy?: string
  /** Cursor colour of the peer currently editing this node. */
  editedByColor?: string
  /** When true, a lock badge is shown and the node dims slightly. */
  locked?: boolean
  /** Callback when the lock toggle is clicked. */
  onToggleLock?: () => void
  children: ReactNode
  className?: string
  /** Hide connection handles (e.g. for text nodes). */
  hideHandles?: boolean
  /** Disable default body styles (image node draws its own). */
  bare?: boolean
}

function NodeShellImpl({
  selected,
  width,
  height,
  radius,
  color,
  stroke,
  zIndex,
  editing,
  nodeId,
  editedBy,
  editedByColor,
  locked,
  onToggleLock,
  children,
  className,
  hideHandles,
  bare,
}: NodeShellProps) {
  // Read remote selections from the node context to render peer rings.
  const { remoteSelections } = useNodeContext()
  const peerColors = remoteSelections?.[nodeId] ?? []

  return (
    <div
      className={cn(
        'relative group transition-all duration-150',
        selected && 'ring-2 ring-offset-2 ring-offset-transparent',
        editing && 'outline-none',
        locked && 'opacity-70',
        !bare && !locked && 'hover:shadow-lg',
        className
      )}
      style={{
        width,
        height,
        borderRadius: radius,
        background: bare ? 'transparent' : color,
        border: bare ? 'none' : `1.5px solid ${stroke}30`,
        zIndex,
        boxShadow: [
          selected
            ? `0 0 0 2px ${stroke}, 0 4px 16px ${stroke}30, 0 2px 4px rgba(0,0,0,0.06)`
            : bare
              ? 'none'
              : `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`,
          ...peerColors.map(
            (c, i) => `0 0 0 ${(i + 1) * 3 + 2}px ${c}40`
          ),
        ].join(', '),
      }}
    >
      {!hideHandles && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            className="!h-2.5 !w-2.5 !bg-white !border-2 hover:!scale-125 transition-transform opacity-0 group-hover:opacity-100"
            style={{ borderColor: stroke }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="!h-2.5 !w-2.5 !bg-white !border-2 hover:!scale-125 transition-transform opacity-0 group-hover:opacity-100"
            style={{ borderColor: stroke }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left"
            className="!h-2.5 !w-2.5 !bg-white !border-2 hover:!scale-125 transition-transform opacity-0 group-hover:opacity-100"
            style={{ borderColor: stroke }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            className="!h-2.5 !w-2.5 !bg-white !border-2 hover:!scale-125 transition-transform opacity-0 group-hover:opacity-100"
            style={{ borderColor: stroke }}
          />
        </>
      )}

      {children}

      {/* Lock badge — shown when locked, or as a toggle when selected */}
      {(locked || (selected && onToggleLock)) && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock?.()
          }}
          className={cn(
            'absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md transition-all pointer-events-auto z-10',
            locked
              ? 'bg-amber-500 text-white opacity-100'
              : 'bg-white text-muted-foreground opacity-0 group-hover:opacity-100 hover:scale-110'
          )}
          title={locked ? 'Unlock node' : 'Lock node'}
        >
          {locked ? (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          ) : (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 7.5-2" />
            </svg>
          )}
        </button>
      )}

      {editedBy && (
        <div
          className="absolute -top-5 right-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white shadow-sm pointer-events-none"
          style={{ background: editedByColor ?? '#64748B' }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {editedBy} editing
        </div>
      )}
    </div>
  )
}

export const NodeShell = memo(NodeShellImpl)

/** Helper to extract the common props from a React Flow NodeProps. */
export function useNodeShellProps<T extends Record<string, unknown>>(
  props: NodeProps
) {
  const data = props.data as T & {
    color: string
    stroke: string
    width: number
    height: number
    radius: number
    zIndex: number
    editing?: boolean
    lastEditedBy?: string
    locked?: boolean
  }
  return {
    data,
    nodeId: String(props.id),
    selected: !!props.selected,
    width: data.width,
    height: data.height,
    radius: data.radius,
    color: data.color,
    stroke: data.stroke,
    zIndex: data.zIndex,
    editing: !!data.editing,
    editedBy: data.lastEditedBy,
    locked: !!data.locked,
  }
}
