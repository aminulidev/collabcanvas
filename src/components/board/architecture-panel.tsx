'use client'

/**
 * ArchitecturePanel
 * ------------------------------------------------------------------
 * The complete technical design document, rendered as a slide-out
 * reference panel so the architecture lives *inside* the product it
 * describes — a portfolio piece.
 *
 * Sections:
 *  1. Component Hierarchy & Architecture
 *  2. State Management Architecture
 *  3. Real-Time Sync & Conflict Resolution
 *  4. Canvas Performance Strategies
 */
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Layers,
  Database,
  GitBranch,
  Gauge,
  Folder,
  Boxes,
  Cpu,
  Network,
  Zap,
} from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const folderTree = `src/
├─ app/
│  ├─ page.tsx                  # Hero + board shell (single route)
│  └─ api/
│     └─ generate-image/       # AI image node backend
├─ components/
│  ├─ canvas/                  # ── Canvas engine ──
│  │  ├─ canvas.tsx            # React Flow wrapper, tool routing
│  │  ├─ toolbar.tsx           # Tool palette + undo/redo
│  │  ├─ nodes/
│  │  │  ├─ node-shell.tsx     # Shared selection/handle chrome
│  │  │  ├─ node-context.ts    # Mutation API (not serialised)
│  │  │  ├─ sticky-note-node   # Editable textarea note
│  │  │  ├─ text-node          # Borderless label
│  │  │  ├─ shape-node         # SVG rect/ellipse/diamond
│  │  │  └─ image-node         # Lazy <img>, AI-generated
│  │  └─ edges/animated-edge
│  ├─ collaboration/           # ── Networking layer ──
│  │  ├─ cursor-overlay        # Live remote cursors (rAF throttled)
│  │  └─ presence-bar          # Online avatars + connection status
│  └─ board/                   # ── UI overlay ──
│     ├─ board.tsx             # Composes canvas + overlays
│     ├─ top-bar.tsx           # Branding, room, presence
│     └─ architecture-panel    # This document
├─ hooks/
│  ├─ use-yjs-document         # Y.Doc + provider + UndoManager lifecycle
│  ├─ use-canvas-nodes         # CRDT ↔ React Flow bridge (no loops)
│  ├─ use-awareness            # Presence / cursor broadcast
│  └─ use-undo-redo            # Y.UndoManager + keyboard shortcuts
├─ store/
│  ├─ ui-store                 # Transient local state (Zustand)
│  └─ identity-store           # Persistent local identity
├─ lib/
│  ├─ yjs/
│  │  ├─ schema.ts             # Nested Y.Map layout, serializers
│  │  └─ provider.ts           # y-websocket factory (gateway-aware)
│  └─ canvas/utils.ts          # Geometry, throttle, factories
└─ types/canvas.ts             # Shared domain model
mini-services/
└─ yjs-sync/                   # Standalone CRDT sync server (port 3004)`

const stateMatrix = [
  {
    layer: 'Local transient',
    store: 'Zustand (ui-store)',
    items: 'viewport pan/zoom, active tool, hover, selection, edit-in-progress, space-down, panel open',
    sync: 'Never synced — changes 60×/sec, no peer relevance',
    persist: 'In-memory, per session',
  },
  {
    layer: 'Local identity',
    store: 'Zustand (identity-store) + localStorage',
    items: 'display name, colour, avatar emoji',
    sync: 'Pushed into awareness on change',
    persist: 'localStorage (stable across reloads)',
  },
  {
    layer: 'Shared CRDT',
    store: 'Y.Doc → Y.Map<id, Y.Map>',
    items: 'nodes, edges, node data fields, document meta',
    sync: 'Yjs sync over WebSocket; merges converge everywhere',
    persist: 'In-room (yjs-sync keeps doc in memory)',
  },
  {
    layer: 'Presence / ephemeral',
    store: 'Yjs awareness',
    items: 'cursor screen-pos, current selection, name/colour',
    sync: 'Awareness protocol; relayed, never persisted',
    persist: 'Cleared on disconnect',
  },
]

const perfStrategies = [
  {
    icon: Gauge,
    title: '60 FPS viewport rendering',
    body: 'React Flow renders only visible nodes (built-in virtualisation). Transforms are GPU-accelerated via CSS `transform: translate3d()`. Node bodies are memoised with React.memo so unrelated prop changes never re-render them.',
  },
  {
    icon: Layers,
    title: 'Canvas virtualisation (culling)',
    body: 'React Flow’s `onlyRenderVisibleElements` skips off-screen nodes. We additionally expose `isNodeVisible()` for custom overlays so the cursor overlay never iterates peers whose cursors are outside the viewport.',
  },
  {
    icon: Zap,
    title: 'Debounced high-frequency input',
    body: 'Mouse-move → awareness is throttled with requestAnimationFrame (`rafThrottle`), so at most one network write per frame (~16ms). Node-drag writes to Yjs on every change but Yjs coalesces them; the UndoManager groups them into a single undo step via `captureTimeout: 250ms`.',
  },
  {
    icon: Cpu,
    title: 'Controlled state, no echo loops',
    body: 'We tag local writes with a sentinel origin; Yjs observers skip updates that originated from us, so user input → Yjs → React state never re-feeds into Yjs. Remote updates flow Yjs → React state with no return path.',
  },
  {
    icon: Network,
    title: 'Single socket, binary protocol',
    body: 'All peers in a room share one WebSocket to yjs-sync. Updates are binary-encoded with lib0 (compact varint + delta encoding) — a typical node move is ~40 bytes on the wire.',
  },
]

import { Gauge as GaugeIcon } from 'lucide-react'

export function ArchitecturePanel() {
  const open = useUIStore((s) => s.openPanel === 'architecture')
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
            className="absolute right-0 top-0 bottom-0 z-50 w-full sm:w-[540px] bg-card border-l shadow-2xl flex flex-col overflow-hidden"
          >
            <header className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent shrink-0">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <Boxes className="w-3.5 h-3.5" />
                  Technical Design Document
                </div>
                <h2 className="text-lg font-semibold mt-0.5">
                  Collaborative Canvas — Architecture
                </h2>
              </div>
              <button
                onClick={() => setPanel(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8 text-sm leading-relaxed scrollbar-none">
                {/* Intro */}
                <section>
                  <p className="text-muted-foreground">
                    A real-time, multiplayer infinite canvas built on{' '}
                    <strong className="text-foreground">Yjs CRDTs</strong>,{' '}
                    <strong className="text-foreground">React Flow</strong>, and a
                    purpose-built WebSocket sync service. The design prioritises{' '}
                    <em>eventual consistency</em>, <em>60 FPS interactivity</em>,
                    and a clean separation between the canvas engine, the UI
                    overlay, and the networking layer.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {['Next.js 16', 'TypeScript', 'Tailwind', 'Zustand', 'Yjs', 'y-websocket', 'React Flow'].map((t) => (
                      <Badge key={t} variant="secondary" className="font-mono text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </section>

                {/* 1. Component Hierarchy */}
                <Section
                  index="01"
                  icon={Folder}
                  title="Component Hierarchy & Architecture"
                  summary="Three layers with strict boundaries: the canvas engine owns pixels & input, the UI overlay owns chrome & panels, the networking layer owns CRDT transport."
                >
                  <p>
                    Every file lives in exactly one of three buckets. A component
                    in the <em>UI overlay</em> never touches Yjs directly — it
                    reads from hooks that expose already-resolved React state.
                    This keeps re-render boundaries predictable and makes the
                    canvas engine swappable (we could swap React Flow for Konva
                    without touching the networking layer).
                  </p>
                  <CodeBlock>{folderTree}</CodeBlock>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <LayerCard
                      title="Canvas Engine"
                      color="bg-amber-50 text-amber-900 border-amber-200"
                      items={['React Flow', 'Custom nodes', 'Tool routing', 'Hit-testing']}
                    />
                    <LayerCard
                      title="UI Overlay"
                      color="bg-emerald-50 text-emerald-900 border-emerald-200"
                      items={['Top bar', 'Toolbar', 'Presence', 'Architecture']}
                    />
                    <LayerCard
                      title="Networking"
                      color="bg-violet-50 text-violet-900 border-violet-200"
                      items={['Yjs provider', 'Awareness', 'yjs-sync service', 'UndoManager']}
                    />
                  </div>
                </Section>

                {/* 2. State Management */}
                <Section
                  index="02"
                  icon={Database}
                  title="State Management Architecture"
                  summary="Two stores with fundamentally different semantics: Zustand for ephemeral local state, Yjs for replicated shared truth."
                >
                  <p>
                    The most common bug in collaborative editors is accidentally
                    syncing transient state (current viewport, hover highlight)
                    through the CRDT — it floods the socket and creates ghost
                    cursors. We prevent this by assigning every piece of state to
                    exactly one of four layers:
                  </p>
                  <div className="overflow-x-auto -mx-1 mt-3">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-2 font-semibold">Layer</th>
                          <th className="text-left p-2 font-semibold">Store</th>
                          <th className="text-left p-2 font-semibold">Synced?</th>
                          <th className="text-left p-2 font-semibold">Persisted?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stateMatrix.map((row) => (
                          <tr key={row.layer} className="border-b last:border-0">
                            <td className="p-2 align-top font-medium">
                              {row.layer}
                              <div className="text-muted-foreground font-normal mt-1">
                                {row.items}
                              </div>
                            </td>
                            <td className="p-2 align-top font-mono text-[11px]">
                              {row.store}
                            </td>
                            <td className="p-2 align-top">{row.sync}</td>
                            <td className="p-2 align-top">{row.persist}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Callout>
                    <strong>Why nested Y.Maps?</strong> Each node is a{' '}
                    <code className="text-[11px] bg-muted px-1 rounded">Y.Map&lt;id, Y.Map&gt;</code>{' '}
                    so field-level updates (e.g. editing text without moving the
                    node) merge without conflict, even when two clients edit the{' '}
                    same node concurrently offline.
                  </Callout>
                </Section>

                {/* 3. Real-Time Sync */}
                <Section
                  index="03"
                  icon={GitBranch}
                  title="Real-Time Sync & Conflict Resolution"
                  summary="Yjs CRDTs guarantee convergence; awareness handles presence; Y.UndoManager gives per-user undo without clobbering peers."
                >
                  <h4 className="font-semibold mt-1">Document layout</h4>
                  <CodeBlock>{`doc
├─ meta:    Y.Map    # room name, createdAt
├─ nodes:   Y.Map<id, Y.Map>   # one map per node
│   └─ <id>: { id, type, position, data: Y.Map }
├─ edges:   Y.Map<id, Y.Map>   # one map per edge
└─ awareness (built-in)        # presence / cursors`}</CodeBlock>

                  <h4 className="font-semibold mt-3">Sync protocol</h4>
                  <p>
                    On connect, the client sends{' '}
                    <code className="text-[11px] bg-muted px-1 rounded">sync step 1</code>{' '}
                    (its state vector). The server replies with{' '}
                    <code className="text-[11px] bg-muted px-1 rounded">step 2</code>{' '}
                    (the missing updates) so the client catches up in one round
                    trip. Subsequent edits broadcast as{' '}
                    <code className="text-[11px] bg-muted px-1 rounded">update</code>{' '}
                    messages to every other peer in the room.
                  </p>

                  <h4 className="font-semibold mt-3">Awareness & presence</h4>
                  <p>
                    Awareness is a separate, <em>non-persisted</em> protocol on
                    the same socket. Each client broadcasts a small JSON payload
                    (name, colour, cursor position, selection). The server relays
                    it to other peers but never stores it — on disconnect, the
                    server emits a removal so cursors vanish instantly.
                  </p>
                  <CodeBlock>{`// Local cursor → awareness (rAF throttled)
const push = rafThrottle((x, y) => {
  provider.awareness.setLocalStateField('cursor', { x, y })
})
canvas.addEventListener('mousemove', (e) => {
  push(e.clientX - rect.left, e.clientY - rect.top)
})`}</CodeBlock>

                  <h4 className="font-semibold mt-3">Undo / redo</h4>
                  <p>
                    <code className="text-[11px] bg-muted px-1 rounded">Y.UndoManager</code>{' '}
                    tracks structural operations on the nodes + edges maps. It is
                    scoped to the local client’s origin, so my undo never reverts
                    your edits — a critical property for multiplayer. Rapid drags
                    collapse into one undo entry via{' '}
                    <code className="text-[11px] bg-muted px-1 rounded">captureTimeout: 250ms</code>.
                  </p>
                  <Callout>
                    <strong>Conflict resolution:</strong> Yjs CRDTs are
                    operation-based and commutative, so concurrent edits always
                    converge to the same state on every replica without a central
                    authority. Last-writer-wins per field; deletes win over
                    updates (tombstoned).
                  </Callout>
                </Section>

                {/* 4. Performance */}
                <Section
                  index="04"
                  icon={GaugeIcon}
                  title="Canvas Performance Strategies"
                  summary="Four levers: cull, throttle, memoise, batch. Each targets a specific bottleneck in the 60 FPS budget."
                >
                  <div className="space-y-2.5 mt-1">
                    {perfStrategies.map((s) => (
                      <div
                        key={s.title}
                        className="flex gap-3 p-3 rounded-lg border bg-muted/20"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <s.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-[13px]">
                            {s.title}
                          </div>
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {s.body}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>

                <div className="pt-4 border-t text-[11px] text-muted-foreground">
                  <p>
                    This document is rendered from the same codebase it
                    describes. Open the Architecture panel any time to revisit it.
                  </p>
                </div>
              </div>

              <footer className="px-5 py-3.5 border-t bg-muted/20 flex justify-end shrink-0">
                <Button size="sm" variant="outline" onClick={() => setPanel(null)}>
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Close Panel
                </Button>
              </footer>
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
  summary,
  children,
}: {
  index: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  summary: string
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
            <span className="text-[11px] font-mono text-muted-foreground">
              {index}
            </span>
            <h3 className="font-semibold text-base">{title}</h3>
          </div>
          <p className="text-muted-foreground text-xs mt-1">{summary}</p>
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

function LayerCard({
  title,
  color,
  items,
}: {
  title: string
  color: string
  items: string[]
}) {
  return (
    <div className={cn('rounded-lg border p-2.5', color)}>
      <div className="font-semibold text-[11px] mb-1">{title}</div>
      <ul className="space-y-0.5">
        {items.map((i) => (
          <li key={i} className="text-[10px] opacity-80">
            {i}
          </li>
        ))}
      </ul>
    </div>
  )
}
