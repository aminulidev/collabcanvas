/**
 * Canvas utilities: node/edge factories, geometry helpers, and viewport
 * transforms used by both the canvas engine and the cursor overlay.
 */
import { nanoid } from 'nanoid'
import type {
  CanvasNode,
  CanvasEdge,
  CanvasNodeData,
  NodeType,
} from '@/types/canvas'
import { NODE_PALETTE } from '@/types/canvas'

/** Default dimensions per node type. */
export const DEFAULT_NODE_SIZE: Record<NodeType, { w: number; h: number }> = {
  sticky: { w: 220, h: 200 },
  text: { w: 200, h: 60 },
  rectangle: { w: 160, h: 100 },
  ellipse: { w: 160, h: 120 },
  diamond: { w: 180, h: 140 },
  image: { w: 240, h: 180 },
  comment: { w: 220, h: 120 },
  group: { w: 360, h: 280 },
}

export function createNode(
  type: NodeType,
  position: { x: number; y: number },
  overrides: Partial<CanvasNodeData> = {}
): CanvasNode {
  const size = DEFAULT_NODE_SIZE[type]
  const palette = NODE_PALETTE[Math.floor(Math.random() * NODE_PALETTE.length)]
  const data: CanvasNodeData = {
    label: defaultLabelFor(type),
    text: type === 'sticky' || type === 'text' ? defaultLabelFor(type) : '',
    color: palette.bg,
    stroke: palette.stroke,
    width: size.w,
    height: size.h,
    radius: type === 'ellipse' ? 9999 : type === 'rectangle' ? 12 : 8,
    zIndex: 1,
    fontSize: type === 'text' ? 18 : 14,
    ...overrides,
  }
  return {
    id: nanoid(8),
    type,
    position,
    data,
  }
}

function defaultLabelFor(type: NodeType): string {
  switch (type) {
    case 'sticky':
      return 'New note'
    case 'text':
      return 'Double-click to edit'
    case 'rectangle':
      return 'Rectangle'
    case 'ellipse':
      return 'Ellipse'
    case 'diamond':
      return 'Decision'
    case 'image':
      return 'Image'
    case 'comment':
      return 'New comment'
    case 'group':
      return 'Group'
  }
}

export function createEdge(
  source: string,
  target: string,
  overrides: Partial<CanvasEdge['data']> = {}
): CanvasEdge {
  return {
    id: nanoid(8),
    source,
    target,
    type: 'default',
    data: {
      label: '',
      color: '#64748B',
      strokeWidth: 2,
      animated: false,
      kind: 'bezier',
      markerEnd: 'arrow',
      ...overrides,
    },
  }
}

/**
 * Convert a screen-space point (e.g. mouse clientX/Y) into canvas
 * coordinates given the current React Flow viewport.
 */
export function screenToCanvas(
  point: { x: number; y: number },
  viewport: { x: number; y: number; zoom: number },
  containerOrigin: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: (point.x - containerOrigin.x - viewport.x) / viewport.zoom,
    y: (point.y - containerOrigin.y - viewport.y) / viewport.zoom,
  }
}

/** Snap a coordinate to a grid of `size` px. */
export function snapToGrid(value: number, size = 8): number {
  return Math.round(value / size) * size
}

/** Check whether a node's bounding box intersects the viewport. */
export function isNodeVisible(
  node: { position: { x: number; y: number }; data: { width: number; height: number } },
  viewport: { x: number; y: number; zoom: number },
  viewSize: { width: number; height: number },
  padding = 200
): boolean {
  const { x, y, zoom } = viewport
  const { width, height } = viewSize
  const nx = node.position.x * zoom + x
  const ny = node.position.y * zoom + y
  const nw = node.data.width * zoom
  const nh = node.data.height * zoom
  return (
    nx + nw + padding >= 0 &&
    ny + nh + padding >= 0 &&
    nx - padding <= width &&
    ny - padding <= height
  )
}

/** Throttle a high-frequency function using requestAnimationFrame. */
export function rafThrottle<T extends (...args: never[]) => void>(
  fn: T
): T & { cancel: () => void } {
  let scheduled = false
  let lastArgs: Parameters<T>
  const throttled = ((...args: Parameters<T>) => {
    lastArgs = args
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      fn(...lastArgs)
    })
  }) as T & { cancel: () => void }
  throttled.cancel = () => {
    scheduled = false
  }
  return throttled
}

/** Simple leading-edge debounce. */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  wait = 50
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }) as T & { cancel: () => void }
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  return debounced
}
