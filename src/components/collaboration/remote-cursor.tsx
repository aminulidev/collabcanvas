'use client'

/**
 * RemoteCursor
 * ------------------------------------------------------------------
 * A single remote peer's cursor with smooth lerp interpolation.
 *
 * The cursor position is updated via a rAF loop (see useLerpCursor)
 * so movement stays at 60fps even when awareness updates arrive at
 * 30fps (throttled by rafThrottle on the sender side).
 *
 * The cursor renders:
 *  - An SVG arrow (peer's colour) with a drop shadow
 *  - A name pill with avatar emoji + name
 *  - A subtle "pulse" ring when the peer is actively editing
 */
import { memo } from 'react'
import { motion } from 'framer-motion'
import type { Peer } from '@/types/canvas'
import { useLerpCursor } from '@/hooks/use-lerp-cursor'

interface RemoteCursorProps {
  peer: Peer
}

function RemoteCursorImpl({ peer }: RemoteCursorProps) {
  const targetX = peer.cursor?.x ?? 0
  const targetY = peer.cursor?.y ?? 0
  const ref = useLerpCursor(targetX, targetY, 0.18)

  if (!peer.cursor) return null

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.2 }}
      className="absolute top-0 left-0 will-change-transform"
      style={{ originX: 0, originY: 0 }}
    >
      {/* Cursor arrow */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        style={{
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
        }}
      >
        <path
          d="M3 2 L19 11 L11 12 L8 19 Z"
          fill={peer.color}
          stroke="white"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>

      {/* Name pill */}
      <div
        className="absolute top-4 left-3 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-white whitespace-nowrap shadow-sm flex items-center gap-1"
        style={{ background: peer.color }}
      >
        {peer.avatar && <span>{peer.avatar}</span>}
        <span>{peer.name}</span>
        {peer.editingNodeId && (
          <span className="inline-block w-1 h-1 rounded-full bg-white animate-pulse ml-0.5" />
        )}
      </div>
    </motion.div>
  )
}

export const RemoteCursor = memo(RemoteCursorImpl)
