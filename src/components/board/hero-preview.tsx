'use client'

/**
 * HeroPreview
 * ------------------------------------------------------------------
 * A self-contained animated mock of the canvas that fills the right
 * side of the landing hero. It demonstrates:
 *  - Sticky notes and shapes
 *  - Two live multiplayer cursors moving in a loop
 *  - A connection line
 *
 * Pure CSS/Framer Motion — no Yjs, no React Flow. This keeps the
 * landing page lightweight and SSR-friendly.
 */
import { motion } from 'framer-motion'
import { MousePointer2 } from 'lucide-react'

const CURSORS = [
  { name: 'Ada', color: '#F43F5E', path: [
    { x: 30, y: 40 }, { x: 120, y: 80 }, { x: 200, y: 50 },
    { x: 260, y: 120 }, { x: 180, y: 160 }, { x: 80, y: 140 },
  ]},
  { name: 'Bram', color: '#0EA5E9', path: [
    { x: 280, y: 30 }, { x: 220, y: 100 }, { x: 140, y: 60 },
    { x: 60, y: 110 }, { x: 100, y: 180 }, { x: 240, y: 170 },
  ]},
]

const NOTES = [
  { x: 20, y: 20, w: 90, h: 70, bg: '#FEF3C7', stroke: '#F59E0B', text: 'Brainstorm' },
  { x: 200, y: 30, w: 80, h: 60, bg: '#D1FAE5', stroke: '#10B981', text: 'Ideas' },
  { x: 140, y: 140, w: 100, h: 70, bg: '#E0F2FE', stroke: '#0EA5E9', text: 'Ship it' },
]

export function HeroPreview() {
  return (
    <div className="relative w-full h-[420px] rounded-3xl border bg-[#FAFAF9] overflow-hidden shadow-2xl">
      {/* Dotted grid background */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #94A3B8 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Window chrome */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-white/70 backdrop-blur border-b flex items-center px-3 gap-1.5 z-10">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 text-[10px] text-muted-foreground font-mono">
          collabcanvas · room-demo
        </span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live · 3 peers
        </span>
      </div>

      {/* Mock canvas content */}
      <div className="absolute inset-0 top-8">
        {/* Connection line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <motion.path
            d="M 65 90 Q 150 60 240 60"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeDasharray="5 3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
          />
          <motion.path
            d="M 240 90 Q 200 130 190 175"
            fill="none"
            stroke="#F43F5E"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          />
        </svg>

        {/* Sticky notes */}
        {NOTES.map((note, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.15, type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute rounded-lg shadow-md flex items-center justify-center text-[10px] font-medium p-2"
            style={{
              left: note.x,
              top: note.y,
              width: note.w,
              height: note.h,
              background: note.bg,
              border: `1.5px solid ${note.stroke}40`,
              color: note.stroke,
            }}
          >
            {note.text}
          </motion.div>
        ))}

        {/* Animated cursors */}
        {CURSORS.map((cursor, ci) => (
          <motion.div
            key={ci}
            className="absolute top-0 left-0 pointer-events-none z-20"
            animate={{
              x: cursor.path.map((p) => p.x),
              y: cursor.path.map((p) => p.y),
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
              delay: ci * 0.5,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 22 22"
              fill="none"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
            >
              <path
                d="M3 2 L19 11 L11 12 L8 19 Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            <div
              className="absolute top-4 left-3 px-1.5 py-0.5 rounded text-[9px] font-medium text-white whitespace-nowrap shadow-sm"
              style={{ background: cursor.color }}
            >
              {cursor.name}
            </div>
          </motion.div>
        ))}

        {/* Selection ring on one note (pulsing) */}
        <motion.div
          className="absolute rounded-lg pointer-events-none"
          style={{ left: 196, top: 26, width: 88, height: 68 }}
          animate={{ boxShadow: ['0 0 0 2px #10B981', '0 0 0 4px #10B98144', '0 0 0 2px #10B981'] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>

      {/* Floating toolbar mock */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
        className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-1 rounded-xl bg-white/90 backdrop-blur border shadow-sm"
      >
        {['bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-sky-400', 'bg-violet-400'].map((c, i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-md ${c} ${i === 0 ? 'opacity-100' : 'opacity-30'}`}
          />
        ))}
      </motion.div>

      {/* Floating mouse pointer icon (decorative) */}
      <motion.div
        className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/90 backdrop-blur border shadow-sm flex items-center justify-center"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <MousePointer2 className="w-4 h-4 text-muted-foreground" />
      </motion.div>
    </div>
  )
}
