'use client'

/**
 * PropertiesPanel
 * ------------------------------------------------------------------
 * A floating inspector panel on the right side of the canvas. Appears
 * when one or more nodes are selected, offering quick edits to:
 *  - Fill color (palette)
 *  - Font size (for text-bearing nodes)
 *  - Dimensions (width / height)
 *  - Z-order (bring to front / send to back)
 *  - Quick actions (duplicate, delete)
 *
 * Reads the selected node's data directly from the Yjs map (via a
 * lightweight observer) and writes mutations through the NodeContext
 * API, so it never creates a second CRDT↔React Flow bridge.
 */
import { motion, AnimatePresence } from 'framer-motion'
import {
  SlidersHorizontal,
  Copy,
  Trash2,
  BringToFront,
  SendToBack,
  Square,
  Type,
  Lock,
  Unlock,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import * as Y from 'yjs'
import { useUIStore } from '@/store/ui-store'
import { getNodesMap, yMapToCanvasNode } from '@/lib/yjs/schema'
import { NODE_PALETTE } from '@/types/canvas'
import type { CanvasNode } from '@/types/canvas'
import { cn } from '@/lib/utils'

export function PropertiesPanel({ doc }: { doc: Y.Doc | null }) {
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds)
  const hasSelection = selectedNodeIds.length > 0

  // Subscribe to Yjs node changes for the primary selected node so the
  // panel stays in sync when remote peers edit the same node.
  const [primaryNode, setPrimaryNode] = useState<CanvasNode | null>(null)
  const primaryId = hasSelection ? selectedNodeIds[0] : null

  useEffect(() => {
    if (!doc || !primaryId) return
    const nodesMap = getNodesMap(doc)

    const refresh = () => {
      const ymap = nodesMap.get(primaryId) as Y.Map<unknown> | undefined
      if (!ymap) return
      setPrimaryNode(yMapToCanvasNode(ymap))
    }
    refresh()

    // Observe the specific node's nested map for data changes.
    const ymap = nodesMap.get(primaryId) as Y.Map<unknown> | undefined
    if (ymap) {
      ymap.observeDeep(refresh)
      return () => ymap.unobserveDeep(refresh)
    }
  }, [doc, primaryId])

  // ── Direct Yjs mutation helpers ──────────────────────────────
  // The PropertiesPanel is rendered OUTSIDE the NodeContext.Provider
  // (which only wraps <ReactFlow>), so we can't use useNodeContext().
  // Instead, we write directly to the Yjs nested maps. This is safe
  // because doc.transact() with doc.clientID origin ensures the
  // UndoManager tracks the change and remote peers receive it.
  const updateData = useCallback(
    (id: string, patch: Partial<CanvasNode['data']>) => {
      if (!doc) return
      const nodesMap = getNodesMap(doc)
      const ymap = nodesMap.get(id) as Y.Map<unknown> | undefined
      if (!ymap) return
      const data = ymap.get('data') as Y.Map<unknown>
      if (!data) return
      doc.transact(() => {
        for (const [k, v] of Object.entries(patch)) {
          data.set(k, v)
        }
      }, doc.clientID)
    },
    [doc]
  )

  const removeNodes = useCallback(
    (ids: string[]) => {
      if (!doc) return
      const nodesMap = getNodesMap(doc)
      doc.transact(() => {
        for (const id of ids) {
          nodesMap.delete(id)
        }
      }, doc.clientID)
      useUIStore.getState().setSelectedNodes([])
    },
    [doc]
  )

  const isTextLike =
    primaryNode &&
    (primaryNode.type === 'sticky' || primaryNode.type === 'text')

  // Only show the panel when the primary node exists AND matches the
  // current selection (avoids stale data flashing after deselection).
  const showPanel = primaryId && primaryNode && primaryNode.id === primaryId

  return (
    <AnimatePresence>
      {showPanel && (
        <motion.div
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-64 max-h-[80vh] overflow-y-auto rounded-2xl bg-card/95 backdrop-blur-md border shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent sticky top-0 bg-card/95 backdrop-blur z-10">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold flex-1">Properties</span>
            {selectedNodeIds.length > 1 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {selectedNodeIds.length} selected
              </span>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Node type badge */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                {primaryNode.type === 'text' ? (
                  <Type className="w-3.5 h-3.5" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium capitalize">
                  {primaryNode.type}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">
                  {primaryNode.id}
                </div>
              </div>
            </div>

            {/* Color palette */}
            <Section label="Fill color">
              <div className="grid grid-cols-6 gap-1.5">
                {NODE_PALETTE.map((p) => (
                  <button
                    key={p.name}
                    title={p.name}
                    onClick={() =>
                      updateData(primaryNode.id, {
                        color: p.bg,
                        stroke: p.stroke,
                      })
                    }
                    className={cn(
                      'w-7 h-7 rounded-lg border-2 transition-all hover:scale-110',
                      primaryNode.data.color === p.bg
                        ? 'border-foreground ring-1 ring-foreground/30'
                        : 'border-transparent'
                    )}
                    style={{ background: p.bg }}
                  />
                ))}
              </div>
            </Section>

            {/* Font size (text-bearing nodes only) */}
            {isTextLike && (
              <Section label="Font size">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={10}
                    max={48}
                    value={(primaryNode.data.fontSize as number) ?? 14}
                    onChange={(e) =>
                      updateData(primaryNode.id, {
                        fontSize: Number(e.target.value),
                      })
                    }
                    className="flex-1 accent-primary h-1.5"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-8 text-right tabular-nums">
                    {primaryNode.data.fontSize ?? 14}px
                  </span>
                </div>
              </Section>
            )}

            {/* Dimensions */}
            <Section label="Size">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Width
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={800}
                    value={Math.round(primaryNode.data.width as number)}
                    onChange={(e) =>
                      updateData(primaryNode.id, {
                        width: Math.max(40, Number(e.target.value)),
                      })
                    }
                    className="w-full px-2 py-1 text-sm rounded-md border bg-background tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Height
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={800}
                    value={Math.round(primaryNode.data.height as number)}
                    onChange={(e) =>
                      updateData(primaryNode.id, {
                        height: Math.max(40, Number(e.target.value)),
                      })
                    }
                    className="w-full px-2 py-1 text-sm rounded-md border bg-background tabular-nums"
                  />
                </div>
              </div>
            </Section>

            {/* Z-order */}
            <Section label="Layer">
              <div className="grid grid-cols-2 gap-2">
                <ActionButton
                  icon={BringToFront}
                  label="Front"
                  onClick={() =>
                    updateData(primaryNode.id, { zIndex: 100 })
                  }
                />
                <ActionButton
                  icon={SendToBack}
                  label="Back"
                  onClick={() =>
                    updateData(primaryNode.id, { zIndex: 0 })
                  }
                />
              </div>
            </Section>

            {/* Quick actions */}
            <div className="pt-2 border-t space-y-1">
              <ActionButton
                icon={Copy}
                label="Duplicate"
                fullWidth
                onClick={() => {
                  // Dispatch a duplicate event; the Board handles the
                  // actual Yjs mutation.
                  const dup = {
                    ...primaryNode,
                    id: Math.random().toString(36).slice(2, 10),
                    position: {
                      x: primaryNode.position.x + 24,
                      y: primaryNode.position.y + 24,
                    },
                  }
                  window.dispatchEvent(
                    new CustomEvent('collabcanvas:duplicate-node', {
                      detail: dup,
                    })
                  )
                }}
              />
              <ActionButton
                icon={Trash2}
                label="Delete"
                fullWidth
                variant="danger"
                onClick={() => removeNodes([primaryNode.id])}
              />
              {/* Lock toggle */}
              <ActionButton
                icon={primaryNode.data.locked ? Unlock : Lock}
                label={primaryNode.data.locked ? 'Unlock' : 'Lock'}
                fullWidth
                variant={primaryNode.data.locked ? 'default' : 'default'}
                onClick={() =>
                  updateData(primaryNode.id, {
                    locked: !primaryNode.data.locked,
                  })
                }
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
        {label}
      </div>
      {children}
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  fullWidth,
  variant = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  fullWidth?: boolean
  variant?: 'default' | 'danger'
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors',
        fullWidth && 'w-full',
        variant === 'danger'
          ? 'text-destructive border-destructive/20 hover:bg-destructive/10'
          : 'hover:bg-accent bg-background'
      )}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  )
}
