'use client'

/**
 * CommentNode
 * ------------------------------------------------------------------
 * A speech-bubble-style comment node with author attribution (name +
 * avatar colour) and a relative timestamp. Designed for async
 * annotations — "leaving a note" on a colleague's design.
 *
 * Unlike sticky notes, comments are read-only after creation (edit the
 * text via the properties panel or double-click).
 */
import { memo, useEffect, useRef, useState } from 'react'
import { type NodeProps } from '@xyflow/react'
import { NodeShell, useNodeShellProps } from './node-shell'
import { useNodeContext } from './node-context'
import { useUIStore } from '@/store/ui-store'
import { MessageSquare } from 'lucide-react'

interface CommentData {
  text: string
  authorName: string
  authorColor: string
  authorAvatar?: string
  createdAt: number
  color: string
  stroke: string
  width: number
  height: number
  radius: number
  zIndex: number
  fontSize: number
  lastEditedBy?: string
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function CommentNodeImpl(props: NodeProps) {
  const shell = useNodeShellProps<Record<string, unknown>>(props)
  const data = shell.data as CommentData
  const { beginEdit, endEdit, editingBy, updateData } = useNodeContext()
  const editingNodeId = useUIStore((s) => s.editingNodeId)
  const isEditing = editingNodeId === props.id
  const remoteEditor = editingBy[props.id]
  const ref = useRef<HTMLTextAreaElement>(null)
  const [, forceTick] = useState(0)

  // Re-render every 30s so the relative timestamp stays fresh.
  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isEditing && ref.current) ref.current.focus()
  }, [isEditing])

  return (
    <NodeShell
      {...shell}
      bare
      editedBy={remoteEditor?.name}
      editedByColor={remoteEditor?.color}
      onToggleLock={() => updateData(props.id, { locked: !shell.locked })}
    >
      <div
        className="w-full h-full flex flex-col bg-white rounded-lg shadow-md overflow-hidden"
        style={{ borderRadius: shell.radius }}
      >
        {/* Author header */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 shrink-0"
          style={{ background: data.authorColor }}
        >
          <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-[10px]">
            {data.authorAvatar ?? data.authorName.slice(0, 1).toUpperCase()}
          </div>
          <span className="text-[11px] font-medium text-white truncate flex-1">
            {data.authorName}
          </span>
          <MessageSquare className="w-3 h-3 text-white/70" />
        </div>

        {/* Body */}
        {isEditing ? (
          <textarea
            ref={ref}
            value={data.text}
            onChange={(e) => {
              // `updateData` is already available from the context above.
              const ctx = { updateData } // alias for clarity
              ctx.updateData(props.id, { text: e.target.value })
            }}
            onBlur={endEdit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                endEdit()
              }
            }}
            className="flex-1 w-full px-2.5 py-1.5 text-xs resize-none outline-none bg-white"
            style={{ fontSize: data.fontSize }}
            placeholder="Write a comment…"
          />
        ) : (
          <div
            className="flex-1 px-2.5 py-1.5 text-xs text-foreground/90 overflow-hidden whitespace-pre-wrap break-words cursor-text"
            style={{ fontSize: data.fontSize }}
            onDoubleClick={() => beginEdit(props.id)}
          >
            {data.text || (
              <span className="text-muted-foreground/60 italic">
                Empty comment
              </span>
            )}
          </div>
        )}

        {/* Timestamp footer */}
        <div className="px-2.5 py-1 text-[9px] text-muted-foreground border-t bg-muted/30 shrink-0">
          {relativeTime(data.createdAt)}
        </div>
      </div>
    </NodeShell>
  )
}

export const CommentNode = memo(CommentNodeImpl)
