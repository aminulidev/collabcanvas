'use client'

/**
 * TemplatesDialog
 * ------------------------------------------------------------------
 * A modal that lets the user pick a pre-built board layout (flowchart,
 * mind map, retro, kanban) and insert it into the current room. The
 * template's nodes + edges are written to the Yjs maps in a single
 * transaction so undo reverts the whole insertion at once.
 */
import { motion } from 'framer-motion'
import { LayoutTemplate, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { TEMPLATES } from '@/lib/canvas/templates'
import { toast } from 'sonner'
import * as Y from 'yjs'
import { getNodesMap, getEdgesMap, canvasNodeToYMap, canvasEdgeToYMap } from '@/lib/yjs/schema'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  doc: Y.Doc | null
}

export function TemplatesDialog({ open, onOpenChange, doc }: Props) {
  const insertTemplate = (templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId)
    if (!tpl || !doc) return
    const { nodes, edges } = tpl.create()
    const nodesMap = getNodesMap(doc)
    const edgesMap = getEdgesMap(doc)
    doc.transact(() => {
      for (const node of nodes) {
        nodesMap.set(node.id, canvasNodeToYMap(node))
      }
      for (const edge of edges) {
        edgesMap.set(edge.id, canvasEdgeToYMap(edge))
      }
    }, doc.clientID)
    onOpenChange(false)
    toast.success(`${tpl.name} template added`, {
      description: `${nodes.length} nodes and ${edges.length} edges inserted. Press ⌘Z to undo.`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-primary" />
            Board Templates
          </DialogTitle>
          <DialogDescription>
            Insert a pre-built layout into your board. You can drag, edit, and
            customise everything after insertion.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          {TEMPLATES.map((tpl, i) => (
            <motion.button
              key={tpl.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => insertTemplate(tpl.id)}
              className="group text-left p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl shrink-0">
                  {tpl.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    {tpl.name}
                    <Plus className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="w-3.5 h-3.5 mr-1.5" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
