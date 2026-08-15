'use client'

/**
 * EdgePropertiesPanel
 * ------------------------------------------------------------------
 * When an edge (connection) is selected, this panel replaces the node
 * properties panel. Lets the user edit the edge's color, stroke width,
 * animated state, and label.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { Waypoints, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { useUIStore } from '@/store/ui-store'
import { getEdgesMap, yMapToCanvasEdge } from '@/lib/yjs/schema'
import type { CanvasEdge } from '@/types/canvas'
import { cn } from '@/lib/utils'

const EDGE_COLORS = [
  { name: 'Slate', color: '#64748B' },
  { name: 'Rose', color: '#F43F5E' },
  { name: 'Amber', color: '#F59E0B' },
  { name: 'Emerald', color: '#10B981' },
  { name: 'Sky', color: '#0EA5E9' },
  { name: 'Violet', color: '#8B5CF6' },
]

interface Props {
  doc: Y.Doc | null
}

export function EdgePropertiesPanel({ doc }: Props) {
  const selectedEdgeIds = useUIStore((s) => s.selectedEdgeIds)
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds)
  const hasEdgeSelection =
    selectedEdgeIds.length > 0 && selectedNodeIds.length === 0

  const [edge, setEdge] = useState<CanvasEdge | null>(null)
  const primaryId = hasEdgeSelection ? selectedEdgeIds[0] : null

  // Subscribe to the Yjs edge map so the panel stays in sync.
  useEffect(() => {
    if (!doc || !primaryId) return
    const edgesMap = getEdgesMap(doc)

    const refresh = () => {
      const ymap = edgesMap.get(primaryId) as Y.Map<unknown> | undefined
      if (!ymap) return
      setEdge(yMapToCanvasEdge(ymap))
    }
    refresh()

    const ymap = edgesMap.get(primaryId) as Y.Map<unknown> | undefined
    if (ymap) {
      ymap.observeDeep(refresh)
      return () => ymap.unobserveDeep(refresh)
    }
  }, [doc, primaryId])

  const updateEdge = (patch: Partial<CanvasEdge['data']>) => {
    if (!doc || !edge) return
    const edgesMap = getEdgesMap(doc)
    const ymap = edgesMap.get(edge.id) as Y.Map<unknown> | undefined
    if (!ymap) return
    const data = ymap.get('data') as Y.Map<unknown>
    doc.transact(() => {
      for (const [k, v] of Object.entries(patch)) {
        data.set(k, v)
      }
    }, doc.clientID)
  }

  const showPanel = primaryId && edge && edge.id === primaryId

  return (
    <AnimatePresence>
      {showPanel && edge && (
        <motion.div
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-64 max-h-[80vh] overflow-y-auto rounded-2xl bg-card/95 backdrop-blur-md border shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent sticky top-0 bg-card/95 backdrop-blur z-10">
            <Waypoints className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold flex-1">Connection</span>
          </div>

          <div className="p-4 space-y-4">
            {/* Edge info */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Waypoints className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium">Edge</div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">
                  {edge.source} → {edge.target}
                </div>
              </div>
            </div>

            {/* Color */}
            <Section label="Line color">
              <div className="grid grid-cols-6 gap-1.5">
                {EDGE_COLORS.map((c) => (
                  <button
                    key={c.name}
                    title={c.name}
                    onClick={() => updateEdge({ color: c.color })}
                    className={cn(
                      'w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center',
                      edge.data.color === c.color
                        ? 'border-foreground ring-1 ring-foreground/30'
                        : 'border-transparent'
                    )}
                    style={{ background: c.color }}
                  />
                ))}
              </div>
            </Section>

            {/* Stroke width */}
            <Section label="Thickness">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={edge.data.strokeWidth}
                  onChange={(e) =>
                    updateEdge({ strokeWidth: Number(e.target.value) })
                  }
                  className="flex-1 accent-primary h-1.5"
                />
                <span className="text-xs font-mono text-muted-foreground w-8 text-right tabular-nums">
                  {edge.data.strokeWidth}px
                </span>
              </div>
            </Section>

            {/* Label */}
            <Section label="Label">
              <input
                type="text"
                value={edge.data.label ?? ''}
                onChange={(e) => updateEdge({ label: e.target.value })}
                placeholder="Add a label…"
                className="w-full px-2 py-1.5 text-sm rounded-md border bg-background outline-none focus:ring-1 focus:ring-ring"
              />
            </Section>

            {/* Routing */}
            <Section label="Path style">
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { id: 'bezier', label: 'Curved' },
                  { id: 'smoothstep', label: 'Step' },
                  { id: 'straight', label: 'Line' },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => updateEdge({ kind: opt.id })}
                    className={cn(
                      'px-2 py-1.5 rounded-md text-[11px] font-medium border transition-colors',
                      (edge.data.kind ?? 'bezier') === opt.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-accent bg-background'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Section>

            {/* End marker */}
            <Section label="End marker">
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { id: 'arrow', label: '→ Arrow' },
                  { id: 'dot', label: '• Dot' },
                  { id: 'none', label: 'None' },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => updateEdge({ markerEnd: opt.id })}
                    className={cn(
                      'px-2 py-1.5 rounded-md text-[11px] font-medium border transition-colors',
                      (edge.data.markerEnd ?? 'arrow') === opt.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-accent bg-background'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Section>

            {/* Start marker */}
            <Section label="Start marker">
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { id: 'none', label: 'None' },
                  { id: 'arrow', label: '← Arrow' },
                  { id: 'dot', label: '• Dot' },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => updateEdge({ markerStart: opt.id })}
                    className={cn(
                      'px-2 py-1.5 rounded-md text-[11px] font-medium border transition-colors',
                      (edge.data.markerStart ?? 'none') === opt.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-accent bg-background'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Section>

            {/* Animated toggle */}
            <Section label="Animation">
              <button
                onClick={() => updateEdge({ animated: !edge.data.animated })}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-md border transition-colors text-sm',
                  edge.data.animated
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'hover:bg-accent'
                )}
              >
                <span>Flowing dash animation</span>
                <span
                  className={cn(
                    'relative w-9 h-5 rounded-full transition-colors',
                    edge.data.animated ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      edge.data.animated ? 'translate-x-4' : 'translate-x-0.5'
                    )}
                  />
                </span>
              </button>
            </Section>

            {/* Delete */}
            <div className="pt-2 border-t">
              <button
                onClick={() => {
                  // Remove edge via Yjs
                  if (doc) {
                    const edgesMap = getEdgesMap(doc)
                    doc.transact(() => {
                      edgesMap.delete(edge.id)
                    }, doc.clientID)
                  }
                  useUIStore.getState().setSelectedEdges([])
                }}
                className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs font-medium border text-destructive border-destructive/20 hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete connection
              </button>
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

// (no trailing voids needed — all imports are used)
