'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, BookOpen, AlertCircle, BarChart3, Home, Volume2, Globe, Settings, Gamepad2, Terminal, User, ChevronDown, ChevronUp, Swords, Moon, Sun, Download } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useUser } from '@/components/user-context'

interface SidebarProps {
  onLanguageChange?: (lang: string) => void
  currentLanguage?: string
  onAccessibilityClick?: () => void
}

export function Sidebar({ onLanguageChange, currentLanguage = 'en', onAccessibilityClick }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isPracticeOpen, setIsPracticeOpen] = useState(false)
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false)
  const { points, userRank, avatarColor } = useUser()
  const { theme, setTheme } = useTheme()

  // Auto-reveal Practice & Tools menu when navigating directly into it
  useEffect(() => {
    if (pathname === '/gauntlet' || pathname === '/simulator') {
      setIsPracticeOpen(true)
    }
  }, [pathname])

  const navItems = [
    { href: '/', icon: Home, label: 'Home', id: 'home' },
    { href: '/scanner', icon: Shield, label: 'Scam Scanner', id: 'scanner' },
    { href: '/learn', icon: BookOpen, label: 'Learn', id: 'learn' },
    { 
      id: 'practice', 
      icon: Swords, 
      label: 'Practice & Tools', 
      subItems: [
        { href: '/gauntlet', icon: Gamepad2, label: 'Phishing Gauntlet', id: 'gauntlet' },
        { href: '/simulator', icon: Terminal, label: 'Threat Simulator', id: 'simulator' },
      ]
    },
    { href: '/report', icon: AlertCircle, label: 'Report', id: 'report' },
    { href: '/stats', icon: BarChart3, label: 'Statistics', id: 'stats' },
  ]

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'ml', label: 'മലയാളം' },
  ]

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-primary-foreground rounded-lg"
        aria-label="Toggle sidebar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-64 bg-sidebar/80 backdrop-blur-2xl text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 z-40 shadow-xl font-mono',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo / Brand */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-sidebar-primary">CyberSafe</h1>
                <p className="text-xs text-sidebar-accent">Digital Safety Hub</p>
              </div>
            </div>
            
            {/* User Avatar & Score */}
            <div className="mt-6 flex items-center gap-3 bg-card/50 p-3 rounded-lg border border-border">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg", avatarColor)}>
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{userRank}</p>
                <p className="text-xs text-muted-foreground">{points} Safety Points</p>
              </div>
            </div>

            {/* Extension Download (Moved to Top for Visibility) */}
            <div className="mt-6 px-1">
              <button
                onClick={() => setIsExtensionModalOpen(true)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5"
              >
                <Shield className="w-5 h-5 animate-pulse" />
                <span>Get CyberSafe Extension</span>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const hasSubItems = item.subItems && item.subItems.length > 0
              
              if (hasSubItems) {
                const isAnyChildActive = item.subItems?.some(subItem => pathname === subItem.href)
                return (
                  <div key={item.id} className="space-y-1">
                    <button
                      onClick={() => setIsPracticeOpen(!isPracticeOpen)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors',
                        isAnyChildActive
                          ? 'bg-sidebar-primary/10 text-sidebar-primary'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {isPracticeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {isPracticeOpen && (
                      <div className="pl-11 pr-2 space-y-1 pt-1 overflow-hidden transition-all duration-300">
                        {item.subItems?.map((subItem) => {
                          const SubIcon = subItem.icon
                          const isSubActive = pathname === subItem.href
                          return (
                            <Link
                              key={subItem.id}
                              href={subItem.href}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm',
                                isSubActive
                                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                              )}
                            >
                              <SubIcon className="w-4 h-4" />
                              <span className="font-medium">{subItem.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              const isActive = pathname === item.href
              return (
                <Link
                  key={item.id}
                  href={item.href!}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Language & Voice Controls */}
          <div className="p-4 border-t border-sidebar-border space-y-3">
            {/* Language Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-sidebar-muted-foreground flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Language
              </label>
              <div className="flex gap-1 flex-wrap">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => onLanguageChange?.(lang.code)}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded font-medium transition-colors',
                      currentLanguage === lang.code
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'bg-sidebar-accent/30 text-sidebar-foreground hover:bg-sidebar-accent/60'
                    )}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Toggle */}
            <button className="w-full flex items-center gap-2 px-4 py-2.5 bg-sidebar-accent/30 text-sidebar-foreground rounded-lg hover:bg-sidebar-accent/60 transition-colors">
              <Volume2 className="w-4 h-4" />
              <span className="text-sm font-medium">Voice Guidance</span>
            </button>

            {/* Accessibility Settings */}
            <button
              onClick={onAccessibilityClick}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-sidebar-accent/30 text-sidebar-foreground rounded-lg hover:bg-sidebar-accent/60 transition-colors"
              aria-label="Open accessibility settings"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Accessibility</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Extension Installation Modal */}
      {isExtensionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden font-mono text-card-foreground">
            <div className="p-6 border-b border-border bg-muted/30">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                CyberSafe Installation
              </h2>
              <p className="text-sm text-muted-foreground mt-2 font-sans">
                Due to Chrome Web Store publishing times, this developer preview requires a manual 3-step installation.
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold shrink-0">1</div>
                <div>
                  <h3 className="font-semibold text-sm">Download the Source</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-sans">Download and extract the zip file to your desktop.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold shrink-0">2</div>
                <div>
                  <h3 className="font-semibold text-sm">Open Chrome Extensions</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-sans">Type <code className="bg-muted px-1 py-0.5 rounded text-emerald-500">chrome://extensions</code> in your browser URL bar and hit enter.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold shrink-0">3</div>
                <div>
                  <h3 className="font-semibold text-sm">Load Unpacked</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-sans">Turn on <strong>Developer mode</strong> (top right), click <strong>Load unpacked</strong>, and select the extracted folder.</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsExtensionModalOpen(false)}>
                Cancel
              </Button>
              <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white border-0">
                <a href="/cybersafe-extension.zip" download onClick={() => setTimeout(() => setIsExtensionModalOpen(false), 500)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download .zip Now
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
