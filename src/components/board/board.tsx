'use client'

/**
 * Board
 * ------------------------------------------------------------------
 * The full-screen collaborative canvas surface. Orchestrates:
 *
 *   TopBar (UI overlay)
 *   ┌───────────────────────────────────────────────┐
 *   │ Toolbar │        Canvas (React Flow)          │
 *   │         │   ┌── CursorOverlay (networking) ──┐│
 *   │         │   └────────────────────────────────┘│
 *   │         │   ┌── PropertiesPanel (inspector) ─┐│
 *   │         │   └────────────────────────────────┘│
 *   └───────────────────────────────────────────────┘
 *   ArchitecturePanel / ShortcutsOverlay (modals)
 *   NodeContextMenu (right-click)
 *
 * Wires the Yjs document, provider, and awareness into the canvas and
 * the collaboration overlays. Also seeds a welcome board the first
 * time a room is opened.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useYjsDocument } from '@/hooks/use-yjs-document'
import { useAwareness } from '@/hooks/use-awareness'
import { Canvas } from '@/components/canvas/canvas'
import { Toolbar } from '@/components/canvas/toolbar'
import { TopBar } from '@/components/board/top-bar'
import { CursorOverlay } from '@/components/collaboration/cursor-overlay'
import { ArchitecturePanel } from '@/components/board/architecture-panel'
import { SchemaPanel } from '@/components/board/schema-panel'
import { PerformancePanel } from '@/components/board/performance-panel'
import { ShortcutsOverlay } from '@/components/board/shortcuts-overlay'
import { PropertiesPanel } from '@/components/board/properties-panel'
import { EdgePropertiesPanel } from '@/components/board/edge-properties-panel'
import { ActivityPanel } from '@/components/board/activity-panel'
import { NodeContextMenu } from '@/components/canvas/node-context-menu'
import { ImageGeneratorDialog } from '@/components/canvas/image-generator-dialog'
import { TemplatesDialog } from '@/components/canvas/templates-dialog'
import { SearchPalette } from '@/components/canvas/search-palette'
import { useIdentityStore } from '@/store/identity-store'
import { useUIStore } from '@/store/ui-store'
import { toast } from 'sonner'
import { seedWelcomeBoard } from '@/lib/canvas/seed'
import {
  getNodesMap,
  getEdgesMap,
  canvasNodeToYMap,
  canvasEdgeToYMap,
  yMapToCanvasNode,
} from '@/lib/yjs/schema'
import { createNode, createEdge } from '@/lib/canvas/utils'
import type { CanvasNode } from '@/types/canvas'
import type * as Y from 'yjs'

interface BoardProps {
  roomId: string
}

export function Board({ roomId }: BoardProps) {
  // 1. Hydrate identity from localStorage.
  const hydrate = useIdentityStore((s) => s.hydrate)
  const identityHydrated = useIdentityStore((s) => s.hydrated)
  const identityName = useIdentityStore((s) => s.name)
  useEffect(() => {
    hydrate()
  }, [hydrate])

  // 2. Open the Yjs document + provider + UndoManager.
  const { doc, provider, undoManager, ready } = useYjsDocument(roomId)

  // 3. Seed a welcome board the first time this room is opened.
  const seededRef = useRef(false)
  useEffect(() => {
    if (!doc || !ready || !identityHydrated || seededRef.current) return
    seedWelcomeBoard(doc, identityName)
    seededRef.current = true
  }, [doc, ready, identityHydrated, identityName])

  // 4. Awareness (presence + cursors + editing state).
  const awareness = useAwareness(provider, doc)

  // 5. Image generator dialog state.
  const [imageGenOpen, setImageGenOpen] = useState(false)
  const openImageGen = useCallback(() => setImageGenOpen(true), [])

  // Add an image node straight into the Yjs nodes map. The Canvas
  // component's useCanvasNodes observer will pick it up and re-render.
  const addImageNode = useCallback(
    (node: CanvasNode) => {
      if (!doc) return
      const nodesMap = getNodesMap(doc)
      doc.transact(() => {
        nodesMap.set(node.id, canvasNodeToYMap(node))
      }, doc.clientID)
    },
    [doc]
  )

  // ----- Node context menu actions ----------------------------------------
  // These operate directly on the Yjs maps so they work even if the
  // PropertiesPanel hasn't mounted yet.
  const duplicateNode = useCallback(
    (id: string) => {
      if (!doc) return
      const nodesMap = getNodesMap(doc)
      const ymap = nodesMap.get(id) as Y.Map<unknown> | undefined
      if (!ymap) return
      const original = yMapToCanvasNode(ymap)
      const dup = createNode(original.type, {
        x: original.position.x + 24,
        y: original.position.y + 24,
      })
      // Copy data fields from the original.
      dup.data = { ...original.data }
      doc.transact(() => {
        nodesMap.set(dup.id, canvasNodeToYMap(dup))
      }, doc.clientID)
    },
    [doc]
  )

  const deleteNode = useCallback(
    (id: string) => {
      if (!doc) return
      const nodesMap = getNodesMap(doc)
      const edgesMap = getEdgesMap(doc)
      doc.transact(() => {
        nodesMap.delete(id)
        edgesMap.forEach((edgeYMap, edgeId) => {
          const em = edgeYMap as Y.Map<unknown>
          if (em.get('source') === id || em.get('target') === id) {
            edgesMap.delete(edgeId)
          }
        })
      }, doc.clientID)
      // Clear local selection if the deleted node was selected.
      const { selectedNodeIds } = useUIStore.getState()
      if (selectedNodeIds.includes(id)) {
        useUIStore.getState().setSelectedNodes(
          selectedNodeIds.filter((n) => n !== id)
        )
      }
    },
    [doc]
  )

  const bringToFront = useCallback(
    (id: string) => {
      if (!doc) return
      const nodesMap = getNodesMap(doc)
      const ymap = nodesMap.get(id) as Y.Map<unknown> | undefined
      if (!ymap) return
      const data = ymap.get('data') as Y.Map<unknown>
      doc.transact(() => {
        data.set('zIndex', 100)
      }, doc.clientID)
    },
    [doc]
  )

  const sendToBack = useCallback(
    (id: string) => {
      if (!doc) return
      const nodesMap = getNodesMap(doc)
      const ymap = nodesMap.get(id) as Y.Map<unknown> | undefined
      if (!ymap) return
      const data = ymap.get('data') as Y.Map<unknown>
      doc.transact(() => {
        data.set('zIndex', 0)
      }, doc.clientID)
    },
    [doc]
  )

  const changeNodeColor = useCallback(
    (id: string, bg: string, stroke: string) => {
      if (!doc) return
      const nodesMap = getNodesMap(doc)
      const ymap = nodesMap.get(id) as Y.Map<unknown> | undefined
      if (!ymap) return
      const data = ymap.get('data') as Y.Map<unknown>
      doc.transact(() => {
        data.set('color', bg)
        data.set('stroke', stroke)
      }, doc.clientID)
    },
    [doc]
  )

  const editNode = useCallback((id: string) => {
    useUIStore.getState().setEditingNode(id)
  }, [])

  // Listen for duplicate events from the PropertiesPanel.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as CanvasNode
      if (detail && doc) {
        const nodesMap = getNodesMap(doc)
        doc.transact(() => {
          nodesMap.set(detail.id, canvasNodeToYMap(detail))
        }, doc.clientID)
      }
    }
    window.addEventListener('collabcanvas:duplicate-node', handler)
    return () =>
      window.removeEventListener('collabcanvas:duplicate-node', handler)
  }, [doc])

  // Clear the entire board (all nodes + edges).
  const clearBoard = useCallback(() => {
    if (!doc) return
    const nodesMap = getNodesMap(doc)
    const edgesMap = getEdgesMap(doc)
    doc.transact(() => {
      nodesMap.clear()
      edgesMap.clear()
    }, doc.clientID)
    useUIStore.getState().setSelectedNodes([])
    useUIStore.getState().setSelectedEdges([])
  }, [doc])

  // Batch lock/unlock all nodes on the board.
  const lockAll = useCallback(() => {
    if (!doc) return
    const nodesMap = getNodesMap(doc)
    doc.transact(() => {
      nodesMap.forEach((ymap) => {
        const data = (ymap as Y.Map<unknown>).get('data') as Y.Map<unknown>
        data.set('locked', true)
      })
    }, doc.clientID)
    toast.success('All nodes locked')
  }, [doc])

  const unlockAll = useCallback(() => {
    if (!doc) return
    const nodesMap = getNodesMap(doc)
    doc.transact(() => {
      nodesMap.forEach((ymap) => {
        const data = (ymap as Y.Map<unknown>).get('data') as Y.Map<unknown>
        data.set('locked', false)
      })
    }, doc.clientID)
    toast.success('All nodes unlocked')
  }, [doc])

  // Distribute selected nodes evenly (horizontal or vertical).
  const distributeNodes = useCallback(
    (direction: 'horizontal' | 'vertical') => {
      if (!doc) return
      const { selectedNodeIds } = useUIStore.getState()
      if (selectedNodeIds.length < 3) {
        toast.info('Select at least 3 nodes to distribute')
        return
      }
      const nodesMap = getNodesMap(doc)
      // Collect the selected nodes with their positions.
      const selected: { id: string; x: number; y: number; w: number; h: number }[] = []
      selectedNodeIds.forEach((id) => {
        const ymap = nodesMap.get(id) as Y.Map<unknown> | undefined
        if (!ymap) return
        const pos = ymap.get('position') as { x: number; y: number }
        const data = ymap.get('data') as Y.Map<unknown>
        const w = (data.get('width') as number) ?? 100
        const h = (data.get('height') as number) ?? 50
        selected.push({ id, x: pos.x, y: pos.y, w, h })
      })
      if (selected.length < 3) return

      // Sort by the distribute axis.
      if (direction === 'horizontal') {
        selected.sort((a, b) => a.x - b.x)
        const first = selected[0]
        const last = selected[selected.length - 1]
        const totalSpan = last.x + last.w - first.x
        const totalNodeWidth = selected.reduce((sum, n) => sum + n.w, 0)
        const gap = (totalSpan - totalNodeWidth) / (selected.length - 1)
        let cursor = first.x
        doc.transact(() => {
          selected.forEach((n) => {
            const ymap = nodesMap.get(n.id) as Y.Map<unknown>
            ymap.set('position', { x: cursor, y: n.y })
            cursor += n.w + gap
          })
        }, doc.clientID)
      } else {
        selected.sort((a, b) => a.y - b.y)
        const first = selected[0]
        const last = selected[selected.length - 1]
        const totalSpan = last.y + last.h - first.y
        const totalNodeHeight = selected.reduce((sum, n) => sum + n.h, 0)
        const gap = (totalSpan - totalNodeHeight) / (selected.length - 1)
        let cursor = first.y
        doc.transact(() => {
          selected.forEach((n) => {
            const ymap = nodesMap.get(n.id) as Y.Map<unknown>
            ymap.set('position', { x: n.x, y: cursor })
            cursor += n.h + gap
          })
        }, doc.clientID)
      }
      toast.success(`Distributed ${selected.length} nodes ${direction}ly`)
    },
    [doc]
  )

  // Align selected nodes: left, center, right, top, middle, bottom.
  const alignNodes = useCallback(
    (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (!doc) return
      const { selectedNodeIds } = useUIStore.getState()
      if (selectedNodeIds.length < 2) {
        toast.info('Select at least 2 nodes to align')
        return
      }
      const nodesMap = getNodesMap(doc)
      const selected: { id: string; x: number; y: number; w: number; h: number }[] = []
      selectedNodeIds.forEach((id) => {
        const ymap = nodesMap.get(id) as Y.Map<unknown> | undefined
        if (!ymap) return
        const pos = ymap.get('position') as { x: number; y: number }
        const data = ymap.get('data') as Y.Map<unknown>
        const w = (data.get('width') as number) ?? 100
        const h = (data.get('height') as number) ?? 50
        selected.push({ id, x: pos.x, y: pos.y, w, h })
      })
      if (selected.length < 2) return

      // Compute the alignment target.
      const minX = Math.min(...selected.map((n) => n.x))
      const maxX = Math.max(...selected.map((n) => n.x + n.w))
      const minY = Math.min(...selected.map((n) => n.y))
      const maxY = Math.max(...selected.map((n) => n.y + n.h))
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2

      doc.transact(() => {
        selected.forEach((n) => {
          const ymap = nodesMap.get(n.id) as Y.Map<unknown>
          let newX = n.x
          let newY = n.y
          if (alignment === 'left') newX = minX
          else if (alignment === 'right') newX = maxX - n.w
          else if (alignment === 'center') newX = centerX - n.w / 2
          else if (alignment === 'top') newY = minY
          else if (alignment === 'bottom') newY = maxY - n.h
          else if (alignment === 'middle') newY = centerY - n.h / 2
          ymap.set('position', { x: newX, y: newY })
        })
      }, doc.clientID)
      toast.success(`Aligned ${selected.length} nodes ${alignment}`)
    },
    [doc]
  )

  // Wrap selected nodes in a group frame.
  const groupSelected = useCallback(() => {
    if (!doc) return
    const { selectedNodeIds } = useUIStore.getState()
    if (selectedNodeIds.length < 1) {
      toast.info('Select nodes to group')
      return
    }
    const nodesMap = getNodesMap(doc)
    // Compute bounding box of selected nodes.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    selectedNodeIds.forEach((id) => {
      const ymap = nodesMap.get(id) as Y.Map<unknown> | undefined
      if (!ymap) return
      const pos = ymap.get('position') as { x: number; y: number }
      const data = ymap.get('data') as Y.Map<unknown>
      const w = (data.get('width') as number) ?? 100
      const h = (data.get('height') as number) ?? 50
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x + w)
      maxY = Math.max(maxY, pos.y + h)
    })
    if (minX === Infinity) return

    // Create a group node that wraps the bounding box with padding.
    const padding = 40
    const groupNode = {
      id: Math.random().toString(36).slice(2, 10),
      type: 'group' as const,
      position: { x: minX - padding, y: minY - padding },
      data: {
        label: 'New group',
        color: '#F1F5F9',
        stroke: '#64748B',
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2,
        radius: 16,
        zIndex: 0,
      },
    }
    doc.transact(() => {
      nodesMap.set(groupNode.id, canvasNodeToYMap(groupNode))
    }, doc.clientID)
    toast.success(`Grouped ${selectedNodeIds.length} nodes`)
  }, [doc])

  // Ungroup: remove selected group nodes (keeps child nodes).
  const ungroupSelected = useCallback(() => {
    if (!doc) return
    const { selectedNodeIds } = useUIStore.getState()
    if (selectedNodeIds.length === 0) {
      toast.info('Select a group to ungroup')
      return
    }
    const nodesMap = getNodesMap(doc)
    let removed = 0
    doc.transact(() => {
      selectedNodeIds.forEach((id) => {
        const ymap = nodesMap.get(id) as Y.Map<unknown> | undefined
        if (!ymap) return
        const type = ymap.get('type') as string
        if (type === 'group') {
          nodesMap.delete(id)
          removed++
        }
      })
    }, doc.clientID)
    if (removed > 0) {
      toast.success(`Ungrouped ${removed} group${removed > 1 ? 's' : ''}`)
      useUIStore.getState().setSelectedNodes([])
    } else {
      toast.info('No group nodes selected')
    }
  }, [doc])

  // Listen for group-selected events from the Canvas keyboard shortcut.
  useEffect(() => {
    const handler = () => groupSelected()
    window.addEventListener('collabcanvas:group-selected', handler)
    return () =>
      window.removeEventListener('collabcanvas:group-selected', handler)
  }, [groupSelected])

  // Listen for ungroup-selected events.
  useEffect(() => {
    const handler = () => ungroupSelected()
    window.addEventListener('collabcanvas:ungroup-selected', handler)
    return () =>
      window.removeEventListener('collabcanvas:ungroup-selected', handler)
  }, [ungroupSelected])

  // Export the canvas as a PNG using html-to-image.
  const exportImage = useCallback(async () => {
    const canvasEl = document.querySelector('.react-flow') as HTMLElement | null
    if (!canvasEl) {
      toast.error('Could not find canvas element')
      return
    }
    toast.info('Generating PNG export…')
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(canvasEl, {
        backgroundColor: '#FAFAF9',
        pixelRatio: 2,
        filter: (node) => {
          // Exclude the minimap and controls from the export.
          const el = node as HTMLElement
          if (el?.className?.includes?.('react-flow__minimap')) return false
          if (el?.className?.includes?.('react-flow__controls')) return false
          if (el?.className?.includes?.('collab-cursor')) return false
          return true
        },
      })
      const link = document.createElement('a')
      link.download = `collabcanvas-${roomId}-${Date.now()}.png`
      link.href = dataUrl
      link.click()
      toast.success('PNG exported successfully')
    } catch (err) {
      console.error('[exportImage]', err)
      toast.error('Export failed — try again')
    }
  }, [roomId])

  // Jump to a node by id: fit the viewport to that node.
  const jumpToNode = useCallback((nodeId: string) => {
    window.dispatchEvent(
      new CustomEvent('collabcanvas:jump-to-node', { detail: nodeId })
    )
  }, [])

  // Templates dialog state.
  const [templatesOpen, setTemplatesOpen] = useState(false)

  // Search palette state.
  const [searchOpen, setSearchOpen] = useState(false)

  const fitView = useCallback(() => {
    // Dispatch a custom event the Canvas listens for.
    window.dispatchEvent(new CustomEvent('collabcanvas:fit-view'))
  }, [])

  // Keep createEdge import alive (used by context menu in future).
  void createEdge
  void createNode

  // Ctrl+F / Cmd+F opens the search palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Activity panel state.
  const [activityOpen, setActivityOpen] = useState(false)
  const presentationMode = useUIStore((s) => s.presentationMode)

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {!presentationMode && (
        <TopBar
          roomId={roomId}
          peers={awareness.peers}
          onOpenImageGen={openImageGen}
          onClearBoard={clearBoard}
          onFitView={fitView}
          onExportImage={exportImage}
          onOpenTemplates={() => setTemplatesOpen(true)}
          onToggleActivity={() => setActivityOpen((v) => !v)}
          onLockAll={lockAll}
          onUnlockAll={unlockAll}
          onDistribute={distributeNodes}
          onAlign={alignNodes}
          onGroupSelected={groupSelected}
          onUngroupSelected={ungroupSelected}
        />
      )}
      <div className="relative flex-1 min-h-0">
        {!presentationMode && (
          <Toolbar undoManager={undoManager} onAddImage={openImageGen} />
        )}
        <Canvas doc={doc} provider={provider} undoManager={undoManager} />
        {!presentationMode && <CursorOverlay peers={awareness.peers} />}
        {!presentationMode && <PropertiesPanel doc={doc} />}
        {!presentationMode && <EdgePropertiesPanel doc={doc} />}
        {!presentationMode && (
          <ActivityPanel
            open={activityOpen}
            onOpenChange={setActivityOpen}
            doc={doc}
            peers={awareness.peers}
          />
        )}
        <ArchitecturePanel />
        <SchemaPanel />
        <PerformancePanel />
        <ShortcutsOverlay />
        {!presentationMode && (
          <NodeContextMenu
            onDuplicate={duplicateNode}
            onDelete={deleteNode}
            onBringToFront={bringToFront}
            onSendToBack={sendToBack}
            onChangeColor={changeNodeColor}
            onEdit={editNode}
          />
        )}
        {/* Presentation mode exit hint */}
        {presentationMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur text-white text-xs font-medium shadow-lg flex items-center gap-2 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Presentation mode — press P or Esc to exit
          </div>
        )}
      </div>
      <ImageGeneratorDialog
        open={imageGenOpen}
        onOpenChange={setImageGenOpen}
        onCreate={addImageNode}
        position={{ x: 0, y: 0 }}
      />
      <TemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        doc={doc}
      />
      <SearchPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        doc={doc}
        onJumpToNode={jumpToNode}
      />
    </div>
  )
}
