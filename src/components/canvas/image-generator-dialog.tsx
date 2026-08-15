'use client'

/**
 * ImageGeneratorDialog
 * ------------------------------------------------------------------
 * Modal that asks for a prompt, calls /api/generate-image, and creates
 * an image node on the canvas at the viewport centre with the result.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createNode } from '@/lib/canvas/utils'
import type { CanvasNode } from '@/types/canvas'

const SUGGESTIONS = [
  'A serene mountain lake at sunrise, watercolor',
  'Minimalist geometric logo, emerald and slate',
  'Isometric illustration of a tiny cosy house',
  'Abstract data flow, gradient particles',
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (node: CanvasNode) => void
  /** Canvas-space position to drop the new node. */
  position: { x: number; y: number }
}

export function ImageGeneratorDialog({
  open,
  onOpenChange,
  onCreate,
  position,
}: Props) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)

  const generate = async (override?: string) => {
    const p = (override ?? prompt).trim()
    if (!p || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Request failed (${res.status})`)
      }
      const data = (await res.json()) as { imageUrl: string }
      const node = createNode('image', position, {
        imageUrl: data.imageUrl,
        label: p.slice(0, 40),
        width: 240,
        height: 240,
      })
      onCreate(node)
      onOpenChange(false)
      setPrompt('')
      toast.success('Image added to canvas')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Generate image
          </DialogTitle>
          <DialogDescription>
            Describe an image and we&apos;ll drop it onto the canvas.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            generate()
          }}
          className="space-y-3"
        >
          <div className="relative">
            <Input
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A watercolour of mount fuji at dawn…"
              disabled={loading}
              className="pr-8"
            />
            {prompt && !loading && (
              <button
                type="button"
                onClick={() => setPrompt('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => generate(s)}
                disabled={loading}
                className="text-[11px] px-2 py-1 rounded-full border bg-muted/40 hover:bg-muted transition-colors text-muted-foreground"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !prompt.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </form>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs text-muted-foreground pt-1"
          >
            This usually takes 5–15 seconds…
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  )
}
