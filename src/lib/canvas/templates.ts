'use client'

/**
 * Templates
 * ------------------------------------------------------------------
 * Pre-built board layouts that can be inserted into the current room.
 * Each template returns a set of nodes + edges positioned around the
 * origin, so they drop in at the viewport centre.
 */
import { nanoid } from 'nanoid'
import { createNode, createEdge } from '@/lib/canvas/utils'
import type { CanvasNode, CanvasEdge } from '@/types/canvas'
import { NODE_PALETTE } from '@/types/canvas'

export interface BoardTemplate {
  id: string
  name: string
  description: string
  icon: string
  create: () => { nodes: CanvasNode[]; edges: CanvasEdge[] }
}

// Helper to pick a palette entry by index.
const p = (i: number) => NODE_PALETTE[i % NODE_PALETTE.length]

export const TEMPLATES: BoardTemplate[] = [
  {
    id: 'flowchart',
    name: 'Flowchart',
    description: 'A classic decision flowchart with 5 connected steps',
    icon: '🔀',
    create: () => {
      const start = createNode('ellipse', { x: 0, y: 0 }, {
        label: 'Start',
        color: p(2).bg, stroke: p(2).stroke,
      })
      const input = createNode('rectangle', { x: 0, y: 140 }, {
        label: 'Get input',
        color: p(0).bg, stroke: p(0).stroke,
      })
      const decide = createNode('diamond', { x: -20, y: 290 }, {
        label: 'Valid?',
        color: p(4).bg, stroke: p(4).stroke,
        width: 180, height: 140,
      })
      const yes = createNode('rectangle', { x: -220, y: 460 }, {
        label: 'Process',
        color: p(2).bg, stroke: p(2).stroke,
      })
      const no = createNode('rectangle', { x: 160, y: 460 }, {
        label: 'Error',
        color: p(1).bg, stroke: p(1).stroke,
      })
      const end = createNode('ellipse', { x: 0, y: 620 }, {
        label: 'Done',
        color: p(2).bg, stroke: p(2).stroke,
      })
      const edges = [
        createEdge(start.id, input.id),
        createEdge(input.id, decide.id),
        createEdge(decide.id, yes.id, { label: 'Yes', color: p(2).stroke }),
        createEdge(decide.id, no.id, { label: 'No', color: p(1).stroke }),
        createEdge(yes.id, end.id),
        createEdge(no.id, input.id, { animated: true, color: p(1).stroke }),
      ]
      return { nodes: [start, input, decide, yes, no, end], edges }
    },
  },
  {
    id: 'mindmap',
    name: 'Mind Map',
    description: 'A radial mind map with a central topic and 5 branches',
    icon: '🧠',
    create: () => {
      const center = createNode('ellipse', { x: 0, y: 0 }, {
        label: 'Central Topic',
        color: p(4).bg, stroke: p(4).stroke,
        width: 200, height: 100,
        fontSize: 16,
      })
      const branches = [
        { label: 'Ideas', angle: -Math.PI / 2, color: 0 },
        { label: 'Questions', angle: -Math.PI / 5, color: 1 },
        { label: 'Resources', angle: Math.PI / 5, color: 2 },
        { label: 'Next Steps', angle: Math.PI / 2, color: 3 },
        { label: 'Notes', angle: (4 * Math.PI) / 5, color: 4 },
        { label: 'Actions', angle: -(4 * Math.PI) / 5, color: 5 },
      ]
      const nodes: CanvasNode[] = [center]
      const edges: CanvasEdge[] = []
      branches.forEach((b) => {
        const x = Math.cos(b.angle) * 260
        const y = Math.sin(b.angle) * 200
        const node = createNode('sticky', { x: x - 80, y: y - 40 }, {
          text: b.label,
          label: b.label,
          color: p(b.color).bg,
          stroke: p(b.color).stroke,
          width: 160, height: 80,
        })
        nodes.push(node)
        edges.push(createEdge(center.id, node.id, { color: p(b.color).stroke }))
      })
      return { nodes, edges }
    },
  },
  {
    id: 'retro',
    name: 'Sprint Retro',
    description: 'A 3-column retrospective board: Went Well, Didn\'t Go Well, Actions',
    icon: '📋',
    create: () => {
      const colW = 260, gap = 40, startY = -200
      const cols = [
        { title: 'Went Well ✅', color: 2, x: -(colW + gap) },
        { title: "Didn't Go Well ⚠️", color: 1, x: 0 },
        { title: 'Action Items 🎯', color: 4, x: colW + gap },
      ]
      const nodes: CanvasNode[] = []
      const edges: CanvasEdge[] = []
      cols.forEach((col) => {
        const header = createNode('text', { x: col.x - 10, y: startY }, {
          text: col.title,
          label: col.title,
          stroke: p(col.color).stroke,
          fontSize: 18, width: 220, height: 32,
        })
        nodes.push(header)
        // Add 2 example sticky notes per column
        for (let i = 0; i < 2; i++) {
          const note = createNode('sticky', { x: col.x - 10, y: startY + 50 + i * 160 }, {
            text: '',
            label: '',
            color: p(col.color).bg,
            stroke: p(col.color).stroke,
            width: 220, height: 140,
          })
          nodes.push(note)
        }
      })
      return { nodes, edges }
    },
  },
  {
    id: 'kanban',
    name: 'Kanban Board',
    description: 'A 4-column task board: Backlog, To Do, In Progress, Done',
    icon: '📊',
    create: () => {
      const colW = 200, gap = 30, startY = -180
      const cols = [
        { title: 'Backlog', color: 5, x: -(colW * 1.5 + gap * 1.5) },
        { title: 'To Do', color: 0, x: -(colW * 0.5 + gap * 0.5) },
        { title: 'In Progress', color: 4, x: colW * 0.5 + gap * 0.5 },
        { title: 'Done', color: 2, x: colW * 1.5 + gap * 1.5 },
      ]
      const nodes: CanvasNode[] = []
      cols.forEach((col) => {
        const header = createNode('rectangle', { x: col.x - colW / 2, y: startY }, {
          label: col.title,
          color: p(col.color).bg,
          stroke: p(col.color).stroke,
          width: colW, height: 50,
          fontSize: 14,
        })
        nodes.push(header)
      })
      return { nodes, edges: [] }
    },
  },
  {
    id: 'wireframe',
    name: 'App Wireframe',
    description: 'A mobile app wireframe with header, content, and nav bar',
    icon: '📱',
    create: () => {
      const phoneW = 200, phoneH = 380
      const x = -phoneW / 2, y = -phoneH / 2
      const nodes: CanvasNode[] = []
      const edges: CanvasEdge[] = []

      // Phone frame
      const frame = createNode('rectangle', { x, y }, {
        label: '',
        color: '#F8FAFC', stroke: '#64748B',
        width: phoneW, height: phoneH, radius: 24,
      })
      nodes.push(frame)

      // Header bar
      const header = createNode('rectangle', { x: x + 10, y: y + 10 }, {
        label: 'Header',
        color: '#E0F2FE', stroke: '#0EA5E9',
        width: phoneW - 20, height: 40, radius: 8,
        fontSize: 11,
      })
      nodes.push(header)

      // Content area
      const content = createNode('rectangle', { x: x + 10, y: y + 60 }, {
        label: 'Content',
        color: '#FEF3C7', stroke: '#F59E0B',
        width: phoneW - 20, height: 200, radius: 8,
        fontSize: 11,
      })
      nodes.push(content)

      // Two buttons
      const btn1 = createNode('rectangle', { x: x + 10, y: y + 270 }, {
        label: 'Action',
        color: '#D1FAE5', stroke: '#10B981',
        width: (phoneW - 30) / 2, height: 40, radius: 8,
        fontSize: 11,
      })
      const btn2 = createNode('rectangle', { x: x + 20 + (phoneW - 30) / 2, y: y + 270 }, {
        label: 'Cancel',
        color: '#FFE4E6', stroke: '#F43F5E',
        width: (phoneW - 30) / 2, height: 40, radius: 8,
        fontSize: 11,
      })
      nodes.push(btn1, btn2)

      // Nav bar
      const nav = createNode('rectangle', { x: x + 10, y: y + phoneH - 50 }, {
        label: 'Nav',
        color: '#EDE9FE', stroke: '#8B5CF6',
        width: phoneW - 20, height: 40, radius: 8,
        fontSize: 11,
      })
      nodes.push(nav)

      return { nodes, edges }
    },
  },
  {
    id: 'orgchart',
    name: 'Org Chart',
    description: 'A 3-level organizational chart with CEO, managers, and reports',
    icon: '🏢',
    create: () => {
      const nodes: CanvasNode[] = []
      const edges: CanvasEdge[] = []

      const ceo = createNode('ellipse', { x: -60, y: -200 }, {
        label: 'CEO',
        color: p(4).bg, stroke: p(4).stroke,
        width: 120, height: 60, fontSize: 14,
      })
      nodes.push(ceo)

      const managers = [
        { label: 'Engineering', x: -280, color: 0 },
        { label: 'Design', x: -80, color: 1 },
        { label: 'Product', x: 120, color: 2 },
      ]
      managers.forEach((m) => {
        const node = createNode('rectangle', { x: m.x, y: -60 }, {
          label: m.label,
          color: p(m.color).bg, stroke: p(m.color).stroke,
          width: 140, height: 50, fontSize: 12,
        })
        nodes.push(node)
        edges.push(createEdge(ceo.id, node.id, { color: p(m.color).stroke, kind: 'smoothstep' }))
      })

      // Reports
      const reports = [
        { label: 'Frontend', x: -340, color: 0 },
        { label: 'Backend', x: -220, color: 0 },
        { label: 'UI Design', x: -120, color: 1 },
        { label: 'UX Research', x: 20, color: 2 },
        { label: 'PM', x: 140, color: 2 },
      ]
      reports.forEach((r) => {
        const node = createNode('rectangle', { x: r.x, y: 80 }, {
          label: r.label,
          color: p(r.color).bg, stroke: p(r.color).stroke,
          width: 100, height: 40, fontSize: 11,
        })
        nodes.push(node)
        // Connect to the nearest manager
        const managerIdx = r.x < -160 ? 0 : r.x < 40 ? 1 : 2
        const managerNode = nodes[1 + managerIdx]
        edges.push(createEdge(managerNode.id, node.id, { color: p(r.color).stroke, kind: 'smoothstep' }))
      })

      return { nodes, edges }
    },
  },
  {
    id: 'uml',
    name: 'UML Class',
    description: 'A UML class diagram with 3 connected classes',
    icon: '📐',
    create: () => {
      const nodes: CanvasNode[] = []
      const edges: CanvasEdge[] = []

      const classes = [
        {
          name: 'User',
          attrs: '- id: string\n- name: string\n- email: string',
          methods: '+ login()\n+ logout()',
          x: -300, y: -120, color: 3,
        },
        {
          name: 'Order',
          attrs: '- id: string\n- total: number\n- status: enum',
          methods: '+ submit()\n+ cancel()',
          x: 0, y: -120, color: 0,
        },
        {
          name: 'Product',
          attrs: '- id: string\n- name: string\n- price: number',
          methods: '+ getStock()',
          x: 300, y: -120, color: 2,
        },
      ]

      classes.forEach((c) => {
        const node = createNode('sticky', { x: c.x, y: c.y }, {
          text: `${c.name}\n${'─'.repeat(12)}\n${c.attrs}\n${'─'.repeat(12)}\n${c.methods}`,
          label: c.name,
          color: p(c.color).bg, stroke: p(c.color).stroke,
          width: 180, height: 180, fontSize: 10,
        })
        nodes.push(node)
      })

      // UML relationships
      edges.push(createEdge(nodes[0].id, nodes[1].id, {
        label: 'places', color: '#64748B', kind: 'straight', markerEnd: 'arrow',
      }))
      edges.push(createEdge(nodes[1].id, nodes[2].id, {
        label: 'contains', color: '#64748B', kind: 'straight', markerEnd: 'arrow',
      }))

      return { nodes, edges }
    },
  },
]
