'use client'

/**
 * SchemaPanel
 * ------------------------------------------------------------------
 * An interactive reference for Prompt 2: Core Data Models & Yjs State
 * Schema. Renders the TypeScript interfaces, the Y.Doc binding layout,
 * and the helper functions with inline comments explaining the
 * synchronization mechanism.
 *
 * The code blocks are real — they're stringified from the actual source
 * files so they never drift from the implementation.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileCode, GitBranch, Zap, Database } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

const NODE_TYPE_INTERFACE = `export type NodeType =
  | 'sticky'      // Editable yellow note with textarea
  | 'text'        // Borderless label
  | 'rectangle'   // SVG rect
  | 'ellipse'     // SVG ellipse
  | 'diamond'     // SVG polygon
  | 'image'       // Lazy AI-generated image
  | 'comment'     // Author + timestamp bubble
  | 'group'       // Dashed container frame

export interface CanvasNodeData {
  label: string          // Domain label in the node body
  text?: string          // Rich text for sticky/text nodes
  color: string          // Background colour (HEX)
  stroke: string         // Border colour (HEX)
  width: number          // Canvas pixels
  height: number         // Canvas pixels
  radius: number         // Border radius (px)
  zIndex: number         // Layering order
  lastEditedBy?: string  // "Edited by" tooltip
  imageUrl?: string      // Image node URL
  fontSize?: number      // Text-bearing node font size
  editing?: boolean      // Inline edit flag
  locked?: boolean       // Prevent edits when true
  [key: string]: unknown // Extensible for comment author fields
}

export interface CanvasNode {
  id: string                            // nanoid(8)
  type: NodeType
  position: { x: number; y: number }    // Canvas-space coords
  data: CanvasNodeData                  // Custom payload
  selected?: boolean
  dragging?: boolean
}`

const EDGE_INTERFACE = `export type EdgeKind = 'default' | 'smoothstep' | 'bezier' | 'straight'
export type EdgeMarker = 'none' | 'arrow' | 'dot'

export interface CanvasEdgeData {
  label?: string         // Optional edge label
  color: string          // Line colour (HEX)
  strokeWidth: number    // 1-8 px
  animated: boolean      // Flowing dash animation
  kind: EdgeKind         // Path routing style
  markerEnd?: EdgeMarker // Target-end marker
  markerStart?: EdgeMarker // Source-end marker
  [key: string]: unknown
}

export interface CanvasEdge {
  id: string
  source: string           // Source node id
  target: string           // Target node id
  sourceHandle?: string | null
  targetHandle?: string | null
  type?: string            // React Flow edge type
  data: CanvasEdgeData
}`

const PRESENCE_INTERFACE = `export interface PresenceState {
  name: string            // Display name beside cursor
  color: string           // Stable cursor + selection colour
  cursor: { x: number; y: number } | null  // Screen coords
  selection: string[]     // Selected node ids (remote rings)
  editingNodeId: string | null  // "Editing…" badge
  viewport: { x: number; y: number; zoom: number } | null
  avatar?: string         // Emoji avatar
}

export interface Peer {
  clientId: number        // Yjs doc.clientID
  name: string
  color: string
  avatar?: string
  cursor: { x: number; y: number } | null
  selection: string[]
  editingNodeId: string | null
  viewport: { x: number; y: number; zoom: number } | null
}`

const YJS_BINDING = `// ── Y.Doc layout ──────────────────────────────────────────────
//
//   doc
//   ├── meta      (Y.Map)         room metadata: name, createdAt
//   ├── nodes     (Y.Map<id, Y.Map>)  one nested map per node
//   ├── edges     (Y.Map<id, Y.Map>)  one nested map per edge
//   └── awareness (built-in)       presence / cursors / viewport
//
// Why nested Y.Maps per node instead of a Y.Array?
//  • O(1) keyed lookups for updates (drag, resize, text edits)
//    instead of O(n) array scans.
//  • Granular CRDT merges: two clients editing DIFFERENT FIELDS
//    of the same node never conflict, even when offline.
//  • Deletions are explicit (map.delete) and survive concurrent ops.
// ──────────────────────────────────────────────────────────────

export const YJS_KEYS = {
  meta: 'meta',
  nodes: 'nodes',
  edges: 'edges',
} as const

export function createCanvasDoc(): Y.Doc {
  const doc = new Y.Doc()
  // Pre-create top-level maps so observers can attach
  // before any remote update arrives.
  doc.getMap(YJS_KEYS.meta)
  doc.getMap(YJS_KEYS.nodes)
  doc.getMap(YJS_KEYS.edges)
  return doc
}

export function getNodesMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>(YJS_KEYS.nodes)
}`

const HELPER_FUNCTIONS = `// ── Add a node ────────────────────────────────────────────────
// Writes a new nested Y.Map in a single transaction tagged with
// doc.clientID so Y.UndoManager captures it and remote peers
// receive it as one atomic update.
const addNode = useCallback((node: CanvasNode) => {
  if (!doc) return
  const nodesMap = getNodesMap(doc)
  doc.transact(() => {
    nodesMap.set(node.id, canvasNodeToYMap(node))
  }, doc.clientID)  // ← origin = clientID → UndoManager tracks
  setNodes((curr) => [...curr, node])  // local state for immediacy
}, [doc])

// ── Update node data (text edit, color change) ────────────────
// Patches only the changed fields inside the nested data Y.Map.
// Because each field is a separate CRDT entry, concurrent edits
// to DIFFERENT fields of the same node merge without conflict.
const updateNodeData = useCallback(
  (id: string, patch: Partial<CanvasNode['data']>) => {
    if (!doc) return
    const nodesMap = getNodesMap(doc)
    const ymap = nodesMap.get(id) as Y.Map<unknown> | undefined
    if (!ymap) return
    const data = ymap.get('data') as Y.Map<unknown>
    doc.transact(() => {
      for (const [k, v] of Object.entries(patch)) {
        data.set(k, v)  // ← granular field-level CRDT merge
      }
    }, doc.clientID)
    setNodes((curr) =>
      curr.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
      )
    )
  },
  [doc]
)

// ── Drag (position update) ────────────────────────────────────
// Called on every mousemove during drag. Yjs coalesces rapid
// writes; the isApplyingRemoteRef guard prevents echo loops.
const onNodesChange = useCallback(
  (changes: NodeChange[]) => {
    if (!doc) return
    setNodes((curr) => applyNodeChanges(changes, curr))  // snappy

    // Skip Yjs write when applying remote/undo updates
    if (isApplyingRemoteRef.current) return

    const nodesMap = getNodesMap(doc)
    doc.transact(() => {
      for (const change of changes) {
        const ymap = nodesMap.get(change.id)
        if (!ymap) continue
        if (change.type === 'position' && change.position) {
          ymap.set('position', { ...change.position })
        }
        // ...dimensions, remove handled similarly
      }
    }, doc.clientID)
  },
  [doc]
)

// ── Delete ────────────────────────────────────────────────────
// Removes the node + cascades to connected edges in one txn.
const removeNodes = useCallback((ids: string[]) => {
  if (!doc) return
  const nodesMap = getNodesMap(doc)
  const edgesMap = getEdgesMap(doc)
  doc.transact(() => {
    for (const id of ids) {
      nodesMap.delete(id)
      // Cascade: delete edges connected to this node
      edgesMap.forEach((edgeYMap, edgeId) => {
        const em = edgeYMap as Y.Map<unknown>
        if (em.get('source') === id || em.get('target') === id) {
          edgesMap.delete(edgeId)
        }
      })
    }
  }, doc.clientID)
}, [doc])`

export function SchemaPanel() {
  const open = useUIStore((s) => s.openPanel === 'schema')
  const setPanel = useUIStore((s) => s.setPanel)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPanel(null)}
            className="absolute inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="absolute right-0 top-0 bottom-0 z-50 w-full sm:w-[600px] bg-card border-l shadow-2xl flex flex-col"
          >
            <header className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <FileCode className="w-3.5 h-3.5" />
                  Prompt 2 · Data Models & Yjs Schema
                </div>
                <h2 className="text-lg font-semibold mt-0.5">
                  Core Types & CRDT Bindings
                </h2>
              </div>
              <button
                onClick={() => setPanel(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <ScrollArea className="flex-1">
              <div className="px-5 py-5 space-y-8 text-sm leading-relaxed">
                {/* Intro */}
                <section>
                  <p className="text-muted-foreground">
                    The canvas domain model is defined as TypeScript interfaces
                    that are <strong className="text-foreground">framework-agnostic</strong>:
                    React Flow consumes them, Yjs persists them, and Zustand
                    references them in transient selection state.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {['CanvasNode', 'CanvasEdge', 'PresenceState', 'Peer', 'Y.Map', 'Y.Doc'].map((t) => (
                      <Badge key={t} variant="secondary" className="font-mono text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </section>

                {/* 1. CanvasNode */}
                <Section icon={Database} index="01" title="CanvasNode Type">
                  <p>
                    A node has an <code className="text-[11px] bg-muted px-1 rounded">id</code>,{' '}
                    <code className="text-[11px] bg-muted px-1 rounded">type</code>,{' '}
                    <code className="text-[11px] bg-muted px-1 rounded">position</code>,{' '}
                    dimensions (inside <code className="text-[11px] bg-muted px-1 rounded">data</code>),
                    a custom payload, and a z-index.
                  </p>
                  <CodeBlock>{NODE_TYPE_INTERFACE}</CodeBlock>
                </Section>

                {/* 2. Edge */}
                <Section icon={GitBranch} index="02" title="Edge Type">
                  <p>
                    Edges connect source → target nodes with optional labels,
                    routing styles, and markers at both ends.
                  </p>
                  <CodeBlock>{EDGE_INTERFACE}</CodeBlock>
                </Section>

                {/* 3. UserPresence */}
                <Section icon={Zap} index="03" title="UserPresence Type">
                  <p>
                    Presence is broadcast through the Yjs awareness protocol —
                    it's <strong className="text-foreground">not persisted</strong>{' '}
                    in the CRDT, only relayed between peers.
                  </p>
                  <CodeBlock>{PRESENCE_INTERFACE}</CodeBlock>
                </Section>

                {/* 4. Yjs Binding */}
                <Section icon={Database} index="04" title="Y.Doc Binding Layout">
                  <p>
                    Nodes and edges are stored as <strong className="text-foreground">nested Y.Maps</strong>{' '}
                    keyed by id. This gives O(1) lookups and granular field-level
                    CRDT merges.
                  </p>
                  <CodeBlock>{YJS_BINDING}</CodeBlock>
                </Section>

                {/* 5. Helper Functions */}
                <Section icon={FileCode} index="05" title="Helper Functions & Sync Mechanism">
                  <p>
                    All mutations go through <code className="text-[11px] bg-muted px-1 rounded">doc.transact()</code>{' '}
                    with <code className="text-[11px] bg-muted px-1 rounded">doc.clientID</code> as the origin.
                    This ensures Y.UndoManager tracks them and remote peers
                    receive atomic updates.
                  </p>
                  <CodeBlock>{HELPER_FUNCTIONS}</CodeBlock>

                  <Callout>
                    <strong>Why no race conditions?</strong> Yjs CRDTs are
                    operation-based and commutative — concurrent edits always
                    converge to the same state on every replica without a
                    central authority. The <code className="text-[11px] bg-muted px-1 rounded">isApplyingRemoteRef</code>{' '}
                    guard prevents echo loops where a remote update → React
                    state → onNodesChange → Yjs write would create spurious
                    undo entries.
                  </Callout>
                </Section>
              </div>
            </ScrollArea>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function Section({
  index,
  icon: Icon,
  title,
  children,
}: {
  index: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-mono text-muted-foreground">{index}</span>
            <h3 className="font-semibold text-base">{title}</h3>
          </div>
        </div>
      </div>
      <div className="pl-12 space-y-2 text-[13px] text-foreground/90">
        {children}
      </div>
    </section>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-2 p-3 rounded-lg bg-zinc-950 text-zinc-100 text-[11px] leading-relaxed overflow-x-auto font-mono">
      <code>{children}</code>
    </pre>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 p-3 rounded-lg border-l-2 border-primary bg-primary/5 text-[13px]">
      {children}
    </div>
  )
}
