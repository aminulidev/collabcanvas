/**
 * Shared canvas type definitions.
 *
 * These types describe the *domain model* of the whiteboard — the shape
 * of every node and edge that lives on the canvas. They are intentionally
 * framework-agnostic: React Flow consumes them, Yjs persists them, and
 * Zustand references them in transient selection state.
 */

export type NodeType =
  | 'sticky'
  | 'text'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'image'
  | 'comment'
  | 'group'

export type ShapeFill = 'solid' | 'hatched' | 'dotted' | 'none'

/** A single canvas node, serialised to/from Yjs. */
export interface CanvasNodeData {
  /** Domain label rendered inside the node body. */
  label: string
  /** Optional rich text for sticky / text nodes. */
  text?: string
  /** Tailwind/HEX colour token for the node background. */
  color: string
  /** Stroke colour. */
  stroke: string
  /** Width in canvas pixels. */
  width: number
  /** Height in canvas pixels. */
  height: number
  /** Border radius (px). */
  radius: number
  /** Z-index ordering value. */
  zIndex: number
  /** Who last edited the node (for "edited by" tooltip). */
  lastEditedBy?: string
  /** Optional image URL (image nodes). */
  imageUrl?: string
  /** Font size for text-bearing nodes. */
  fontSize?: number
  /** Whether the node is currently being edited inline. */
  editing?: boolean
  [key: string]: unknown
}

/** The full React Flow node payload persisted in the CRDT. */
export interface CanvasNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: CanvasNodeData
  selected?: boolean
  dragging?: boolean
}

export type EdgeKind = 'default' | 'smoothstep' | 'bezier' | 'straight'
export type EdgeMarker = 'none' | 'arrow' | 'dot'

export interface CanvasEdgeData {
  label?: string
  color: string
  strokeWidth: number
  animated: boolean
  kind: EdgeKind
  markerEnd?: EdgeMarker
  markerStart?: EdgeMarker
  [key: string]: unknown
}

export interface CanvasEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  type?: string
  data: CanvasEdgeData
}

/** Presence payload broadcast through the Yjs awareness protocol. */
export interface PresenceState {
  /** Display name shown beside the cursor. */
  name: string
  /** Stable colour for cursor + selection ring. */
  color: string
  /** Cursor position in *screen* coordinates (px from viewport top-left). */
  cursor: { x: number; y: number } | null
  /** Currently selected node ids (renders remote selection outlines). */
  selection: string[]
  /** Node id the peer is currently editing inline (for "editing…" badges). */
  editingNodeId: string | null
  /** The peer's current viewport (x, y, zoom) — used for follow mode. */
  viewport: { x: number; y: number; zoom: number } | null
  /** Optional avatar emoji. */
  avatar?: string
}

/** A simplified view of a connected peer, derived from awareness. */
export interface Peer {
  clientId: number
  name: string
  color: string
  avatar?: string
  cursor: { x: number; y: number } | null
  selection: string[]
  editingNodeId: string | null
  viewport: { x: number; y: number; zoom: number } | null
}

/** Tool modes selectable from the toolbar. */
export type Tool =
  | 'select'
  | 'pan'
  | 'sticky'
  | 'text'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'image'
  | 'comment'
  | 'group'
  | 'edge'

/** Colour palette offered by the toolbar. */
export const NODE_PALETTE: { name: string; bg: string; stroke: string }[] = [
  { name: 'Amber', bg: '#FEF3C7', stroke: '#F59E0B' },
  { name: 'Rose', bg: '#FFE4E6', stroke: '#F43F5E' },
  { name: 'Emerald', bg: '#D1FAE5', stroke: '#10B981' },
  { name: 'Sky', bg: '#E0F2FE', stroke: '#0EA5E9' },
  { name: 'Violet', bg: '#EDE9FE', stroke: '#8B5CF6' },
  { name: 'Slate', bg: '#F1F5F9', stroke: '#64748B' },
]

/** Preset peer colours assigned round-robin on join. */
export const PEER_COLORS = [
  '#F43F5E', '#F59E0B', '#10B981', '#0EA5E9',
  '#8B5CF6', '#EC4899', '#14B8A6', '#84CC16',
]

export const PEER_AVATARS = [
  '🦊', '🐼', '🦉', '🐱', '🐸', '🦄', '🐙', '🦖',
]
