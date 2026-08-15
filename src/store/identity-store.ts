/**
 * Local identity store.
 * ------------------------------------------------------------------
 * Holds the current user's stable identity (name, colour, avatar) so
 * every component can read it without prop drilling. The identity is
 * generated once per browser (persisted in localStorage) and then
 * pushed into Yjs awareness by the `useAwareness` hook.
 */
import { create } from 'zustand'
import { PEER_AVATARS, PEER_COLORS } from '@/types/canvas'

const STORAGE_KEY = 'canvas-identity'

interface IdentityState {
  id: string
  name: string
  color: string
  avatar: string
  hydrated: boolean
  setName: (name: string) => void
  setAvatar: (avatar: string) => void
  hydrate: () => void
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateIdentity() {
  const adjectives = ['Swift', 'Bright', 'Cosmic', 'Lunar', 'Solar', 'Nova', 'Quartz', 'Cobalt']
  const nouns = ['Falcon', 'Otter', 'Lynx', 'Heron', 'Mantis', 'Orca', 'Ibis', 'Puma']
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    name: `${pickRandom(adjectives)} ${pickRandom(nouns)}`,
    color: pickRandom(PEER_COLORS),
    avatar: pickRandom(PEER_AVATARS),
  }
}

function loadIdentity() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as {
      id: string
      name: string
      color: string
      avatar: string
    }
  } catch {
    return null
  }
}

function persistIdentity(state: {
  id: string
  name: string
  color: string
  avatar: string
}) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota errors */
  }
}

export const useIdentityStore = create<IdentityState>((set, get) => ({
  id: '',
  name: '',
  color: '',
  avatar: '',
  hydrated: false,
  setName: (name) => {
    set({ name })
    const { id, color, avatar } = get()
    persistIdentity({ id, name, color, avatar })
  },
  setAvatar: (avatar) => {
    set({ avatar })
    const { id, name, color } = get()
    persistIdentity({ id, name, color, avatar })
  },
  hydrate: () => {
    if (get().hydrated) return
    const stored = loadIdentity()
    const identity = stored ?? generateIdentity()
    if (!stored) persistIdentity(identity)
    set({ ...identity, hydrated: true })
  },
}))
