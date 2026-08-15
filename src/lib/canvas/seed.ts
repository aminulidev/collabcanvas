'use client'

/**
 * seedWelcomeBoard
 * ------------------------------------------------------------------
 * Populates a brand-new room with a curated starter board so first-time
 * visitors see something interesting instead of an empty canvas. Only
 * runs once per room (guarded by a meta flag set atomically).
 */
import * as Y from 'yjs'
import { getNodesMap, getEdgesMap, getMetaMap, canvasNodeToYMap, canvasEdgeToYMap } from '@/lib/yjs/schema'
import { createNode, createEdge } from '@/lib/canvas/utils'
import { nanoid } from 'nanoid'

export function seedWelcomeBoard(doc: Y.Doc, authorName: string) {
  const meta = getMetaMap(doc)
  // Atomic guard: if already seeded, bail.
  if (meta.get('seeded') === true) return

  const nodesMap = getNodesMap(doc)
  const edgesMap = getEdgesMap(doc)

  doc.transact(() => {
    meta.set('seeded', true)
    meta.set('name', 'Welcome board')
    meta.set('createdAt', Date.now())
    meta.set('createdBy', authorName)

    // Title text node
    const title = createNode('text', { x: -200, y: -260 }, {
      text: 'CollabCanvas',
      fontSize: 42,
      width: 420,
      height: 56,
      stroke: '#0F172A',
      color: 'transparent',
    })

    const subtitle = createNode('text', { x: -200, y: -200 }, {
      text: 'A real-time multiplayer infinite canvas. Drag, draw, and edit together.',
      fontSize: 14,
      width: 480,
      height: 24,
      stroke: '#64748B',
      color: 'transparent',
    })

    // Intro sticky
    const intro = createNode('sticky', { x: -200, y: -140 }, {
      text: '👋 Welcome! This board is live. Everything you change syncs instantly to anyone in the room.',
      color: '#FEF3C7',
      stroke: '#F59E0B',
      width: 240,
      height: 180,
    })

    // "How it works" sticky
    const howTo = createNode('sticky', { x: 80, y: -140 }, {
      text: 'Double-click any note to edit. Pick a tool from the left (V/H/S/T/R/O/D). Press ⌘Z to undo.',
      color: '#D1FAE5',
      stroke: '#10B981',
      width: 240,
      height: 180,
    })

    // Shapes cluster
    const rect = createNode('rectangle', { x: -200, y: 80 }, {
      label: 'Planning',
      color: '#E0F2FE',
      stroke: '#0EA5E9',
    })
    const ellipse = createNode('ellipse', { x: 40, y: 80 }, {
      label: 'Design',
      color: '#FFE4E6',
      stroke: '#F43F5E',
    })
    const diamond = createNode('diamond', { x: 260, y: 70 }, {
      label: 'Ship?',
      color: '#EDE9FE',
      stroke: '#8B5CF6',
      width: 180,
      height: 140,
    })

    // Connector edges
    const e1 = createEdge(title.id, intro.id, { label: 'start here', color: '#F59E0B', animated: true })
    const e2 = createEdge(rect.id, ellipse.id, { color: '#0EA5E9' })
    const e3 = createEdge(ellipse.id, diamond.id, { color: '#F43F5E', animated: true })

    for (const n of [title, subtitle, intro, howTo, rect, ellipse, diamond]) {
      nodesMap.set(n.id, canvasNodeToYMap(n))
    }
    for (const e of [e1, e2, e3]) {
      edgesMap.set(e.id, canvasEdgeToYMap(e))
    }
  }, 'seed')
}

/** Returns true if the doc already has content (so we don't seed twice). */
export function isRoomSeeded(doc: Y.Doc): boolean {
  return getMetaMap(doc).get('seeded') === true
}

// Keep nanoid import live for potential future id overrides.
void nanoid
