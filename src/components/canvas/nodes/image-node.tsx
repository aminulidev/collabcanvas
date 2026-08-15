'use client'

/**
 * ImageNode — displays an AI-generated or stock image. The image is
 * lazy-loaded and decoded off the main thread to keep panning smooth.
 */
import { memo, useState } from 'react'
import { type NodeProps } from '@xyflow/react'
import { NodeShell, useNodeShellProps } from './node-shell'
import { useNodeContext } from './node-context'
import { ImageIcon } from 'lucide-react'

interface ImageData {
  imageUrl: string
  label: string
  color: string
  stroke: string
  width: number
  height: number
  radius: number
  zIndex: number
}

function ImageNodeImpl(props: NodeProps) {
  const shell = useNodeShellProps<Record<string, unknown>>(props)
  const data = shell.data as ImageData
  const { editingBy, updateData } = useNodeContext()
  const [loaded, setLoaded] = useState(false)
  const remoteEditor = editingBy[props.id]

  return (
    <NodeShell
      {...shell}
      bare
      editedBy={remoteEditor?.name}
      editedByColor={remoteEditor.color}
      onToggleLock={() => updateData(props.id, { locked: !shell.locked })}
    >
      <div
        className="w-full h-full overflow-hidden bg-muted/40 flex items-center justify-center"
        style={{ borderRadius: shell.radius }}
      >
        {data.imageUrl ? (
          <>
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <ImageIcon className="w-6 h-6 animate-pulse" />
              </div>
            )}
            <img
              src={data.imageUrl}
              alt={data.label}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              className="w-full h-full object-cover transition-opacity duration-300"
              style={{ opacity: loaded ? 1 : 0, borderRadius: shell.radius }}
              draggable={false}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="w-6 h-6" />
            <span className="text-[10px]">No image</span>
          </div>
        )}
      </div>
    </NodeShell>
  )
}

export const ImageNode = memo(ImageNodeImpl)
