'use client'

/**
 * useAwareness
 * ------------------------------------------------------------------
 * Bridges the Yjs awareness protocol to React state for:
 *  - the local user's presence (cursor, selection, name, colour)
 *  - the list of remote peers (with their cursors, selections, and
 *    which node they're currently editing)
 *
 * Performance:
 *  - Local cursor updates are throttled with requestAnimationFrame so
 *    high-frequency mousemove events never flood the socket.
 *  - Remote awareness changes are deep-compared before setState to
 *    avoid re-rendering the overlay on every keystroke from a peer.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WebsocketProvider } from 'y-websocket'
import type * as Y from 'yjs'
import type { Peer, PresenceState } from '@/types/canvas'
import { useIdentityStore } from '@/store/identity-store'
import { useUIStore } from '@/store/ui-store'
import { rafThrottle } from '@/lib/canvas/utils'

export interface AwarenessApi {
  peers: Peer[]
  localClientId: number
  setCursor: (pos: { x: number; y: number } | null) => void
  setSelection: (ids: string[]) => void
  setEditingNode: (id: string | null) => void
  setViewport: (vp: { x: number; y: number; zoom: number }) => void
}

export function useAwareness(
  provider: WebsocketProvider | null,
  doc: Y.Doc | null
): AwarenessApi {
  const [peers, setPeers] = useState<Peer[]>([])
  const identity = useIdentityStore()
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds)
  const editingNodeId = useUIStore((s) => s.editingNodeId)
  const setConnection = useUIStore((s) => s.setConnection)

  // Keep latest identity & selection available to throttled callbacks
  // without rebinding the listeners.
  const identityRef = useRef(identity)
  const selectionRef = useRef(selectedNodeIds)
  const editingRef = useRef(editingNodeId)
  const viewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null)
  useEffect(() => {
    identityRef.current = identity
  }, [identity])
  useEffect(() => {
    selectionRef.current = selectedNodeIds
  }, [selectedNodeIds])
  useEffect(() => {
    editingRef.current = editingNodeId
  }, [editingNodeId])

  // Initialise local presence as soon as we have identity + provider.
  useEffect(() => {
    if (!provider || !doc || !identity.hydrated) return
    const awareness = provider.awareness
    const localId = doc.clientID

    const init = () => {
      awareness.setLocalStateField('user', {
        name: identityRef.current.name,
        color: identityRef.current.color,
        avatar: identityRef.current.avatar,
      })
      awareness.setLocalStateField('cursor', null)
      awareness.setLocalStateField('selection', selectionRef.current)
      awareness.setLocalStateField('editingNodeId', editingRef.current)
      awareness.setLocalStateField('viewport', viewportRef.current)
    }
    init()

    const onChange = () => {
      const states = awareness.getStates()
      const next: Peer[] = []
      states.forEach((state, clientId) => {
        if (clientId === localId) return
        const user = state.user as
          | { name: string; color: string; avatar?: string }
          | undefined
        if (!user) return
        next.push({
          clientId,
          name: user.name,
          color: user.color,
          avatar: user.avatar,
          cursor: (state.cursor as PresenceState['cursor']) ?? null,
          selection: (state.selection as string[]) ?? [],
          editingNodeId: (state.editingNodeId as string | null) ?? null,
          viewport:
            (state.viewport as PresenceState['viewport']) ?? null,
        })
      })
      // Sort by clientId for stable ordering in the presence bar.
      next.sort((a, b) => a.clientId - b.clientId)
      setPeers(next)

      // Update latency if we previously sent a __ping marker.
      const local = states.get(localId)
      const ping = local?.['__ping'] as number | undefined
      if (typeof ping === 'number') {
        setConnection({ latencyMs: Date.now() - ping })
        // Clear the marker so it doesn't skew future reads.
        awareness.setLocalStateField('__ping', null)
      }
    }

    awareness.on('change', onChange)
    // Trigger an initial read in case peers were already connected.
    onChange()

    return () => {
      awareness.off('change', onChange)
    }
  }, [provider, doc, identity.hydrated, setConnection])

  // Push identity changes into awareness.
  useEffect(() => {
    if (!provider || !identity.hydrated) return
    provider.awareness.setLocalStateField('user', {
      name: identity.name,
      color: identity.color,
      avatar: identity.avatar,
    })
  }, [provider, identity.name, identity.color, identity.avatar, identity.hydrated])

  // Push selection changes into awareness (debounced via rAF throttle).
  useEffect(() => {
    if (!provider) return
    const push = rafThrottle(() => {
      provider.awareness.setLocalStateField('selection', selectedNodeIds)
    })
    push()
    return () => push.cancel()
  }, [provider, selectedNodeIds])

  // Push editing state into awareness (immediate — low frequency).
  useEffect(() => {
    if (!provider) return
    provider.awareness.setLocalStateField('editingNodeId', editingNodeId)
  }, [provider, editingNodeId])

  const setCursor = useCallback(
    (pos: { x: number; y: number } | null) => {
      if (!provider) return
      provider.awareness.setLocalStateField('cursor', pos)
    },
    [provider]
  )

  const setSelection = useCallback(
    (ids: string[]) => {
      if (!provider) return
      provider.awareness.setLocalStateField('selection', ids)
    },
    [provider]
  )

  const setEditingNode = useCallback(
    (id: string | null) => {
      if (!provider) return
      provider.awareness.setLocalStateField('editingNodeId', id)
    },
    [provider]
  )

  // Throttled viewport broadcast — viewport changes fire on every pan/zoom
  // frame so we coalesce them to one update per animation frame.
  const setViewport = useMemo(
    () =>
      rafThrottle((vp: { x: number; y: number; zoom: number }) => {
        if (!provider) return
        provider.awareness.setLocalStateField('viewport', vp)
      }),
    [provider]
  )

  return {
    peers,
    localClientId: doc?.clientID ?? 0,
    setCursor,
    setSelection,
    setEditingNode,
    setViewport,
  }
}
