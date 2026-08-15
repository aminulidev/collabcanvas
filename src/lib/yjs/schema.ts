/**
 * Yjs document schema & helpers.
 * ------------------------------------------------------------------
 * The CRDT document is laid out as:
 *
 *   doc
 *   ├── meta        (Y.Map)  — room metadata: name, createdAt, etc.
 *   ├── nodes       (Y.Map<id, Y.Map>)  — one nested map per node
 *   ├── edges       (Y.Map<id, Y.Map>)  — one nested map per edge
 *   └── awareness   (built-in)          — presence / cursors
 *
 * Why nested Y.Maps per node instead of a Y.Array?
 *  - O(1) keyed lookups for updates (drag, resize, text edits) instead
 *    of O(n) array scans.
 *  - Granular CRDT merges: two clients editing *different fields* of
 *    the same node never conflict, even when offline.
 *  - Deletions are explicit (map.delete) and survive concurrent ops.
 */
import * as Y from 'yjs'
import type { CanvasNode, CanvasEdge } from '@/types/canvas'

export const YJS_KEYS = {
  meta: 'meta',
  nodes: 'nodes',
  edges: 'edges',
} as const

/** Create a fresh Y.Doc with the standard schema pre-populated. */
export function createCanvasDoc(): Y.Doc {
  const doc = new Y.Doc()
  // Pre-create the top-level maps so observers can attach before any
  // remote update arrives.
  doc.getMap(YJS_KEYS.meta)
  doc.getMap(YJS_KEYS.nodes)
  doc.getMap(YJS_KEYS.edges)
  return doc
}

export function getNodesMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>(YJS_KEYS.nodes)
}

export function getEdgesMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>(YJS_KEYS.edges)
}

export function getMetaMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap<unknown>(YJS_KEYS.meta)
}

/** Serialise a CanvasNode into a fresh nested Y.Map. */
export function canvasNodeToYMap(node: CanvasNode): Y.Map<unknown> {
  const ymap = new Y.Map<unknown>()
  ymap.set('id', node.id)
  ymap.set('type', node.type)
  ymap.set('position', { ...node.position })
  const dataMap = new Y.Map<unknown>()
  for (const [k, v] of Object.entries(node.data)) {
    dataMap.set(k, v)
  }
  ymap.set('data', dataMap)
  return ymap
}

export function canvasEdgeToYMap(edge: CanvasEdge): Y.Map<unknown> {
  const ymap = new Y.Map<unknown>()
  ymap.set('id', edge.id)
  ymap.set('source', edge.source)
  ymap.set('target', edge.target)
  // Store handle ids only when set; React Flow treats `undefined` as
  // "use the default handle" but warns on explicit `null`.
  if (edge.sourceHandle) ymap.set('sourceHandle', edge.sourceHandle)
  else ymap.delete('sourceHandle')
  if (edge.targetHandle) ymap.set('targetHandle', edge.targetHandle)
  else ymap.delete('targetHandle')
  ymap.set('type', edge.type ?? 'default')
  const dataMap = new Y.Map<unknown>()
  for (const [k, v] of Object.entries(edge.data)) {
    dataMap.set(k, v)
  }
  ymap.set('data', dataMap)
  return ymap
}

/** Read a nested Y.Map back into a plain CanvasNode. */
export function yMapToCanvasNode(ymap: Y.Map<unknown>): CanvasNode {
  const dataMap = ymap.get('data') as Y.Map<unknown> | undefined
  const data: Record<string, unknown> = {}
  if (dataMap) {
    dataMap.forEach((v, k) => {
      data[k] = v
    })
  }
  return {
    id: ymap.get('id') as string,
    type: ymap.get('type') as CanvasNode['type'],
    position: ymap.get('position') as { x: number; y: number },
    data: data as CanvasNode['data'],
  }
}

export function yMapToCanvasEdge(ymap: Y.Map<unknown>): CanvasEdge {
  const dataMap = ymap.get('data') as Y.Map<unknown> | undefined
  const data: Record<string, unknown> = {}
  if (dataMap) {
    dataMap.forEach((v, k) => {
      data[k] = v
    })
  }
  return {
    id: ymap.get('id') as string,
    source: ymap.get('source') as string,
    target: ymap.get('target') as string,
    // undefined (not null) so React Flow uses the default handle.
    sourceHandle: (ymap.get('sourceHandle') as string | undefined) ?? undefined,
    targetHandle: (ymap.get('targetHandle') as string | undefined) ?? undefined,
    type: (ymap.get('type') as string) ?? 'default',
    data: data as CanvasEdge['data'],
  }
}

/** Snapshot the entire nodes map into a plain array (cheap; used for hydration). */
export function snapshotNodes(doc: Y.Doc): CanvasNode[] {
  const map = getNodesMap(doc)
  const out: CanvasNode[] = []
  map.forEach((ymap) => {
    out.push(yMapToCanvasNode(ymap as Y.Map<unknown>))
  })
  return out
}

export function snapshotEdges(doc: Y.Doc): CanvasEdge[] {
  const map = getEdgesMap(doc)
  const out: CanvasEdge[] = []
  map.forEach((ymap) => {
    out.push(yMapToCanvasEdge(ymap as Y.Map<unknown>))
  })
  return out
}
