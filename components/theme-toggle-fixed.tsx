'use client'

import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggleFixed() {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Hide on forced dark pages
  if (pathname === '/gauntlet' || pathname === '/simulator') {
    return null
  }

  // Render a placeholder with the same dimensions until mounted
  // to avoid layout shift, but show no icon until client hydrates
  if (!mounted) {
    return (
      <button
        className="fixed top-4 right-4 md:top-6 md:right-8 z-50 p-3 bg-sidebar-accent/50 backdrop-blur-md border border-sidebar-border rounded-full shadow-lg w-11 h-11"
        aria-label="Toggle Theme"
        disabled
      />
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="fixed top-4 right-4 md:top-6 md:right-8 z-50 p-3 bg-sidebar-accent/50 hover:bg-sidebar-accent backdrop-blur-md text-sidebar-foreground border border-sidebar-border rounded-full shadow-lg transition-all"
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}
