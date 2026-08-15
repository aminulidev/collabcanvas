'use client'

/**
 * StickyNoteNode — editable coloured note with an autosizing textarea.
 */
import { memo, useEffect, useRef } from 'react'
import { type NodeProps } from '@xyflow/react'
import { NodeShell, useNodeShellProps } from './node-shell'
import { useNodeContext } from './node-context'
import { useUIStore } from '@/store/ui-store'

interface StickyData {
  text: string
  color: string
  stroke: string
  width: number
  height: number
  radius: number
  zIndex: number
  fontSize: number
  editing?: boolean
  lastEditedBy?: string
}

function StickyNoteNodeImpl(props: NodeProps) {
  const shell = useNodeShellProps<Record<string, unknown>>(props)
  const stickyData = shell.data as StickyData
  const { updateData, beginEdit, endEdit, editingBy } = useNodeContext()
  const editingNodeId = useUIStore((s) => s.editingNodeId)
  const isEditing = editingNodeId === props.id
  const remoteEditor = editingBy[props.id]

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  return (
    <NodeShell
      {...shell}
      editing={isEditing}
      editedBy={isEditing ? undefined : remoteEditor?.name}
      editedByColor={remoteEditor?.color}
      onToggleLock={() => updateData(props.id, { locked: !shell.locked })}
    >
      <div className="w-full h-full p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] uppercase tracking-wider font-semibold opacity-70"
            style={{ color: stickyData.stroke }}
          >
            Note
          </span>
          <div
            className="w-3 h-3 rounded-sm shadow-sm"
            style={{ background: stickyData.stroke }}
          />
        </div>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={stickyData.text}
            onChange={(e) => updateData(props.id, { text: e.target.value })}
            onBlur={endEdit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                endEdit()
              }
            }}
            className="flex-1 w-full bg-transparent resize-none outline-none text-sm leading-relaxed text-foreground placeholder:text-muted-foreground"
            style={{ fontSize: stickyData.fontSize }}
            placeholder="Type your note…"
          />
        ) : (
          <div
            className="flex-1 w-full overflow-hidden whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90 cursor-text"
            style={{ fontSize: stickyData.fontSize }}
            onDoubleClick={() => beginEdit(props.id)}
          >
            {stickyData.text || (
              <span className="text-muted-foreground/70 italic">
                Double-click to edit
              </span>
            )}
          </div>
        )}
      </div>
    </NodeShell>
  )
}

export const StickyNoteNode = memo(StickyNoteNodeImpl)
