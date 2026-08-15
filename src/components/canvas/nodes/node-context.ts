'use client'

/**
 * NodeContext
 * ------------------------------------------------------------------
 * Provides mutation callbacks to custom nodes without polluting the
 * serialised node `data` (which would otherwise round-trip through Yjs).
 */
import { createContext, useContext } from 'react'
import type { CanvasNode } from '@/types/canvas'

export interface NodeContextValue {
  updateData: (id: string, patch: Partial<CanvasNode['data']>) => void
  remove: (ids: string[]) => void
  beginEdit: (id: string) => void
  endEdit: () => void
  /** Who is currently editing which node (clientId -> color), from awareness. */
  editingBy: Record<string, { name: string; color: string }>
  /** Peer colours currently selecting each node (for remote selection rings). */
  remoteSelections: Record<string, string[]>
}

export const NodeContext = createContext<NodeContextValue | null>(null)

export function useNodeContext(): NodeContextValue {
  const ctx = useContext(NodeContext)
  if (!ctx) {
    // Provide a no-op fallback so nodes never crash during SSR / preview.
    return {
      updateData: () => {},
      remove: () => {},
      beginEdit: () => {},
      endEdit: () => {},
      editingBy: {},
      remoteSelections: {},
    }
  }
  return ctx
}
