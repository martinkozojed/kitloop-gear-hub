import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { useLocation } from 'react-router-dom'

/**
 * Force light theme on public/marketing pages.
 * Saves user's dashboard theme preference and restores it
 * when navigating back to /provider or /admin routes.
 */
export function useForceTheme() {
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const savedThemeRef = useRef<string | null>(null)

  const isDashboard =
    location.pathname.startsWith('/provider') ||
    location.pathname.startsWith('/admin')

  useEffect(() => {
    if (isDashboard) {
      // Restore saved preference when entering dashboard
      if (savedThemeRef.current && savedThemeRef.current !== theme) {
        setTheme(savedThemeRef.current)
        savedThemeRef.current = null
      }
    } else {
      // Save current preference and force light on public pages
      if (theme && theme !== 'light') {
        savedThemeRef.current = theme
        setTheme('light')
      }
    }
  }, [isDashboard]) // Only react to route changes, not theme changes
}
