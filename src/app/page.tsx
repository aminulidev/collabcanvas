'use client'

import { useState } from 'react'
import { LandingHero } from '@/components/board/landing-hero'
import { Board } from '@/components/board/board'
import { nanoid } from 'nanoid'

/**
 * Single visible route: `/`.
 *
 * Shows the portfolio landing hero first; the primary CTA hands off to
 * the full-screen collaborative Board. The room id is resolved lazily
 * on launch (client-only) and persisted to localStorage so a second tab
 * lands in the same room — frictionless multiplayer testing.
 */
function resolveRoomId(): string {
  const KEY = 'canvas-room-id'
  let id = window.localStorage.getItem(KEY)
  if (!id) {
    id = `board-${nanoid(10)}`
    window.localStorage.setItem(KEY, id)
  }
  const params = new URLSearchParams(window.location.search)
  const override = params.get('room')
  if (override) {
    id = override
    window.localStorage.setItem(KEY, id)
  }
  return id
}

export default function Home() {
  const [view, setView] = useState<'landing' | 'board'>('landing')
  const [roomId, setRoomId] = useState<string>('')

  const launch = () => {
    setRoomId(resolveRoomId())
    setView('board')
  }

  if (view === 'landing' || !roomId) {
    return <LandingHero onLaunch={launch} />
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <Board roomId={roomId} />
    </div>
  )
}
