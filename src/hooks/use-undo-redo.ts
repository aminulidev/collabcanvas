'use client'

/**
 * useUndoRedo
 * ------------------------------------------------------------------
 * Thin wrapper over Y.UndoManager that exposes canUndo / canRedo flags
 * as React state, plus keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z).
 *
 * Y.UndoManager already groups rapid operations via `captureTimeout`
 * (set to 250ms in useYjsDocument), so a drag composed of hundreds of
 * position updates collapses into a single undo entry.
 *
 * State sync strategy:
 *  - Subscribe to Y.UndoManager events (stack-item-added/popped/cleared)
 *    for reactive updates when REMOTE or programmatic changes occur.
 *  - Additionally, call `forceSync()` immediately after every local
 *    undo()/redo() call. The event-based sync can be racy because the
 *    UndoManager emits events synchronously inside `undo()`, but React
 *    batches the state updates — the direct call guarantees the button
 *    state is correct on the next render.
 */
import { useCallback, useEffect, useState } from 'react'
import type * as Y from 'yjs'

export interface UndoRedoApi {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  clear: () => void
}

export function useUndoRedo(undoManager: Y.UndoManager | null): UndoRedoApi {
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Read the current state from the UndoManager into React state.
  const sync = useCallback(() => {
    if (!undoManager) return
    setCanUndo(undoManager.canUndo())
    setCanRedo(undoManager.canRedo())
  }, [undoManager])

  useEffect(() => {
    if (!undoManager) return
    // Subscribe to all stack events for reactive updates. The initial
    // state read is deferred to a microtask so it doesn't trigger a
    // cascading render during the effect.
    const raf = requestAnimationFrame(() => sync())
    undoManager.on('stack-item-added', sync)
    undoManager.on('stack-item-popped', sync)
    undoManager.on('stack-cleared', sync)
    undoManager.on('stack-item-updated', sync)
    return () => {
      cancelAnimationFrame(raf)
      undoManager.off('stack-item-added', sync)
      undoManager.off('stack-item-popped', sync)
      undoManager.off('stack-cleared', sync)
      undoManager.off('stack-item-updated', sync)
    }
  }, [undoManager, sync])

  const undo = useCallback(() => {
    if (!undoManager || !undoManager.canUndo()) return
    undoManager.undo()
    // Force an immediate state read after the operation completes.
    // The event-based sync can be batched by React; this direct call
    // guarantees the button disabled-state is correct next frame.
    sync()
  }, [undoManager, sync])

  const redo = useCallback(() => {
    if (!undoManager || !undoManager.canRedo()) return
    undoManager.redo()
    sync()
  }, [undoManager, sync])

  const clear = useCallback(() => {
    undoManager?.clear()
    sync()
  }, [undoManager, sync])

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  return { canUndo, canRedo, undo, redo, clear }
}
