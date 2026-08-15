'use client'

/**
 * Canvas
 * ------------------------------------------------------------------
 * The React Flow engine. Responsibilities:
 *
 *  1. Wire `useCanvasNodes` (Yjs bridge) into React Flow's controlled
 *     `nodes`/`edges`/`onNodesChange` props.
 *  2. Translate the active tool (from the UI store) into React Flow
 *     interaction modes: `select` → default, `pan` → panOnDrag, shape
 *     tools → click-to-place.
 *  3. Forward mouse position to awareness (throttled) so peers see the
 *     live cursor.
 *  4. Provide a NodeContext so custom nodes can mutate Yjs without
 *     touching React Flow internals.
 *  5. Report viewport changes back to the UI store (used by the cursor
 *     overlay to convert screen→canvas coords).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  ConnectionMode,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  PanOnScrollMode,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useCanvasNodes } from '@/hooks/use-canvas-nodes'
import { useUIStore } from '@/store/ui-store'
import { useIdentityStore } from '@/store/identity-store'
import { useAwareness } from '@/hooks/use-awareness'
import { createNode, rafThrottle, snapToGrid } from '@/lib/canvas/utils'
import type { CanvasNode } from '@/types/canvas'

import { StickyNoteNode } from './nodes/sticky-note-node'
import { TextNode } from './nodes/text-node'
import { ShapeNode } from './nodes/shape-node'
import { ImageNode } from './nodes/image-node'
import { CommentNode } from './nodes/comment-node'
import { GroupNode } from './nodes/group-node'
import { AnimatedEdge } from './edges/animated-edge'
import { ConnectionLine } from './edges/connection-line'
import { StatusBar } from './status-bar'
import { AlignmentGuides } from './alignment-guides'
import { NodeContext, type NodeContextValue } from './nodes/node-context'

const nodeTypes: NodeTypes = {
  sticky: StickyNoteNode,
  text: TextNode,
  rectangle: ShapeNode,
  ellipse: ShapeNode,
  diamond: ShapeNode,
  image: ImageNode,
  comment: CommentNode,
  group: GroupNode,
}

const edgeTypes: EdgeTypes = {
  default: AnimatedEdge,
}

interface CanvasProps {
  doc: import('yjs').Doc | null
  provider: import('y-websocket').WebsocketProvider | null
  undoManager: import('yjs').UndoManager | null
}

function CanvasInner({ doc, provider, undoManager: _undoManager }: CanvasProps) {
  const api = useCanvasNodes(doc)
  const identity = useIdentityStore()
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const {
    activeTool,
    isSpaceDown,
    showMinimap,
    showGrid,
    showCursors,
    setViewport,
    viewport,
    setTool,
    setSelectedNodes,
    setSelectedEdges,
    editingNodeId,
  } = useUIStore()
  const { peers, setCursor, setViewport: broadcastViewport } = useAwareness(provider, doc)
  const reactFlow = useReactFlow()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const followTargetRef = useRef<number | null>(null)

  // Build the editingBy map (nodeId -> {name,color}) from peer awareness.
  // When a remote peer is editing a node, we show an "editing…" badge on
  // that node so the local user knows someone else is typing.
  const editingBy = useMemo(() => {
    const map: Record<string, { name: string; color: string }> = {}
    peers.forEach((p) => {
      if (p.editingNodeId) {
        map[p.editingNodeId] = { name: p.name, color: p.color }
      }
    })
    return map
  }, [peers])

  // Build the selectedBy map (nodeId -> color[]) from peer awareness.
  // When a remote peer has nodes selected, we show a colored ring on
  // those nodes so everyone can see what others are looking at.
  const remoteSelections = useMemo(() => {
    const map: Record<string, string[]> = {}
    peers.forEach((p) => {
      p.selection.forEach((nodeId) => {
        if (!map[nodeId]) map[nodeId] = []
        map[nodeId].push(p.color)
      })
    })
    return map
  }, [peers])

  const nodeContext: NodeContextValue = useMemo(
    () => ({
      updateData: api.updateNodeData,
      remove: api.removeNodes,
      beginEdit: (id) => useUIStore.getState().setEditingNode(id),
      endEdit: () => useUIStore.getState().setEditingNode(null),
      editingBy,
      remoteSelections,
    }),
    [api, editingBy, remoteSelections]
  )

  // Fit the viewport to the welcome board the first time nodes appear
  // (the board seeds asynchronously after the initial Yjs sync, so the
  // declarative `fitView` prop alone would run on an empty canvas).
  const didFitRef = useRef(false)
  useEffect(() => {
    if (didFitRef.current) return
    if (api.nodes.length > 0) {
      didFitRef.current = true
      // Defer to next frame so React Flow has measured the nodes.
      requestAnimationFrame(() => {
        reactFlow.fitView({ padding: 0.3, maxZoom: 1, duration: 400 })
      })
    }
  }, [api.nodes.length, reactFlow])

  // Throttled cursor broadcast.
  const pushCursor = useMemo(
    () =>
      rafThrottle((x: number, y: number) => {
        setCursor({ x, y })
      }),
    [setCursor]
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!showCursors) return
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      pushCursor(e.clientX - rect.left, e.clientY - rect.top)
    },
    [pushCursor, showCursors]
  )

  const onMouseLeave = useCallback(() => {
    setCursor(null)
  }, [setCursor])

  // Click-to-place when a shape tool is active.
  const onPaneClick = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool === 'select' || activeTool === 'pan' || activeTool === 'edge')
        return
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      const vp = reactFlow.getViewport()
      const canvasX = (e.clientX - rect.left - vp.x) / vp.zoom
      const canvasY = (e.clientY - rect.top - vp.y) / vp.zoom
      const snapped = {
        x: snapToGrid(canvasX),
        y: snapToGrid(canvasY),
      }

      // Comment nodes get author attribution from identity.
      // Group nodes get a larger default size and lower z-index.
      const overrides: Partial<import('@/types/canvas').CanvasNodeData> =
        activeTool === 'comment'
          ? {
              text: '',
              authorName: identity.name,
              authorColor: identity.color,
              authorAvatar: identity.avatar,
              createdAt: Date.now(),
              color: '#FFFFFF',
              stroke: identity.color,
            }
          : activeTool === 'group'
            ? {
                label: 'New group',
                color: '#F1F5F9',
                stroke: '#64748B',
                zIndex: 0,
                radius: 16,
              }
            : {}

      // Centre the node on the click point. Groups are larger so centre
      // with a bigger offset.
      const offset = activeTool === 'group' ? 180 : 80
      const offsetY = activeTool === 'group' ? 140 : 50
      const node = createNode(
        activeTool as CanvasNode['type'],
        { x: snapped.x - offset, y: snapped.y - offsetY },
        overrides
      ) as unknown as Node
      api.addNode(node as unknown as CanvasNode)
      // Return to select so the user can immediately drag the new node.
      setTool('select')
      // If it's a comment, immediately enter edit mode.
      if (activeTool === 'comment') {
        useUIStore.getState().setEditingNode(node.id)
      }
    },
    [activeTool, api, reactFlow, setTool, identity]
  )

  // Track viewport into the store.
  const onMove = useCallback(
    (_e: unknown, vp: { x: number; y: number; zoom: number }) => {
      setViewport(vp)
      // Broadcast viewport to peers (throttled via rAF inside awareness).
      broadcastViewport(vp)
      // If the user manually moves the canvas, cancel any follow mode.
      if (followTargetRef.current !== null) {
        followTargetRef.current = null
      }
    },
    [setViewport, broadcastViewport]
  )

  // Follow mode: if a target peer is set, smoothly sync our viewport
  // to theirs whenever their viewport changes.
  useEffect(() => {
    if (followTargetRef.current === null) return
    const target = peers.find((p) => p.clientId === followTargetRef.current)
    if (!target?.viewport) return
    reactFlow.setViewport(target.viewport, { duration: 300 })
  }, [peers, reactFlow])

  // Listen for follow-peer requests from the PresenceBar.
  useEffect(() => {
    const onFollow = (e: Event) => {
      const clientId = (e as CustomEvent<number | null>).detail
      followTargetRef.current = clientId
      // Immediately sync to the target's current viewport.
      if (clientId !== null) {
        const target = peers.find((p) => p.clientId === clientId)
        if (target?.viewport) {
          reactFlow.setViewport(target.viewport, { duration: 300 })
        }
      }
    }
    window.addEventListener('collabcanvas:follow-peer', onFollow)
    return () => window.removeEventListener('collabcanvas:follow-peer', onFollow)
  }, [peers, reactFlow])

  // Keyboard shortcuts for tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing.
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
        return
      if (target.isContentEditable) return
      if (editingNodeId) return

      const map: Record<string, typeof activeTool> = {
        v: 'select',
        h: 'pan',
        s: 'sticky',
        t: 'text',
        r: 'rectangle',
        o: 'ellipse',
        d: 'diamond',
        c: 'comment',
        g: 'group',
      }
      const next = map[e.key.toLowerCase()]
      if (next) {
        e.preventDefault()
        setTool(next)
      }
      if (e.key === 'Escape') {
        // Exit presentation mode first if active.
        if (useUIStore.getState().presentationMode) {
          useUIStore.getState().togglePresentation()
          return
        }
        setTool('select')
        useUIStore.getState().setPanel(null)
      }
      if (e.code === 'Space' && !e.repeat) {
        useUIStore.getState().setSpaceDown(true)
      }
      // ? (Shift+/) toggles the shortcuts overlay.
      if (e.key === '?') {
        e.preventDefault()
        const store = useUIStore.getState()
        store.setPanel(store.openPanel === 'shortcuts' ? null : 'shortcuts')
      }
      // P toggles presentation mode (full-screen canvas, hides UI chrome).
      if (e.key.toLowerCase() === 'p' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        useUIStore.getState().togglePresentation()
      }
      // F fits the view to all content.
      if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        reactFlow.fitView({ padding: 0.3, maxZoom: 1, duration: 400 })
      }
      // Cmd/Ctrl+D duplicates the selected node.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        const { selectedNodeIds } = useUIStore.getState()
        if (selectedNodeIds.length > 0) {
          selectedNodeIds.forEach((id) => {
            const node = api.nodes.find((n) => n.id === id)
            if (node) {
              const dup = {
                ...node,
                id: Math.random().toString(36).slice(2, 10),
                position: {
                  x: (node.position as { x: number; y: number }).x + 24,
                  y: (node.position as { x: number; y: number }).y + 24,
                },
              } as unknown as CanvasNode
              api.addNode(dup)
            }
          })
        }
      }
      // Cmd/Ctrl+A selects all nodes.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        const allIds = api.nodes.map((n) => n.id)
        useUIStore.getState().setSelectedNodes(allIds)
        useUIStore.getState().setSelectedEdges([])
      }
      // Shift+F zooms to fit the selected nodes only.
      if (e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        const { selectedNodeIds } = useUIStore.getState()
        if (selectedNodeIds.length > 0) {
          const selectedNodes = api.nodes.filter((n) =>
            selectedNodeIds.includes(n.id)
          )
          if (selectedNodes.length > 0) {
            reactFlow.fitView({
              nodes: selectedNodes as unknown as Node[],
              padding: 0.4,
              maxZoom: 2,
              duration: 400,
            })
          }
        }
      }
      // Cmd/Ctrl+G groups selected nodes into a group frame.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g' && !e.shiftKey) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('collabcanvas:group-selected'))
      }
      // Shift+Cmd/Ctrl+G ungroups selected group nodes.
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('collabcanvas:ungroup-selected'))
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') useUIStore.getState().setSpaceDown(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [setTool, editingNodeId, reactFlow, api])

  // Delete selected nodes/edges with Backspace / Delete (but not while
  // editing text).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingNodeId) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
        return
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const { selectedNodeIds, selectedEdgeIds } = useUIStore.getState()
        if (selectedNodeIds.length || selectedEdgeIds.length) {
          e.preventDefault()
          if (selectedNodeIds.length) api.removeNodes(selectedNodeIds)
          if (selectedEdgeIds.length) api.removeEdges(selectedEdgeIds)
          setSelectedNodes([])
          setSelectedEdges([])
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [api, editingNodeId, setSelectedEdges, setSelectedNodes])

  // Listen for fit-view requests from the Board's dropdown menu.
  useEffect(() => {
    const onFitView = () => {
      reactFlow.fitView({ padding: 0.3, maxZoom: 1, duration: 400 })
    }
    window.addEventListener('collabcanvas:fit-view', onFitView)
    return () => window.removeEventListener('collabcanvas:fit-view', onFitView)
  }, [reactFlow])

  // Listen for jump-to-node requests from the SearchPalette.
  useEffect(() => {
    const onJumpToNode = (e: Event) => {
      const nodeId = (e as CustomEvent<string>).detail
      if (!nodeId) return
      const node = api.nodes.find((n) => n.id === nodeId)
      if (!node) return
      reactFlow.setCenter(
        (node.position as { x: number; y: number }).x +
          ((node.data as { width: number }).width ?? 100) / 2,
        (node.position as { y: number }).y +
          ((node.data as { height: number }).height ?? 50) / 2,
        { zoom: 1.2, duration: 500 }
      )
    }
    window.addEventListener('collabcanvas:jump-to-node', onJumpToNode)
    return () =>
      window.removeEventListener('collabcanvas:jump-to-node', onJumpToNode)
  }, [reactFlow, api.nodes])

  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: { nodes: Node[]; edges: import('@xyflow/react').Edge[] }) => {
      setSelectedNodes(selNodes.map((n) => n.id))
      setSelectedEdges(selEdges.map((e) => e.id))
    },
    [setSelectedNodes, setSelectedEdges]
  )

  // Track node dragging for alignment guides + snapping.
  const onNodeDragStart = useCallback(
    (_e: unknown, node: Node) => setDraggedNodeId(node.id),
    []
  )
  const onNodeDrag = useCallback(
    (_e: unknown, draggedNode: Node) => {
      // Snap the dragged node to alignment with other nodes.
      const others = api.nodes.filter((n) => n.id !== draggedNode.id)
      if (others.length === 0) return

      const dragged = api.nodes.find((n) => n.id === draggedNode.id)
      if (!dragged) return

      const dW = (dragged.data as { width: number }).width ?? 100
      const dH = (dragged.data as { height: number }).height ?? 50
      const dCx = dragged.position.x + dW / 2
      const dCy = dragged.position.y + dH / 2
      const dLeft = dragged.position.x
      const dTop = dragged.position.y

      const THRESHOLD = 6
      let snapX: number | null = null
      let snapY: number | null = null
      let snapType: 'center' | 'left' | 'right' | null = null
      let snapTypeY: 'center' | 'top' | 'bottom' | null = null

      for (const other of others) {
        const oW = (other.data as { width: number }).width ?? 100
        const oH = (other.data as { height: number }).height ?? 50
        const oCx = other.position.x + oW / 2
        const oCy = other.position.y + oH / 2
        const oLeft = other.position.x
        const oTop = other.position.y

        if (snapX === null) {
          if (Math.abs(dCx - oCx) < THRESHOLD) {
            snapX = oCx - dW / 2
            snapType = 'center'
          } else if (Math.abs(dLeft - oLeft) < THRESHOLD) {
            snapX = oLeft
            snapType = 'left'
          }
        }
        if (snapY === null) {
          if (Math.abs(dCy - oCy) < THRESHOLD) {
            snapY = oCy - dH / 2
            snapTypeY = 'center'
          } else if (Math.abs(dTop - oTop) < THRESHOLD) {
            snapY = oTop
            snapTypeY = 'top'
          }
        }
      }

      if (snapX !== null || snapY !== null) {
        api.updateNodePosition(draggedNode.id, {
          x: snapX ?? dragged.position.x,
          y: snapY ?? dragged.position.y,
        })
      }
    },
    [api]
  )
  const onNodeDragStop = useCallback(() => setDraggedNodeId(null), [])

  // Pan-on-drag when space is held OR pan tool is active.
  const panOnDrag = activeTool === 'pan' || isSpaceDown
  // Selection drag only in select mode.
  const selectionOnDrag = activeTool === 'select'
  const panOnScroll = activeTool === 'pan' || isSpaceDown

  // Right-click on a node opens the context menu via a custom event.
  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: Node) => {
      e.preventDefault()
      const data = node.data as { color: string; stroke: string }
      window.dispatchEvent(
        new CustomEvent('collabcanvas:node-context-menu', {
          detail: {
            x: e.clientX,
            y: e.clientY,
            nodeId: node.id,
            nodeType: node.type ?? 'node',
            currentColor: data?.color ?? '#FEF3C7',
            currentStroke: data?.stroke ?? '#F59E0B',
          },
        })
      )
    },
    []
  )

  // Connection mode: only allow connections from the edge tool or
  // always (Miro-style). We allow always for friendliness but require
  // an explicit drag from a handle.
  const nodesWithSelection = api.nodes
  const edgesWithSelection = api.edges
  const isEmpty = api.nodes.length === 0

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full relative"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <NodeContext.Provider value={nodeContext}>
        <ReactFlow
          nodes={nodesWithSelection}
          edges={edgesWithSelection}
          onNodesChange={api.onNodesChange}
          onEdgesChange={api.onEdgesChange}
          onConnect={api.onConnect}
          connectionMode={ConnectionMode.Loose}
          connectionLineComponent={ConnectionLine}
          onMove={onMove}
          onPaneClick={onPaneClick}
          onSelectionChange={onSelectionChange}
          onNodeContextMenu={onNodeContextMenu}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          panOnDrag={panOnDrag}
          panOnScroll={panOnScroll}
          panOnScrollMode={PanOnScrollMode.Free}
          selectionOnDrag={selectionOnDrag}
          selectionMode={undefined}
          zoomOnScroll={!panOnScroll}
          zoomOnPinch
          preventScrolling
          deleteKeyCode={null}
          multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
          proOptions={{ hideAttribution: true }}
          minZoom={0.1}
          maxZoom={4}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
          className="bg-[#FAFAF9] dark:bg-[#0B0B0C]"
          style={{
            cursor:
              activeTool === 'pan'
                ? 'grab'
                : activeTool === 'select'
                  ? 'default'
                  : 'crosshair',
          }}
        >
          {showGrid && (
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1.5}
              color="#94A3B8"
              className="opacity-40"
            />
          )}
          {showMinimap && (
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) =>
                ((n.data as { color?: string })?.color) ?? '#CBD5E1'
              }
              maskColor="rgba(0,0,0,0.05)"
              className="!bg-white/80 !backdrop-blur !border !rounded-lg !shadow-sm"
              style={{ width: 180, height: 120, bottom: 40 }}
              position="bottom-right"
            />
          )}
          <Controls
            className="!bg-white !border !rounded-lg !shadow-sm !overflow-hidden"
            showInteractive={false}
            position="bottom-left"
          />
        </ReactFlow>
      </NodeContext.Provider>
      <AlignmentGuides
        nodes={api.nodes as unknown as import('@/types/canvas').CanvasNode[]}
        draggedNodeId={draggedNodeId}
        viewport={viewport}
      />
      {/* Empty-state hint */}
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center max-w-sm px-6">
            <div className="text-5xl mb-3 opacity-40">🎨</div>
            <h3 className="text-lg font-semibold text-muted-foreground mb-1">
              Your canvas is empty
            </h3>
            <p className="text-sm text-muted-foreground/70">
              Pick a tool from the left toolbar and click anywhere to start.
              Try <kbd className="px-1 py-0.5 rounded bg-muted text-xs font-mono">S</kbd> for a sticky note or{' '}
              <kbd className="px-1 py-0.5 rounded bg-muted text-xs font-mono">T</kbd> for text.
            </p>
          </div>
        </div>
      )}
      <StatusBar nodeCount={api.nodes.length} edgeCount={api.edges.length} />
    </div>
  )
}

export function Canvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}
