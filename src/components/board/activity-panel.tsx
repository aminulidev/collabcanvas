'use client'

/**
 * ActivityPanel
 * ------------------------------------------------------------------
 * A collapsible floating panel that shows real-time board metrics:
 *  - Node & edge counts (with delta since panel opened)
 *  - Online peer count + names
 *  - Session duration (time since the panel was mounted)
 *  - Edits/min counter (tracks Yjs updates over a rolling 60s window)
 *
 * Toggled via a small floating button in the top-right of the canvas.
 */
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  X,
  Users,
  Boxes,
  Share2,
  Clock,
  Zap,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { getNodesMap, getEdgesMap } from '@/lib/yjs/schema'
import type { Peer } from '@/types/canvas'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  doc: Y.Doc | null
  peers: Peer[]
}

export function ActivityPanel({ open, onOpenChange, doc, peers }: Props) {
  const [nodeCount, setNodeCount] = useState(0)
  const [edgeCount, setEdgeCount] = useState(0)
  const [sessionStart] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState('0:00')
  const [editsPerMin, setEditsPerMin] = useState(0)
  const editTimestampsRef = useRef<number[]>([])

  // Track node + edge counts from the Yjs doc.
  useEffect(() => {
    if (!doc) return
    const nodesMap = getNodesMap(doc)
    const edgesMap = getEdgesMap(doc)

    const refresh = () => {
      setNodeCount(nodesMap.size)
      setEdgeCount(edgesMap.size)
    }
    refresh()

    const onNodes = () => refresh()
    const onEdges = () => refresh()
    nodesMap.observe(onNodes)
    edgesMap.observe(onEdges)
    return () => {
      nodesMap.unobserve(onNodes)
      edgesMap.unobserve(onEdges)
    }
  }, [doc])

  // Track edits per minute via Yjs doc update events.
  useEffect(() => {
    if (!doc) return
    const onUpdate = () => {
      const now = Date.now()
      editTimestampsRef.current.push(now)
      // Prune timestamps older than 60s.
      editTimestampsRef.current = editTimestampsRef.current.filter(
        (t) => now - t < 60_000
      )
    }
    doc.on('update', onUpdate)
    return () => {
      doc.off('update', onUpdate)
    }
  }, [doc])

  // Tick the session timer + edits/min counter every second.
  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - sessionStart) / 1000)
      const m = Math.floor(secs / 60)
      const s = secs % 60
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`)
      // Count edits in the last 60s.
      const now = Date.now()
      const recent = editTimestampsRef.current.filter(
        (t) => now - t < 60_000
      )
      setEditsPerMin(recent.length)
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionStart])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="absolute top-14 right-3 z-30 w-64 rounded-2xl bg-card/95 backdrop-blur-md border shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-semibold flex-1">Activity</span>
            <button
              onClick={() => onOpenChange(false)}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-accent transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Metrics grid */}
          <div className="p-3 grid grid-cols-2 gap-2">
            <Metric
              icon={Boxes}
              label="Nodes"
              value={nodeCount}
              color="text-amber-600 bg-amber-50"
            />
            <Metric
              icon={Share2}
              label="Edges"
              value={edgeCount}
              color="text-rose-600 bg-rose-50"
            />
            <Metric
              icon={Users}
              label="Peers"
              value={peers.length + 1}
              color="text-emerald-600 bg-emerald-50"
            />
            <Metric
              icon={Clock}
              label="Session"
              value={elapsed}
              color="text-sky-600 bg-sky-50"
              isString
            />
          </div>

          {/* Edits/min gauge */}
          <div className="px-4 py-3 border-t">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-3 h-3 text-violet-500" />
              <span className="text-xs font-medium text-muted-foreground">
                Edits / minute
              </span>
              <span className="ml-auto text-sm font-mono font-semibold tabular-nums">
                {editsPerMin}
              </span>
            </div>
            {/* Mini bar gauge (0-30 range, clamped) */}
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                animate={{
                  width: `${Math.min(100, (editsPerMin / 30) * 100)}%`,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </div>
          </div>

          {/* Online peers list */}
          <div className="px-4 py-3 border-t">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" />
              Online now
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {/* Local user */}
              <PeerRow name="You" color="#64748B" avatar="★" isLocal />
              {peers.map((p) => (
                <PeerRow
                  key={p.clientId}
                  name={p.name}
                  color={p.color}
                  avatar={p.avatar}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  color,
  isString,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  color: string
  isString?: boolean
}) {
  return (
    <div className="p-2.5 rounded-lg border bg-background/50">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={cn('w-5 h-5 rounded flex items-center justify-center', color)}>
          <Icon className="w-3 h-3" />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </span>
      </div>
      <div className="text-lg font-semibold tabular-nums">
        {isString ? value : value}
      </div>
    </div>
  )
}

function PeerRow({
  name,
  color,
  avatar,
  isLocal,
}: {
  name: string
  color: string
  avatar?: string
  isLocal?: boolean
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white shrink-0"
        style={{ background: color }}
      >
        {avatar ?? name.slice(0, 1).toUpperCase()}
      </div>
      <span className={cn('truncate', isLocal && 'text-muted-foreground')}>
        {name}
        {isLocal && ' (you)'}
      </span>
      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
    </div>
  )
}
