'use client'

/**
 * useCanvasNodes
 * ------------------------------------------------------------------
 * The CRDT ↔ React Flow bridge.
 *
 * React Flow is a *controlled* component here: we feed it `nodes` and
 * `edges` from React state and apply changes via `onNodesChange`.
 * This hook keeps that React state synchronised with the Yjs maps.
 *
 * The trick to avoiding feedback loops is the `origin` tag:
 *  - Local user interactions produce changes tagged with the doc's
 *    clientID. Y.UndoManager captures them; the Yjs observers ignore
 *    them (they originated from us, our state is already up to date).
 *  - Remote updates arrive untagged (or tagged with another clientID).
 *    The observers translate them into React state updates.
 *
 * This gives us:
 *   user drag → onNodesChange → Yjs transaction(clientID) → broadcast
 *   remote update → Yjs observer → setState → React Flow re-render
 *   (no second transaction, because we only transact on user input)
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type * as Y from 'yjs'
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react'
import {
  getNodesMap,
  getEdgesMap,
  yMapToCanvasNode,
  yMapToCanvasEdge,
  canvasNodeToYMap,
  canvasEdgeToYMap,
} from '@/lib/yjs/schema'
import { createEdge } from '@/lib/canvas/utils'
import type { CanvasNode, CanvasEdge } from '@/types/canvas'

// Sentinel origin so observers can skip echoes of our own writes.
// NOTE: we use doc.clientID as the actual transaction origin (not this
// symbol) so that Y.UndoManager — configured with
// trackedOrigins: Set([doc.clientID]) — captures every local operation.
// LOCAL_ORIGIN is kept only for the observer's echo-skip check.
const LOCAL_ORIGIN = Symbol('local-react-flow')

export interface CanvasNodesApi {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (node: CanvasNode) => void
  addEdge: (edge: CanvasEdge) => void
  updateNodeData: (id: string, patch: Partial<CanvasNode['data']>) => void
  updateNodePosition: (id: string, position: { x: number; y: number }) => void
  removeNodes: (ids: string[]) => void
  removeEdges: (ids: string[]) => void
  /** Bulk-replace selection z-order (bring to front / send to back). */
  setNodeZ: (id: string, z: number) => void
}

export function useCanvasNodes(doc: Y.Doc | null): CanvasNodesApi {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  // Guard ref: when true, onNodesChange skips writing to Yjs. This
  // prevents echo loops where a remote/undo Yjs update → observer →
  // refreshNodes → React Flow fires onNodesChange → writes back to
  // Yjs with doc.clientID origin → clears the redo stack.
  const isApplyingRemoteRef = useRef(false)

  // ----- hydrate from Yjs on mount / doc change ---------------------------
  useEffect(() => {
    if (!doc) return
    const nodesMap = getNodesMap(doc)
    const edgesMap = getEdgesMap(doc)

    const refreshNodes = () => {
      // Set the guard so any onNodesChange triggered by this state
      // update does NOT write back to Yjs (avoiding echo + redo clears).
      isApplyingRemoteRef.current = true
      const next: Node[] = []
      nodesMap.forEach((ymap) => {
        next.push(yMapToCanvasNode(ymap as Y.Map<unknown>) as unknown as Node)
      })
      setNodes(next)
      // Clear the guard after a short delay — React Flow fires dimension
      // changes on subsequent frames as it re-measures nodes, so a
      // single rAF isn't enough. 150ms covers ~9 frames at 60fps.
      setTimeout(() => {
        isApplyingRemoteRef.current = false
      }, 150)
    }
    const refreshEdges = () => {
      isApplyingRemoteRef.current = true
      const next: Edge[] = []
      edgesMap.forEach((ymap) => {
        next.push(yMapToCanvasEdge(ymap as Y.Map<unknown>) as unknown as Edge)
      })
      setEdges(next)
      setTimeout(() => {
        isApplyingRemoteRef.current = false
      }, 150)
    }

    refreshNodes()
    refreshEdges()

    const observeDeep = (events: Array<{ transaction: { origin: unknown }; target: unknown }>) => {
      // observeDeep passes an array of events (one per changed nested type).
      const first = events[0]
      if (!first) return
      const origin = first.transaction.origin
      // Skip echoes of our own React Flow writes (the onNodesChange
      // path already updated React state locally). We do NOT skip
      // doc.clientID-origin writes because those include programmatic
      // local writes (template insertions, property-panel edits) that
      // need to flow through to React state.
      if (origin === LOCAL_ORIGIN) return

      // Determine which collection(s) changed and refresh accordingly.
      // Walk up the parent chain because nested data map changes
      // (e.g. color, width) have target = data Y.Map, whose parent
      // is the node Y.Map, whose parent is the nodesMap.
      let touchedNodes = false
      let touchedEdges = false
      for (const event of events) {
        let target: Y.Map<unknown> | null = event.target as Y.Map<unknown>
        while (target) {
          if (target === nodesMap) {
            touchedNodes = true
          }
          if (target === edgesMap) {
            touchedEdges = true
          }
          target = target.parent as Y.Map<unknown> | null
        }
      }
      if (touchedNodes) refreshNodes()
      if (touchedEdges) refreshEdges()
    }

    nodesMap.observeDeep(observeDeep)
    edgesMap.observeDeep(observeDeep)

    return () => {
      nodesMap.unobserveDeep(observeDeep)
      edgesMap.unobserveDeep(observeDeep)
    }
  }, [doc])

  // ----- write path: React Flow change → Yjs ------------------------------
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!doc) return
      // Always apply locally for snappy feedback (controlled mode).
      setNodes((curr) => applyNodeChanges(changes, curr))

      // Skip writing to Yjs when we're applying a remote/undo update.
      // The guard is set by refreshNodes/refreshEdges; without it, the
      // Yjs observer → React state → onNodesChange → Yjs write loop
      // would create spurious undo stack entries and clear the redo
      // stack after every undo.
      if (isApplyingRemoteRef.current) return

      const nodesMap = getNodesMap(doc)

      doc.transact(() => {
        for (const change of changes) {
          const ymap = nodesMap.get(change.id) as Y.Map<unknown> | undefined
          if (!ymap) continue
          switch (change.type) {
            case 'position':
              if (change.position) {
                ymap.set('position', { ...change.position })
              }
              break
            case 'dimensions':
              if (change.dimensions) {
                const data = ymap.get('data') as Y.Map<unknown>
                data.set('width', change.dimensions.width)
                data.set('height', change.dimensions.height)
              }
              break
            case 'select':
              // Selection is local-only (transient); not persisted.
              break
            case 'remove': {
              nodesMap.delete(change.id)
              // Also remove any edges connected to this node.
              const edgesMap = getEdgesMap(doc)
              edgesMap.forEach((edgeYMap, edgeId) => {
                const em = edgeYMap as Y.Map<unknown>
                if (em.get('source') === change.id || em.get('target') === change.id) {
                  edgesMap.delete(edgeId)
                }
              })
              break
            }
          }
        }
      }, doc.clientID)
    },
    [doc]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (!doc) return
      setEdges((curr) => applyEdgeChanges(changes, curr))
      // Skip Yjs write during remote/undo application (see onNodesChange).
      if (isApplyingRemoteRef.current) return
      const edgesMap = getEdgesMap(doc)
      doc.transact(() => {
        for (const change of changes) {
          if (change.type === 'remove') {
            edgesMap.delete(change.id)
          }
        }
      }, doc.clientID)
    },
    [doc]
  )

  const addNode = useCallback(
    (node: CanvasNode) => {
      if (!doc) return
      const nodesMap = getNodesMap(doc)
      doc.transact(() => {
        nodesMap.set(node.id, canvasNodeToYMap(node))
      }, doc.clientID)
      // Observer will refresh state; but also set locally for immediacy.
      setNodes((curr) => [...curr, node as unknown as Node])
    },
    [doc]
  )

  const addEdge = useCallback(
    (edge: CanvasEdge) => {
      if (!doc) return
      const edgesMap = getEdgesMap(doc)
      doc.transact(() => {
        edgesMap.set(edge.id, canvasEdgeToYMap(edge))
      }, doc.clientID)
      setEdges((curr) => [...curr, edge as unknown as Edge])
    },
    [doc]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!doc || !connection.source || !connection.target) return
      const edge = createEdge(connection.source, connection.target)
      addEdge(edge)
    },
    [doc, addEdge]
  )

  const updateNodeData = useCallback(
    (id: string, patch: Partial<CanvasNode['data']>) => {
      if (!doc) return
      const nodesMap = getNodesMap(doc)
      const ymap = nodesMap.get(id) as Y.Map<unknown> | undefined
      if (!ymap) return
      const data = ymap.get('data') as Y.Map<unknown>
      doc.transact(() => {
        for (const [k, v] of Object.entries(patch)) {
          data.set(k, v)
        }
      }, doc.clientID)
      setNodes((curr) =>
        curr.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
        )
      )
    },
    [doc]
  )

  const updateNodePosition = useCallback(
    (id: string, position: { x: number; y: number }) => {
      if (!doc) return
      const nodesMap = getNodesMap(doc)
      const ymap = nodesMap.get(id) as Y.Map<unknown> | undefined
      if (!ymap) return
      doc.transact(() => {
        ymap.set('position', { ...position })
      }, doc.clientID)
    },
    [doc]
  )

  const removeNodes = useCallback(
    (ids: string[]) => {
      if (!doc) return
      const nodesMap = getNodesMap(doc)
      const edgesMap = getEdgesMap(doc)
      doc.transact(() => {
        for (const id of ids) {
          nodesMap.delete(id)
          edgesMap.forEach((edgeYMap, edgeId) => {
            const em = edgeYMap as Y.Map<unknown>
            if (em.get('source') === id || em.get('target') === id) {
              edgesMap.delete(edgeId)
            }
          })
        }
      }, doc.clientID)
      setNodes((curr) => curr.filter((n) => !ids.includes(n.id)))
      setEdges((curr) =>
        curr.filter((e) => !ids.includes(e.source) && !ids.includes(e.target))
      )
    },
    [doc]
  )

  const removeEdges = useCallback(
    (ids: string[]) => {
      if (!doc) return
      const edgesMap = getEdgesMap(doc)
      doc.transact(() => {
        for (const id of ids) {
          edgesMap.delete(id)
        }
      }, doc.clientID)
      setEdges((curr) => curr.filter((e) => !ids.includes(e.id)))
    },
    [doc]
  )

  const setNodeZ = useCallback(
    (id: string, z: number) => {
      updateNodeData(id, { zIndex: z })
    },
    [updateNodeData]
  )

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    addEdge,
    updateNodeData,
    updateNodePosition,
    removeNodes,
    removeEdges,
    setNodeZ,
  }
}
