'use client'

/**
 * useLerpCursor
 * ------------------------------------------------------------------
 * Smoothly interpolates a remote peer's cursor position using a
 * linear interpolation (lerp) loop driven by requestAnimationFrame.
 *
 * Why lerp instead of CSS transitions?
 *  - CSS transitions restart on every value change, causing stutter
 *    when updates arrive at 30-60fps (awareness throttle).
 *  - Framer Motion springs are good but add GC pressure with many peers.
 *  - A rAF lerp loop gives us 60fps smoothness with O(1) per-peer cost
 *    and no React re-renders — the cursor DOM node is updated directly
 *    via a ref.
 *
 * Usage:
 *   const ref = useLerpCursor(targetX, targetY, 0.15)
 *   return <div ref={ref} />
 */
import { useEffect, useRef } from 'react'

export function useLerpCursor(
  targetX: number,
  targetY: number,
  lerpFactor = 0.15
) {
  const ref = useRef<HTMLDivElement>(null)
  // Current interpolated position (starts at target to avoid a fly-in).
  const currentRef = useRef({ x: targetX, y: targetY })

  useEffect(() => {
    let raf = 0

    const tick = () => {
      const el = ref.current
      if (!el) {
        raf = requestAnimationFrame(tick)
        return
      }

      const curr = currentRef.current
      // Lerp: move 15% of the distance to the target each frame.
      // This creates an ease-out deceleration that feels natural.
      curr.x += (targetX - curr.x) * lerpFactor
      curr.y += (targetY - curr.y) * lerpFactor

      // Apply directly via transform — no React state update needed.
      el.style.transform = `translate3d(${curr.x}px, ${curr.y}px, 0)`

      // Continue the loop if we haven't converged yet.
      const dx = Math.abs(targetX - curr.x)
      const dy = Math.abs(targetY - curr.y)
      if (dx > 0.5 || dy > 0.5) {
        raf = requestAnimationFrame(tick)
      } else {
        // Snap to exact target when close enough.
        curr.x = targetX
        curr.y = targetY
        el.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [targetX, targetY, lerpFactor])

  return ref
}
