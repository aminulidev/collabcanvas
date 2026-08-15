'use client'

/**
 * TopBar
 * ------------------------------------------------------------------
 * Persistent header above the canvas. Hosts branding, room identity,
 * presence, and the architecture / docs actions.
 */
import { memo } from 'react'
import {
  Boxes,
  Share2,
  Sparkles,
  PanelLeft,
  PanelLeftClose,
  Copy,
  Check,
  MoreVertical,
  Trash2,
  Maximize2,
  Keyboard,
  Download,
  LayoutTemplate,
  Activity,
  Presentation,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyStart,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Group as GroupIcon,
  Ungroup as UngroupIcon,
  FileCode,
  Gauge,
} from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '@/store/ui-store'
import { PresenceBar } from '@/components/collaboration/presence-bar'
import { ThemeToggle } from '@/components/board/theme-toggle'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import type { Peer } from '@/types/canvas'

interface TopBarProps {
  roomId: string
  peers: Peer[]
  onOpenImageGen: () => void
  onClearBoard: () => void
  onFitView: () => void
  onExportImage: () => void
  onOpenTemplates: () => void
  onToggleActivity: () => void
  onLockAll: () => void
  onUnlockAll: () => void
  onDistribute: (direction: 'horizontal' | 'vertical') => void
  onAlign: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void
  onGroupSelected: () => void
  onUngroupSelected: () => void
}

function TopBarImpl({ roomId, peers, onOpenImageGen, onClearBoard, onFitView, onExportImage, onOpenTemplates, onToggleActivity, onLockAll, onUnlockAll, onDistribute, onAlign, onGroupSelected, onUngroupSelected }: TopBarProps) {
  const setPanel = useUIStore((s) => s.setPanel)
  const openPanel = useUIStore((s) => s.openPanel)
  const [copied, setCopied] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)

  const shareLink = typeof window !== 'undefined' ? window.location.href : ''

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      toast.success('Share link copied — send it to a teammate!')
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <header className="flex items-center justify-between gap-3 px-3 sm:px-4 h-14 border-b bg-card/80 backdrop-blur-md z-20 shrink-0">
      {/* Brand + room */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 via-amber-500 to-emerald-500 flex items-center justify-center shadow-sm">
            <Boxes className="w-4.5 h-4.5 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-card" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-semibold text-sm">CollabCanvas</span>
            <span className="text-[10px] text-muted-foreground">
              Real-time infinite whiteboard
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 pl-3 border-l">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Room
          </span>
          <Badge variant="outline" className="font-mono text-[11px] gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {roomId.slice(0, 12)}
          </Badge>
        </div>
      </div>

      {/* Center: templates + AI quick action (desktop) */}
      <div className="hidden lg:flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenTemplates}
          className="gap-1.5"
        >
          <LayoutTemplate className="w-3.5 h-3.5 text-violet-500" />
          <span>Templates</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenImageGen}
          className="gap-1.5 bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-amber-950/40 border-rose-200 dark:border-rose-900 hover:from-rose-100 hover:to-amber-100"
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          <span>AI image</span>
        </Button>
      </div>

      {/* Right: presence + actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <PresenceBar peers={peers} />

        <div className="hidden sm:flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={copyLink}
            className="gap-1.5"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">
              {copied ? 'Copied' : 'Share'}
            </span>
          </Button>
        </div>

        <Button
          variant={openPanel === 'architecture' ? 'default' : 'outline'}
          size="sm"
          onClick={() =>
            setPanel(openPanel === 'architecture' ? null : 'architecture')
          }
          className="gap-1.5"
        >
          {openPanel === 'architecture' ? (
            <PanelLeftClose className="w-3.5 h-3.5" />
          ) : (
            <PanelLeft className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Architecture</span>
        </Button>

        {/* Schema / Types reference */}
        <Button
          variant={openPanel === 'schema' ? 'default' : 'outline'}
          size="sm"
          onClick={() =>
            setPanel(openPanel === 'schema' ? null : 'schema')
          }
          className="gap-1.5"
          title="Data models & Yjs schema reference"
        >
          <FileCode className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Schema</span>
        </Button>

        {/* Performance guide */}
        <Button
          variant={openPanel === 'performance' ? 'default' : 'outline'}
          size="sm"
          onClick={() =>
            setPanel(openPanel === 'performance' ? null : 'performance')
          }
          className="gap-1.5"
          title="60 FPS performance optimization guide"
        >
          <Gauge className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Perf</span>
        </Button>

        {/* Dark mode toggle */}
        <ThemeToggle />

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onFitView} className="gap-2 cursor-pointer">
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fit view</span>
              <kbd className="ml-auto text-[10px] font-mono text-muted-foreground">F</kbd>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const s = useUIStore.getState()
                s.setPanel(s.openPanel === 'shortcuts' ? null : 'shortcuts')
              }}
              className="gap-2 cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Shortcuts</span>
              <kbd className="ml-auto text-[10px] font-mono text-muted-foreground">?</kbd>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleActivity} className="gap-2 cursor-pointer">
              <Activity className="w-3.5 h-3.5" />
              <span>Activity stats</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => useUIStore.getState().togglePresentation()}
              className="gap-2 cursor-pointer"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Presentation mode</span>
              <kbd className="ml-auto text-[10px] font-mono text-muted-foreground">P</kbd>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportImage} className="gap-2 cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              <span>Export PNG</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLockAll} className="gap-2 cursor-pointer">
              <LockIcon className="w-3.5 h-3.5" />
              <span>Lock all nodes</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onUnlockAll} className="gap-2 cursor-pointer">
              <UnlockIcon className="w-3.5 h-3.5" />
              <span>Unlock all nodes</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDistribute('horizontal')}
              className="gap-2 cursor-pointer"
            >
              <AlignHorizontalJustifyStart className="w-3.5 h-3.5" />
              <span>Distribute horizontal</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDistribute('vertical')}
              className="gap-2 cursor-pointer"
            >
              <AlignVerticalJustifyStart className="w-3.5 h-3.5" />
              <span>Distribute vertical</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Align submenu */}
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Align selected
            </div>
            <div className="grid grid-cols-3 gap-1 px-1 pb-1">
              {([
                { id: 'left', label: '⊣', icon: AlignStartVertical },
                { id: 'center', label: '⊥', icon: AlignCenterVertical },
                { id: 'right', label: '⊢', icon: AlignEndVertical },
                { id: 'top', label: '⊤', icon: AlignStartHorizontal },
                { id: 'middle', label: '⊣', icon: AlignCenterHorizontal },
                { id: 'bottom', label: '⊥', icon: AlignEndHorizontal },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onAlign(opt.id)}
                  className="flex flex-col items-center gap-0.5 py-1.5 rounded-md hover:bg-accent transition-colors text-[10px] font-medium"
                  title={`Align ${opt.id}`}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                  {opt.id}
                </button>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onGroupSelected}
              className="gap-2 cursor-pointer"
            >
              <GroupIcon className="w-3.5 h-3.5" />
              <span>Group selected</span>
              <kbd className="ml-auto text-[10px] font-mono text-muted-foreground">⌘G</kbd>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onUngroupSelected}
              className="gap-2 cursor-pointer"
            >
              <UngroupIcon className="w-3.5 h-3.5" />
              <span>Ungroup selected</span>
              <kbd className="ml-auto text-[10px] font-mono text-muted-foreground">⇧⌘G</kbd>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setClearConfirm(true)}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear board</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Clear board confirmation */}
      <AlertDialog open={clearConfirm} onOpenChange={setClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove every node and edge from the board. This action
              affects all collaborators and can be undone with ⌘Z.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onClearBoard()
                setClearConfirm(false)
                toast.success('Board cleared')
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}

export const TopBar = memo(TopBarImpl)

// Re-export motion for tree-shaking clarity in bundled chunks.
void motion
