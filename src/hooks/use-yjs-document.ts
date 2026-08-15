'use client'

/**
 * useYjsDocument
 * ------------------------------------------------------------------
 * Owns the lifecycle of the shared Y.Doc + WebSocket provider for a
 * single board room. This is the single source of truth for the CRDT
 * document; every other hook reads from the value returned here.
 *
 * Responsibilities:
 *  1. Create the Y.Doc with our schema (createCanvasDoc) — once, via a
 *     lazy useState initializer (the idiomatic "create once" pattern).
 *  2. Open a y-websocket provider pointing at the yjs-sync mini-service.
 *  3. Track connection status into the UI store.
 *  4. Set up a Y.UndoManager scoped to the nodes + edges maps so
 *     undo/redo only affects canvas content (never presence).
 *  5. Tear everything down on unmount / room change.
 *
 * Note: this hook is only ever mounted client-side (the Board appears
 * after the user clicks the landing CTA), so the lazy initializers can
 * safely touch `window` via the y-websocket provider constructor.
 */
import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import type { WebsocketProvider } from 'y-websocket'
import { createCanvasDoc, getNodesMap, getEdgesMap } from '@/lib/yjs/schema'
import { createCanvasProvider } from '@/lib/yjs/provider'
import { useUIStore } from '@/store/ui-store'

export interface YjsDocumentHandle {
  doc: Y.Doc
  nodesMap: Y.Map<Y.Map<unknown>>
  edgesMap: Y.Map<Y.Map<unknown>>
  undoManager: Y.UndoManager
  provider: WebsocketProvider
  /** True after the first successful sync with the server. */
  ready: boolean
}

export function useYjsDocument(roomId: string): YjsDocumentHandle {
  // Lazy initializers create each resource exactly once. They run on
  // the first client render (Board is client-only) so `window` access
  // inside y-websocket is safe.
  const [doc] = useState(() => createCanvasDoc())
  const [provider] = useState(() => createCanvasProvider({ roomId, doc }))
  const [undoManager] = useState(
    () =>
      new Y.UndoManager([getNodesMap(doc), getEdgesMap(doc)], {
        captureTimeout: 250,
        trackedOrigins: new Set([doc.clientID]),
      })
  )
  const [ready, setReady] = useState(false)
  const setConnection = useUIStore((s) => s.setConnection)

  // Subscribe to provider status + connection-quality probe.
  useEffect(() => {
    let firstSync = true
    setConnection({ status: 'connecting', synced: false })

    const onStatus = (event: { status: string }) => {
      if (event.status === 'connected') {
        setConnection({ status: 'connected' })
      } else if (event.status === 'disconnected') {
        setConnection({ status: 'disconnected' })
      }
    }
    const onSynced = (isSynced: boolean) => {
      if (isSynced) {
        setConnection({ synced: true, status: 'connected' })
        if (firstSync) {
          firstSync = false
          setReady(true)
        }
      }
    }
    provider.on('status', onStatus)
    provider.on('synced', onSynced)

    const pingInterval = setInterval(() => {
      if (provider.wsconnected) {
        provider.awareness.setLocalStateField('__ping', Date.now())
      }
    }, 5000)

    return () => {
      clearInterval(pingInterval)
      provider.off('status', onStatus)
      provider.off('synced', onSynced)
    }
  }, [provider, setConnection])

  // Destroy all resources when the hook unmounts (room change / nav).
  useEffect(() => {
    return () => {
      undoManager.destroy()
      provider.destroy()
      doc.destroy()
    }
  }, [doc, provider, undoManager])

  return {
    doc,
    nodesMap: getNodesMap(doc),
    edgesMap: getEdgesMap(doc),
    undoManager,
    provider,
    ready,
  }
}
