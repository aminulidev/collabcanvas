'use client'

/**
 * PresenceBar
 * ------------------------------------------------------------------
 * Horizontal stack of online-user avatars with a tooltip showing the
 * peer name and a tiny "live" indicator. Also surfaces the local user
 * so they can rename themselves.
 */
import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Pencil, Wifi, WifiOff, Check } from 'lucide-react'
import type { Peer } from '@/types/canvas'
import { useIdentityStore } from '@/store/identity-store'
import { useUIStore } from '@/store/ui-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PresenceBarProps {
  peers: Peer[]
}

function PresenceBarImpl({ peers }: PresenceBarProps) {
  const identity = useIdentityStore()
  const connection = useUIStore((s) => s.connection)
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(identity.name)

  const saveName = () => {
    const trimmed = draftName.trim()
    if (trimmed) identity.setName(trimmed)
    setEditingName(false)
  }

  const allUsers = [
    {
      id: 'me',
      name: identity.name + ' (you)',
      color: identity.color,
      avatar: identity.avatar,
      isLocal: true,
    },
    ...peers.map((p) => ({
      id: String(p.clientId),
      name: p.name,
      color: p.color,
      avatar: p.avatar,
      isLocal: false,
    })),
  ]

  const statusColor =
    connection.status === 'connected'
      ? 'bg-emerald-500'
      : connection.status === 'connecting'
        ? 'bg-amber-500'
        : 'bg-rose-500'
  const statusLabel =
    connection.status === 'connected'
      ? `Live${connection.latencyMs != null ? ` · ${connection.latencyMs}ms` : ''}`
      : connection.status === 'connecting'
        ? 'Connecting…'
        : 'Offline'

  return (
    <div className="flex items-center gap-2">
      {/* Connection status pill */}
      <div
        className={cn(
          'hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border bg-card/80 backdrop-blur',
          connection.status === 'connected'
            ? 'text-emerald-600 border-emerald-200'
            : connection.status === 'connecting'
              ? 'text-amber-600 border-amber-200'
              : 'text-rose-600 border-rose-200'
        )}
        title={statusLabel}
      >
        {connection.status === 'connected' ? (
          <Wifi className="w-3 h-3" />
        ) : (
          <WifiOff className="w-3 h-3" />
        )}
        <span className="hidden md:inline">{statusLabel}</span>
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
              statusColor
            )}
          />
          <span
            className={cn('relative inline-flex rounded-full h-1.5 w-1.5', statusColor)}
          />
        </span>
      </div>

      {/* Avatar stack */}
      <div className="flex items-center -space-x-2">
        <AnimatePresence>
          {allUsers.map((u) => (
            <motion.div
              key={u.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="relative group"
            >
              <button
                onClick={() => {
                  if (u.isLocal) return
                  // Toggle follow mode for this peer.
                  window.dispatchEvent(
                    new CustomEvent('collabcanvas:follow-peer', {
                      detail: Number(u.id),
                    })
                  )
                  toast.success(`Following ${u.name}'s viewport`, {
                    description: 'Move your canvas to stop following.',
                  })
                }}
                className={cn(
                  'w-8 h-8 rounded-full ring-2 ring-white dark:ring-zinc-900 flex items-center justify-center text-sm shadow-sm transition-transform',
                  u.isLocal
                    ? 'cursor-default'
                    : 'cursor-pointer hover:scale-110 hover:z-10'
                )}
                style={{ background: u.color }}
                title={u.isLocal ? u.name : `Click to follow ${u.name}`}
              >
                <span>{u.avatar ?? u.name.slice(0, 1).toUpperCase()}</span>
              </button>
              {/* Tooltip */}
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20"
                style={{ background: u.color }}
              >
                {u.name}
                {!u.isLocal && ' · click to follow'}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Count + rename */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="w-3.5 h-3.5" />
        <span className="tabular-nums">{allUsers.length}</span>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Edit your identity"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Your display name
            </label>
            {editingName ? (
              <div className="flex gap-1">
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveName()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                  autoFocus
                  className="h-8 text-sm"
                />
                <Button size="icon" className="h-8 w-8" onClick={saveName}>
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setDraftName(identity.name)
                  setEditingName(true)
                }}
                className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent text-sm font-medium"
              >
                {identity.name}
              </button>
            )}
            <div className="pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                Avatar
              </div>
              <div className="flex flex-wrap gap-1">
                {['🦊', '🐼', '🦉', '🐱', '🐸', '🦄', '🐙', '🦖'].map((a) => (
                  <button
                    key={a}
                    onClick={() => identity.setAvatar(a)}
                    className={cn(
                      'w-7 h-7 rounded-md flex items-center justify-center text-base hover:bg-accent transition-colors',
                      identity.avatar === a && 'bg-accent ring-1 ring-ring'
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export const PresenceBar = memo(PresenceBarImpl)
