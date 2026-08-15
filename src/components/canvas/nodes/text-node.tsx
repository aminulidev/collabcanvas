'use client'

/**
 * TextNode — borderless, transparent text label. No handles so it never
 * accidentally starts a connection.
 */
import { memo, useEffect, useRef } from 'react'
import { type NodeProps } from '@xyflow/react'
import { useNodeContext } from './node-context'
import { useUIStore } from '@/store/ui-store'

interface TextData {
  text: string
  color: string
  stroke: string
  width: number
  height: number
  fontSize: number
  zIndex: number
  lastEditedBy?: string
}

function TextNodeImpl(props: NodeProps) {
  const data = props.data as TextData
  const { updateData, beginEdit, endEdit, editingBy } = useNodeContext()
  const editingNodeId = useUIStore((s) => s.editingNodeId)
  const isEditing = editingNodeId === props.id
  const remoteEditor = editingBy[props.id]
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && ref.current) ref.current.focus()
  }, [isEditing])

  const remoteBadge = isEditing ? null : remoteEditor

  return (
    <div
      className="relative"
      style={{
        width: data.width,
        minHeight: data.height,
        zIndex: data.zIndex,
      }}
    >
      {isEditing ? (
        <textarea
          ref={ref}
          value={data.text}
          onChange={(e) => updateData(props.id, { text: e.target.value })}
          onBlur={endEdit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              endEdit()
            }
          }}
          rows={1}
          className="w-full bg-transparent resize-none outline-none text-foreground font-medium"
          style={{
            fontSize: data.fontSize,
            lineHeight: 1.3,
            color: data.stroke,
          }}
          placeholder="Text…"
        />
      ) : (
        <div
          className="w-full cursor-text select-none"
          style={{
            fontSize: data.fontSize,
            lineHeight: 1.3,
            color: data.stroke,
            minHeight: data.height,
          }}
          onDoubleClick={() => beginEdit(props.id)}
        >
          {data.text || (
            <span className="opacity-50 italic">Double-click to edit</span>
          )}
        </div>
      )}
      {remoteBadge && (
        <div
          className="absolute -top-5 left-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white shadow-sm pointer-events-none"
          style={{ background: remoteBadge.color }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {remoteBadge.name}
        </div>
      )}
    </div>
  )
}

export const TextNode = memo(TextNodeImpl)
