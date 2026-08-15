'use client'

/**
 * ShortcutsOverlay
 * ------------------------------------------------------------------
 * A modal overlay that lists every keyboard shortcut. Toggled with
 * the `?` key (Shift+/) or via the help button in the toolbar.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'

const SHORTCUT_GROUPS: { title: string; shortcuts: { keys: string; desc: string }[] }[] = [
  {
    title: 'Tools',
    shortcuts: [
      { keys: 'V', desc: 'Select tool' },
      { keys: 'H', desc: 'Pan (hand) tool' },
      { keys: 'S', desc: 'Sticky note' },
      { keys: 'T', desc: 'Text label' },
      { keys: 'R', desc: 'Rectangle' },
      { keys: 'O', desc: 'Ellipse' },
      { keys: 'D', desc: 'Diamond' },
      { keys: 'I', desc: 'AI image generator' },
      { keys: 'C', desc: 'Comment' },
      { keys: 'G', desc: 'Group frame' },
      { keys: 'P', desc: 'Presentation mode' },
    ],
  },
  {
    title: 'Edit',
    shortcuts: [
      { keys: '⌘Z', desc: 'Undo' },
      { keys: '⌘⇧Z', desc: 'Redo' },
      { keys: '⌫', desc: 'Delete selected' },
      { keys: '⌘D', desc: 'Duplicate selected' },
      { keys: '⌘A', desc: 'Select all nodes' },
      { keys: '⌘G', desc: 'Group selected nodes' },
      { keys: '⇧⌘G', desc: 'Ungroup selected nodes' },
      { keys: 'Esc', desc: 'Cancel / return to select' },
    ],
  },
  {
    title: 'View',
    shortcuts: [
      { keys: 'Space + Drag', desc: 'Pan the canvas' },
      { keys: 'Scroll', desc: 'Zoom in/out' },
      { keys: '⌘Scroll', desc: 'Precision zoom' },
      { keys: 'F', desc: 'Fit view to content' },
      { keys: '⇧F', desc: 'Zoom to selection' },
      { keys: '⌘F', desc: 'Search nodes' },
      { keys: '?', desc: 'Toggle this overlay' },
    ],
  },
  {
    title: 'Canvas',
    shortcuts: [
      { keys: 'Double-click', desc: 'Edit note text' },
      { keys: 'Right-click', desc: 'Node context menu' },
      { keys: 'Drag from handle', desc: 'Connect nodes' },
      { keys: '⇧ + Click', desc: 'Multi-select' },
    ],
  },
]

export function ShortcutsOverlay() {
  const open = useUIStore((s) => s.openPanel === 'shortcuts')
  const setPanel = useUIStore((s) => s.setPanel)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setPanel(null)}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-card border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Keyboard className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="font-semibold text-base">Keyboard Shortcuts</h2>
                  <p className="text-xs text-muted-foreground">
                    Speed up your workflow with these shortcuts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPanel(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of shortcut groups */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.title} className="mb-4 last:mb-0">
                  <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                    {group.title}
                  </h3>
                  <div className="space-y-1">
                    {group.shortcuts.map((s) => (
                      <div
                        key={s.keys}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-accent/50 transition-colors"
                      >
                        <span className="text-sm text-foreground/90">{s.desc}</span>
                        <kbd className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-muted border text-foreground/80 whitespace-nowrap">
                          {s.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t bg-muted/30 text-xs text-muted-foreground text-center">
              Press <kbd className="font-mono px-1 py-0.5 rounded bg-muted border">?</kbd> or <kbd className="font-mono px-1 py-0.5 rounded bg-muted border">Esc</kbd> to close
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
