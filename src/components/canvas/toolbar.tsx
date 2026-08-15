'use client'

/**
 * Toolbar
 * ------------------------------------------------------------------
 * Vertical floating toolbar (Miro-style) anchored at the left of the
 * canvas. Hosts the tool palette plus quick toggles for grid, minimap,
 * and live cursors.
 *
 * Undo/redo live here too because they're tightly bound to tool usage.
 */
import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  MousePointer2,
  Hand,
  StickyNote,
  Type,
  Square,
  Circle,
  Diamond,
  Image as ImageIcon,
  MessageSquare,
  Group,
  Minus,
  Grid3x3,
  Map,
  MousePointerClick,
  Undo2,
  Redo2,
  Keyboard,
} from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import type { Tool } from '@/types/canvas'
import { useUndoRedo } from '@/hooks/use-undo-redo'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ToolDef {
  id: Tool
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortcut: string
}

const TOOLS: ToolDef[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
  { id: 'sticky', icon: StickyNote, label: 'Sticky note', shortcut: 'S' },
  { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
  { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: 'O' },
  { id: 'diamond', icon: Diamond, label: 'Diamond', shortcut: 'D' },
  { id: 'image', icon: ImageIcon, label: 'Image', shortcut: 'I' },
  { id: 'comment', icon: MessageSquare, label: 'Comment', shortcut: 'C' },
  { id: 'group', icon: Group, label: 'Group frame', shortcut: 'G' },
  { id: 'edge', icon: Minus, label: 'Connect', shortcut: 'L' },
]

interface ToolbarProps {
  undoManager: import('yjs').UndoManager | null
  onAddImage?: () => void
}

function ToolbarImpl({ undoManager, onAddImage }: ToolbarProps) {
  const {
    activeTool,
    setTool,
    showGrid,
    toggleGrid,
    showMinimap,
    toggleMinimap,
    showCursors,
    toggleCursors,
  } = useUIStore()
  const { canUndo, canRedo, undo, redo } = useUndoRedo(undoManager)

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="absolute z-20 flex p-1.5 rounded-2xl bg-card/90 backdrop-blur-md border shadow-lg scrollbar-none left-1/2 -translate-x-1/2 bottom-12 md:left-4 md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:translate-x-0 flex-row md:flex-col gap-1 max-w-[calc(100%-2rem)] md:max-w-none max-h-[calc(100%-2rem)] md:max-h-[calc(100%-2rem)] overflow-x-auto md:overflow-y-auto"
      >
        {/* Undo / Redo */}
        <div className="flex gap-0.5 px-0.5 pb-0 pr-1.5 border-r md:pb-1.5 md:pr-0.5 md:border-b md:border-r-0 flex-row">
          <ToolbarButton
            label="Undo"
            shortcut="⌘Z"
            disabled={!canUndo}
            onClick={undo}
          >
            <Undo2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            shortcut="⌘⇧Z"
            disabled={!canRedo}
            onClick={redo}
          >
            <Redo2 className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Tools */}
        <div className="flex flex-row md:flex-col gap-0.5">
          {TOOLS.map((tool) => (
            <ToolbarButton
              key={tool.id}
              label={tool.label}
              shortcut={tool.shortcut}
              active={activeTool === tool.id}
              onClick={() => {
                if (tool.id === 'image' && onAddImage) {
                  onAddImage()
                  return
                }
                setTool(tool.id)
              }}
            >
              <tool.icon className="w-4 h-4" />
            </ToolbarButton>
          ))}
        </div>

        {/* Toggles */}
        <div className="flex flex-row md:flex-col gap-0.5 pt-0 pl-1.5 border-l md:pt-1.5 md:pl-0 md:border-t md:border-l-0">
          <ToolbarButton
            label={showGrid ? 'Hide grid' : 'Show grid'}
            active={showGrid}
            onClick={toggleGrid}
          >
            <Grid3x3 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            label={showMinimap ? 'Hide minimap' : 'Show minimap'}
            active={showMinimap}
            onClick={toggleMinimap}
          >
            <Map className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            label={showCursors ? 'Hide cursors' : 'Show cursors'}
            active={showCursors}
            onClick={toggleCursors}
          >
            <MousePointerClick className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Help */}
        <div className="flex flex-row md:flex-col gap-0.5 pt-0 pl-1.5 border-l md:pt-1.5 md:pl-0 md:border-t md:border-l-0">
          <ToolbarButton
            label="Keyboard shortcuts"
            shortcut="?"
            onClick={() => {
              const s = useUIStore.getState()
              s.setPanel(s.openPanel === 'shortcuts' ? null : 'shortcuts')
            }}
          >
            <Keyboard className="w-4 h-4" />
          </ToolbarButton>
        </div>
      </motion.div>
    </TooltipProvider>
  )
}

interface ToolbarButtonProps {
  label: string
  shortcut?: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
}

function ToolbarButton({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: ToolbarButtonProps) {
  const isMobile = useIsMobile()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0',
            'hover:bg-accent hover:text-accent-foreground',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
            active && 'bg-primary text-primary-foreground shadow-sm',
            active && 'hover:bg-primary hover:text-primary-foreground'
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side={isMobile ? 'top' : 'right'} className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut && (
          <kbd className="ml-1 px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

export const Toolbar = memo(ToolbarImpl)
