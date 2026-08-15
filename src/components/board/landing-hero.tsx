'use client'

/**
 * LandingHero
 * ------------------------------------------------------------------
 * Portfolio-style landing surface. Surfaces the project pitch, the tech
 * stack, and the four architecture pillars, then hands off to the
 * full-screen Board via the primary CTA.
 */
import { motion } from 'framer-motion'
import {
  Boxes,
  ArrowRight,
  Sparkles,
  Users,
  GitBranch,
  Gauge,
  MousePointerClick,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HeroPreview } from '@/components/board/hero-preview'

const PILLARS = [
  {
    icon: Boxes,
    title: 'Component Hierarchy',
    blurb:
      'Strict boundaries between the canvas engine, UI overlay, and networking layer — every file belongs to exactly one.',
  },
  {
    icon: Users,
    title: 'State Management',
    blurb:
      'Zustand for ephemeral local state; Yjs CRDTs for replicated truth. Awareness for presence. Never the twain shall mix.',
  },
  {
    icon: GitBranch,
    title: 'Real-Time Sync',
    blurb:
      'Yjs nested maps, awareness protocol for cursors, Y.UndoManager for per-user undo that never clobbers peers.',
  },
  {
    icon: Gauge,
    title: '60 FPS Canvas',
    blurb:
      'React Flow virtualisation, rAF-throttled cursor broadcast, memoised node bodies, controlled state with no echo loops.',
  },
]

const FEATURES = [
  {
    icon: '📝',
    title: 'Rich node types',
    desc: 'Sticky notes, text, shapes, AI-generated images — all editable inline with live sync.',
    color: '#FEF3C7',
  },
  {
    icon: '🔗',
    title: 'Smart connections',
    desc: 'Drag-to-connect nodes with animated bezier edges, custom colours, and labels.',
    color: '#E0F2FE',
  },
  {
    icon: '🎨',
    title: 'Templates & export',
    desc: 'Start from flowchart, mindmap, or retro templates. Export your board as PNG.',
    color: '#EDE9FE',
  },
]

const STATS = [
  { value: '8', label: 'node types' },
  { value: '7', label: 'templates' },
  { value: '60', label: 'FPS viewport' },
  { value: '0ms', label: 'sync latency' },
  { value: '∞', label: 'infinite canvas' },
]

const STACK = [
  'Next.js 16',
  'TypeScript',
  'Tailwind CSS',
  'Zustand',
  'Yjs CRDTs',
  'y-websocket',
  'React Flow',
  'Framer Motion',
]

interface LandingHeroProps {
  onLaunch: () => void
}

export function LandingHero({ onLaunch }: LandingHeroProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-rose-500/10 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[36rem] h-[36rem] rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[44rem] h-[44rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.12) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pt-12 sm:pt-20 pb-16">
        {/* Two-column hero: left = text, right = live preview */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-center">
          {/* Left column: text content */}
          <div>
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2 mb-6"
            >
              <Badge
                variant="outline"
                className="gap-1.5 py-1 px-3 bg-card/70 backdrop-blur"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-medium tracking-wide">
                  Staff Frontend Architect · Design Document
                </span>
              </Badge>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]"
            >
              Real-time
              <br />
              collaborative
              <br />
              <span className="bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 bg-clip-text text-transparent">
                infinite canvas.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-6 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed"
            >
              A Miro/Figma-class whiteboard built on Yjs CRDTs, React Flow, and a
              purpose-built WebSocket sync service. Multiplayer cursors,
              conflict-free edits, and a 60 FPS viewport — with the full
              architecture documented inside the product.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button
                size="lg"
                onClick={onLaunch}
                className="group gap-2 h-12 px-6 text-base shadow-lg hover:shadow-xl transition-shadow"
              >
                <MousePointerClick className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Launch the canvas
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={onLaunch}
                className="group gap-2 h-12 px-6 text-base bg-card/70 backdrop-blur hover:bg-card transition-colors"
              >
                <Sparkles className="w-4 h-4 text-rose-500 group-hover:rotate-12 transition-transform" />
                Try AI image nodes
              </Button>
            </motion.div>

            {/* Stack */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-8"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Built with
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STACK.map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-muted/60 text-muted-foreground border"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right column: live animated preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="hidden lg:block"
          >
            <HeroPreview />
          </motion.div>
        </div>

        {/* Pillars */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + i * 0.08 }}
              className="group relative p-5 rounded-2xl border bg-card/70 backdrop-blur hover:bg-card hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/10 via-amber-500/10 to-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <pillar.icon className="w-5 h-5 text-foreground" />
              </div>
              <div className="text-[11px] font-mono text-muted-foreground mb-1">
                0{i + 1}
              </div>
              <h3 className="font-semibold mb-1.5">{pillar.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {pillar.blurb}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Feature showcase row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 1.0 + i * 0.1 }}
              className="relative overflow-hidden rounded-2xl border bg-card/60 backdrop-blur p-5"
            >
              <div
                className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-20"
                style={{ background: feat.color }}
              />
              <div className="text-2xl mb-2">{feat.icon}</div>
              <h4 className="font-semibold text-sm mb-1">{feat.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4 rounded-2xl border bg-card/50 backdrop-blur"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Footer hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-16 flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Users className="w-3.5 h-3.5" />
          <span>
            Tip: open the canvas in two browser tabs to see live multiplayer
            cursors in action.
          </span>
        </motion.div>
      </div>
    </div>
  )
}
