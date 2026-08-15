'use client'

/**
 * StatusBar
 * ------------------------------------------------------------------
 * A slim bar pinned to the bottom of the canvas showing:
 *  - Zoom level (clickable to reset to 100%)
 *  - Node & edge counts
 *  - Connection status + latency
 *  - Active tool indicator
 *
 * Reads from the UI store and React Flow's viewport — no Yjs access
 * needed, keeping it lightweight and re-render-friendly.
 */
import { memo, useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useUIStore } from '@/store/ui-store'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Share2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusBarProps {
  nodeCount: number
  edgeCount: number
}

function StatusBarImpl({ nodeCount, edgeCount }: StatusBarProps) {
  const viewport = useUIStore((s) => s.viewport)
  const connection = useUIStore((s) => s.connection)
  const activeTool = useUIStore((s) => s.activeTool)
  const presentationMode = useUIStore((s) => s.presentationMode)

  // Hide entirely in presentation mode.
  if (presentationMode) return null

  // React Flow's useReactFlow gives us zoom controls. We wrap it in a
  // separate component so the hook is only called within the provider.
  return (
    <StatusBarInner
      nodeCount={nodeCount}
      edgeCount={edgeCount}
      viewport={viewport}
      connection={connection}
      activeTool={activeTool}
    />
  )
}

interface StatusBarInnerProps {
  nodeCount: number
  edgeCount: number
  viewport: { x: number; y: number; zoom: number }
  connection: { status: string; synced: boolean; latencyMs: number | null }
  activeTool: string
}

function StatusBarInner({
  nodeCount,
  edgeCount,
  viewport,
  connection,
  activeTool,
}: StatusBarInnerProps) {
  const reactFlow = useReactFlow()

  const zoomIn = useCallback(() => {
    reactFlow.zoomIn({ duration: 200 })
  }, [reactFlow])

  const zoomOut = useCallback(() => {
    reactFlow.zoomOut({ duration: 200 })
  }, [reactFlow])

  const resetZoom = useCallback(() => {
    reactFlow.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 })
  }, [reactFlow])

  const fitView = useCallback(() => {
    reactFlow.fitView({ padding: 0.3, maxZoom: 1, duration: 400 })
  }, [reactFlow])

  const zoomPct = Math.round(viewport.zoom * 100)
  const isConnected = connection.status === 'connected'

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 h-8 flex items-center justify-between px-3 bg-card/80 backdrop-blur-md border-t text-xs text-muted-foreground select-none">
      {/* Left: counts + tool */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5" title={`${nodeCount} nodes on canvas`}>
          <Layers className="w-3 h-3" />
          <span className="tabular-nums font-medium">{nodeCount}</span>
          <span className="text-muted-foreground/60">nodes</span>
        </div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1.5" title={`${edgeCount} edges`}>
          <Share2 className="w-3 h-3" />
          <span className="tabular-nums font-medium">{edgeCount}</span>
          <span className="text-muted-foreground/60">edges</span>
        </div>
        <div className="w-px h-3 bg-border hidden sm:block" />
        <div className="hidden sm:flex items-center gap-1.5 capitalize">
          <span className="text-muted-foreground/60">tool:</span>
          <span className="font-medium text-foreground">{activeTool}</span>
        </div>
      </div>

      {/* Right: connection + zoom controls */}
      <div className="flex items-center gap-2">
        {/* Connection indicator */}
        <div
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
            isConnected
              ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
              : 'text-amber-600 bg-amber-50 dark:bg-amber-950/30'
          )}
        >
          {isConnected ? (
            <Wifi className="w-2.5 h-2.5" />
          ) : (
            <WifiOff className="w-2.5 h-2.5" />
          )}
          <span>
            {isConnected
              ? `Live${connection.latencyMs != null ? ` · ${connection.latencyMs}ms` : ''}`
              : 'Reconnecting…'}
          </span>
        </div>

        <div className="w-px h-3 bg-border" />

        {/* Zoom controls */}
        <button
          onClick={zoomOut}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-3 h-3" />
        </button>
        <button
          onClick={resetZoom}
          className="px-1.5 h-5 flex items-center justify-center rounded text-[10px] font-mono font-medium hover:bg-accent transition-colors tabular-nums min-w-[3rem]"
          title="Reset zoom to 100%"
        >
          {zoomPct}%
        </button>
        <button
          onClick={zoomIn}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
        <div className="w-px h-3 bg-border" />
        <button
          onClick={fitView}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent transition-colors"
          title="Fit view (F)"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

export const StatusBar = memo(StatusBarImpl)
