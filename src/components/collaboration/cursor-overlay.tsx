'use client'

/**
 * CursorOverlay
 * ------------------------------------------------------------------
 * Renders every remote peer's cursor using the RemoteCursor component,
 * which applies smooth lerp interpolation via requestAnimationFrame.
 *
 * ── Coordinate System ──
 * Cursor positions are broadcast in *screen* coordinates (px from the
 * canvas wrapper's top-left corner). This means:
 *  - The sender converts mouse clientX/Y → wrapper-relative coords
 *    using `getBoundingClientRect()`.
 *  - The receiver renders the cursor at those same screen coords.
 *  - Two users at different zoom levels see cursors at different
 *    canvas points, but the overlay is positioned consistently
 *    relative to the canvas DOM element.
 *
 * ── Throttling ──
 * The sender uses `rafThrottle()` (one broadcast per animation frame,
 * ~16ms) so high-frequency mousemove events never flood the WebSocket.
 * The receiver then lerps between received positions for 60fps smoothness.
 *
 * ── Broadcast Flow ──
 *   mousemove → rafThrottle → awareness.setLocalStateField('cursor', {x,y})
 *     → y-websocket → remote peer's awareness 'change' event
 *     → useAwareness → peers state → CursorOverlay → RemoteCursor
 *     → useLerpCursor → rAF lerp loop → direct DOM transform
 */
import { memo } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { Peer } from '@/types/canvas'
import { useUIStore } from '@/store/ui-store'
import { RemoteCursor } from './remote-cursor'

interface CursorOverlayProps {
  peers: Peer[]
}

function CursorOverlayImpl({ peers }: CursorOverlayProps) {
  const showCursors = useUIStore((s) => s.showCursors)
  if (!showCursors) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      <AnimatePresence>
        {peers.map((peer) =>
          peer.cursor ? (
            <RemoteCursor key={peer.clientId} peer={peer} />
          ) : null
        )}
      </AnimatePresence>
    </div>
  )
}

export const CursorOverlay = memo(CursorOverlayImpl)
