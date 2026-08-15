'use client'

/**
 * NodeContextMenu
 * ------------------------------------------------------------------
 * Right-click context menu for canvas nodes. Provides quick access to:
 *  - Duplicate (creates a copy offset by 20px)
 *  - Bring to front / Send to back (z-order)
 *  - Change color (palette picker)
 *  - Delete
 *
 * The menu is positioned at the mouse coordinates and closes on any
 * outside click, Escape, or scroll.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy,
  Trash2,
  BringToFront,
  SendToBack,
  Palette,
  Edit3,
} from 'lucide-react'
import { NODE_PALETTE } from '@/types/canvas'
import { cn } from '@/lib/utils'

interface ContextMenuState {
  x: number
  y: number
  nodeId: string
  nodeType: string
  currentColor: string
  currentStroke: string
}

interface NodeContextMenuProps {
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onBringToFront: (id: string) => void
  onSendToBack: (id: string) => void
  onChangeColor: (id: string, bg: string, stroke: string) => void
  onEdit: (id: string) => void
}

export function NodeContextMenu({
  onDuplicate,
  onDelete,
  onBringToFront,
  onSendToBack,
  onChangeColor,
  onEdit,
}: NodeContextMenuProps) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const [showPalette, setShowPalette] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Expose an imperative open() via a window event so the Canvas can
  // trigger it from React Flow's onNodeContextMenu without prop drilling.
  useEffect(() => {
    const handler = (e: CustomEvent<ContextMenuState>) => {
      e.preventDefault()
      setMenu(e.detail)
      setShowPalette(false)
    }
    window.addEventListener('collabcanvas:node-context-menu', handler as EventListener)
    return () => window.removeEventListener('collabcanvas:node-context-menu', handler as EventListener)
  }, [])

  // Close on outside click / Escape / scroll.
  useEffect(() => {
    if (!menu) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null)
    }
    const onScroll = () => setMenu(null)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [menu])

  const handleAction = useCallback(
    (fn: () => void) => {
      fn()
      setMenu(null)
    },
    []
  )

  // Clamp menu position so it never overflows the viewport.
  const clampedX = menu ? Math.min(menu.x, window.innerWidth - 220) : 0
  const clampedY = menu ? Math.min(menu.y, window.innerHeight - 320) : 0

  return (
    <AnimatePresence>
      {menu && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.92, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -4 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="fixed z-[100] w-52 py-1.5 rounded-xl bg-popover/95 backdrop-blur-md border shadow-2xl"
          style={{ left: clampedX, top: clampedY }}
        >
          {/* Header */}
          <div className="px-3 py-1.5 mb-1 border-b">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {menu.nodeType} node
            </div>
          </div>

          {/* Edit (only for text-bearing nodes) */}
          {(menu.nodeType === 'sticky' || menu.nodeType === 'text') && (
            <MenuItem
              icon={Edit3}
              label="Edit text"
              shortcut="↵"
              onClick={() => handleAction(() => onEdit(menu.nodeId))}
            />
          )}

          {/* Duplicate */}
          <MenuItem
            icon={Copy}
            label="Duplicate"
            shortcut="⌘D"
            onClick={() => handleAction(() => onDuplicate(menu.nodeId))}
          />

          {/* Z-order */}
          <MenuItem
            icon={BringToFront}
            label="Bring to front"
            onClick={() => handleAction(() => onBringToFront(menu.nodeId))}
          />
          <MenuItem
            icon={SendToBack}
            label="Send to back"
            onClick={() => handleAction(() => onSendToBack(menu.nodeId))}
          />

          {/* Color palette */}
          <div className="my-1 border-t" />
          <button
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left"
            onClick={() => setShowPalette((v) => !v)}
          >
            <Palette className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="flex-1">Color</span>
            <span
              className="w-4 h-4 rounded border"
              style={{ background: menu.currentColor }}
            />
          </button>
          <AnimatePresence>
            {showPalette && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-1.5 px-3 py-2">
                  {NODE_PALETTE.map((p) => (
                    <button
                      key={p.name}
                      title={p.name}
                      onClick={() =>
                        handleAction(() =>
                          onChangeColor(menu.nodeId, p.bg, p.stroke)
                        )
                      }
                      className={cn(
                        'w-6 h-6 rounded-md border-2 transition-transform hover:scale-110',
                        menu.currentColor === p.bg
                          ? 'border-foreground ring-1 ring-foreground'
                          : 'border-white/50'
                      )}
                      style={{ background: p.bg }}
                    >
                      <span
                        className="block w-full h-full rounded"
                        style={{ boxShadow: `inset 0 0 0 1px ${p.stroke}40` }}
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Delete */}
          <div className="my-1 border-t" />
          <MenuItem
            icon={Trash2}
            label="Delete"
            shortcut="⌫"
            variant="danger"
            onClick={() => handleAction(() => onDelete(menu.nodeId))}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortcut?: string
  variant?: 'default' | 'danger'
  onClick: () => void
}

function MenuItem({ icon: Icon, label, shortcut, variant = 'default', onClick }: MenuItemProps) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left',
        variant === 'danger' && 'text-destructive hover:text-destructive'
      )}
      onClick={onClick}
    >
      <Icon className={cn('w-3.5 h-3.5', variant === 'danger' ? 'text-destructive' : 'text-muted-foreground')} />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="text-[10px] font-mono text-muted-foreground px-1 py-0.5 rounded bg-muted">
          {shortcut}
        </kbd>
      )}
    </button>
  )
}
