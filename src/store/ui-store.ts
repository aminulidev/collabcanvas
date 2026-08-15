/**
 * Local (transient) UI state.
 * ------------------------------------------------------------------
 * Everything here is *per-client, per-session, ephemeral*. It is
 * intentionally NOT replicated through Yjs because it changes far too
 * frequently (mouse moves, viewport pan) and has no meaning for other
 * peers — except the small presence slice we forward through awareness
 * (see `useAwareness`).
 *
 * Keeping this in Zustand (rather than React state) lets deep canvas
 * children subscribe to just the slices they need without prop drilling
 * or context re-renders.
 */
import { create } from 'zustand'

export type PanelKind = 'architecture' | 'shortcuts' | 'properties' | 'schema' | 'performance' | null

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  /** Set when the provider reports a sync has completed. */
  synced: boolean
  latencyMs: number | null
}

export interface UIState {
  // --- tool & interaction ------------------------------------------------
  activeTool: 'select' | 'pan' | 'sticky' | 'text' | 'rectangle' | 'ellipse' | 'diamond' | 'image' | 'comment' | 'group' | 'edge'
  isPanning: boolean
  isSpaceDown: boolean
  /** Node currently being double-click edited. */
  editingNodeId: string | null
  /** Pending connection source for the edge tool. */
  pendingConnection: { sourceId: string; sourceHandle: string | null } | null

  // --- transient selection (local mirror, never synced directly) ----------
  selectedNodeIds: string[]
  selectedEdgeIds: string[]

  // --- viewport ----------------------------------------------------------
  /** Last reported viewport from React Flow, used by the cursor overlay. */
  viewport: { x: number; y: number; zoom: number }

  // --- panels & modals ---------------------------------------------------
  openPanel: PanelKind
  showMinimap: boolean
  showGrid: boolean
  showCursors: boolean
  sidebarCollapsed: boolean
  /** Presentation mode hides all UI chrome for full-screen canvas. */
  presentationMode: boolean

  // --- networking --------------------------------------------------------
  connection: ConnectionState

  // --- actions -----------------------------------------------------------
  setTool: (tool: UIState['activeTool']) => void
  setPanning: (v: boolean) => void
  setSpaceDown: (v: boolean) => void
  setEditingNode: (id: string | null) => void
  setPendingConnection: (c: UIState['pendingConnection']) => void
  setSelectedNodes: (ids: string[]) => void
  setSelectedEdges: (ids: string[]) => void
  setViewport: (v: { x: number; y: number; zoom: number }) => void
  setPanel: (p: PanelKind) => void
  toggleMinimap: () => void
  toggleGrid: () => void
  toggleCursors: () => void
  toggleSidebar: () => void
  togglePresentation: () => void
  setConnection: (c: Partial<ConnectionState>) => void
}

export const useUIStore = create<UIState>((set) => ({
  activeTool: 'select',
  isPanning: false,
  isSpaceDown: false,
  editingNodeId: null,
  pendingConnection: null,

  selectedNodeIds: [],
  selectedEdgeIds: [],

  viewport: { x: 0, y: 0, zoom: 1 },

  openPanel: null,
  showMinimap: true,
  showGrid: true,
  showCursors: true,
  sidebarCollapsed: false,
  presentationMode: false,

  connection: { status: 'connecting', synced: false, latencyMs: null },

  setTool: (tool) =>
    set((s) => ({
      activeTool: tool,
      // Clear transient edit/connection state when switching tools.
      editingNodeId: tool === 'select' ? s.editingNodeId : null,
      pendingConnection: null,
    })),
  setPanning: (isPanning) => set({ isPanning }),
  setSpaceDown: (isSpaceDown) => set({ isSpaceDown }),
  setEditingNode: (editingNodeId) => set({ editingNodeId }),
  setPendingConnection: (pendingConnection) => set({ pendingConnection }),
  setSelectedNodes: (selectedNodeIds) => set({ selectedNodeIds }),
  setSelectedEdges: (selectedEdgeIds) => set({ selectedEdgeIds }),
  setViewport: (viewport) => set({ viewport }),
  setPanel: (openPanel) => set({ openPanel }),
  toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleCursors: () => set((s) => ({ showCursors: !s.showCursors })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  togglePresentation: () => set((s) => ({ presentationMode: !s.presentationMode })),
  setConnection: (c) => set((s) => ({ connection: { ...s.connection, ...c } })),
}))
