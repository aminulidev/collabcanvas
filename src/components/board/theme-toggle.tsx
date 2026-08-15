'use client'

/**
 * ThemeToggle
 * ------------------------------------------------------------------
 * A button that toggles between light and dark themes using next-themes.
 * Shows a sun icon in light mode and a moon icon in dark mode.
 */
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — only render the icon after mount.
  // Use useSyncExternalStore-like pattern: defer the state update
  // to a microtask so it doesn't trigger a cascading render warning.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="h-8 w-8">
        <Sun className="w-3.5 h-3.5" />
      </Button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <Button
      variant="outline"
      size="icon"
      className="h-8 w-8 relative overflow-hidden"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun
        className={`w-3.5 h-3.5 transition-all duration-300 ${
          isDark ? 'opacity-0 -rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
        } absolute`}
      />
      <Moon
        className={`w-3.5 h-3.5 transition-all duration-300 ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-0'
        } absolute`}
      />
    </Button>
  )
}
