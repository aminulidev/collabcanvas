'use client'

/**
 * SearchPalette
 * ------------------------------------------------------------------
 * A Spotlight/Command-K-style search overlay. Lets the user search
 * across all nodes by label/text content and jump to a result. Opens
 * with Ctrl+F (or Cmd+F).
 *
 * Results are ranked: exact label match first, then starts-with, then
 * contains. Selecting a result fits the viewport to that node.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, CornerDownLeft, ArrowRight } from 'lucide-react'
import * as Y from 'yjs'
import { getNodesMap, yMapToCanvasNode } from '@/lib/yjs/schema'
import type { CanvasNode } from '@/types/canvas'
import { cn } from '@/lib/utils'

interface SearchResult {
  node: CanvasNode
  matchedField: 'text' | 'label' | 'type'
  score: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  doc: Y.Doc | null
  onJumpToNode: (nodeId: string) => void
}

export function SearchPalette({ open, onOpenChange, doc, onJumpToNode }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset the query + selection whenever the palette is (re)opened.
  // Use a ref to track the previous open state so we don't call setState
  // synchronously inside the effect body.
  const prevOpenRef = useRef(false)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      requestAnimationFrame(() => {
        setQuery('')
        setSelectedIdx(0)
        inputRef.current?.focus()
      })
    }
    prevOpenRef.current = open
  }, [open])

  // Collect all nodes from the Yjs doc and score them against the query.
  const results = useMemo<SearchResult[]>(() => {
    if (!doc || !query.trim()) return []
    const q = query.toLowerCase().trim()
    const nodesMap = getNodesMap(doc)
    const out: SearchResult[] = []
    nodesMap.forEach((ymap) => {
      const node = yMapToCanvasNode(ymap as Y.Map<unknown>)
      const text = (node.data.text ?? '').toLowerCase()
      const label = (node.data.label ?? '').toLowerCase()
      let score = 0
      let matchedField: SearchResult['matchedField'] = 'type'
      if (label === q) {
        score = 100
        matchedField = 'label'
      } else if (text === q) {
        score = 90
        matchedField = 'text'
      } else if (label.startsWith(q)) {
        score = 80
        matchedField = 'label'
      } else if (text.startsWith(q)) {
        score = 70
        matchedField = 'text'
      } else if (label.includes(q)) {
        score = 50
        matchedField = 'label'
      } else if (text.includes(q)) {
        score = 40
        matchedField = 'text'
      } else if (node.type.includes(q)) {
        score = 20
        matchedField = 'type'
      }
      if (score > 0) {
        out.push({ node, matchedField, score })
      }
    })
    out.sort((a, b) => b.score - a.score)
    return out.slice(0, 12)
  }, [doc, query])

  // Reset selection when results count changes — clamped to valid range.
  const clampedIdx = results.length === 0 ? 0 : Math.min(selectedIdx, results.length - 1)

  // Keyboard navigation within the palette.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const result = results[clampedIdx]
      if (result) {
        onJumpToNode(result.node.id)
        onOpenChange(false)
      }
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh] bg-black/30 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ scale: 0.96, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="w-full max-w-lg mx-4 rounded-2xl bg-popover border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search nodes by text, label, or type…"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-80 overflow-y-auto">
              {results.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {query.trim()
                    ? 'No matching nodes found'
                    : 'Start typing to search…'}
                </div>
              ) : (
                <div className="py-1">
                  {results.map((result, idx) => (
                    <button
                      key={result.node.id}
                      onClick={() => {
                        onJumpToNode(result.node.id)
                        onOpenChange(false)
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        idx === clampedIdx
                          ? 'bg-accent'
                          : 'hover:bg-accent/50'
                      )}
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-xs font-medium"
                        style={{
                          background: result.node.data.color,
                          color: result.node.data.stroke,
                        }}
                      >
                        {result.node.type === 'sticky'
                          ? '📝'
                          : result.node.type === 'text'
                            ? 'T'
                            : result.node.type === 'image'
                              ? '🖼'
                              : result.node.type === 'ellipse'
                                ? 'O'
                                : result.node.type === 'diamond'
                                  ? '◇'
                                  : '▭'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {(result.node.data.text || result.node.data.label) ||
                            '(empty)'}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <span className="capitalize">{result.node.type}</span>
                          <span>·</span>
                          <span className="font-mono">{result.node.id}</span>
                          <span>·</span>
                          <span>matched: {result.matchedField}</span>
                        </div>
                      </div>
                      {idx === clampedIdx && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="font-mono px-1 rounded bg-background border">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono px-1 rounded bg-background border">↵</kbd>
                  jump to
                </span>
              </div>
              <span className="flex items-center gap-1">
                <ArrowRight className="w-2.5 h-2.5" />
                {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Suppress unused import.
void X
