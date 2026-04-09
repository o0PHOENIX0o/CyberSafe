'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, BookOpen, AlertCircle, BarChart3, ArrowRight, Gamepad2, Terminal, ScanEye } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const [language, setLanguage] = useState('en')

  const features = [
    {
      icon: Shield,
      title: 'Scam Scanner',
      description: 'Analyze messages, URLs, and emails to detect potential scams with AI-powered pattern recognition',
      href: '/scanner',
      color: 'from-blue-600 to-cyan-600',
      accentColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      icon: BookOpen,
      title: 'Learn & Practice',
      description: 'Interactive lessons and simulations to recognize common scam tactics. Test your skills in safe scenarios.',
      href: '/learn',
      color: 'from-emerald-600 to-teal-600',
      accentColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      icon: Gamepad2,
      title: 'Phishing Gauntlet',
      description: 'Test your reflexes in a rapid-fire phishing detection challenge. Think fast, stay safe.',
      href: '/gauntlet',
      color: 'from-amber-600 to-yellow-600',
      accentColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      icon: Terminal,
      title: 'Deep-Phish Simulator',
      description: 'Bad Actor Mode. Try to build a phishing email that can bypass our AI detection engine.',
      href: '/simulator',
      color: 'from-indigo-600 to-violet-600',
      accentColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    },
    {
      icon: ScanEye,
      title: 'Deepfake Detector',
      description: 'Upload audio or video to detect AI-generated deepfakes using WavLM voice analysis and CNN-BiLSTM video forensics.',
      href: '/deepfake',
      color: 'from-violet-600 to-pink-600',
      accentColor: 'bg-violet-100 dark:bg-violet-900/30',
    },
    {
      icon: AlertCircle,
      title: 'Report Threats',
      description: 'Share information about scams you&apos;ve encountered. Help the community stay safe.',
      href: '/report',
      color: 'from-orange-600 to-red-600',
      accentColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
    {
      icon: BarChart3,
      title: 'Trending Scams',
      description: 'Stay informed about the latest scam tactics and trends reported by the community.',
      href: '/stats',
      color: 'from-purple-600 to-pink-600',
      accentColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ]

  const safetyTips = [
    'Never share your OTP with anyone, even bank staff',
    'Check sender email addresses carefully for spoofing',
    'Always verify links before clicking - hover to see full URL',
    'Enable 2FA on all important accounts',
    'Be suspicious of unsolicited money transfer requests',
    'Government agencies never ask for money via SMS',
  ]

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden transition-colors duration-700">
      {/* Dynamic Cyber Grid Background */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,#000_20%,transparent_100%)]"></div>
      
      <Sidebar currentLanguage={language} onLanguageChange={setLanguage} />

      {/* Main Content */}
      <main className="md:ml-64 mt-16 md:mt-0 relative z-10">
        {/* Hero Section */}
        <div className="relative border-b border-border bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/10 via-background to-background overflow-hidden transition-colors duration-700">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]"></div>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-semibold tracking-wider uppercase">Your Safety, Our Priority</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-foreground tracking-tight drop-shadow-md">
                Stay Protected <br/><span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-cyan-500">Online</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl text-balance leading-relaxed">
                Learn to identify scams, scan suspicious messages, report threats, and protect your digital identity. Join the frontlines of digital defense.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Link href="/scanner">
                  <Button size="lg" className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground dark:shadow-[0_0_20px_rgba(16,185,129,0.3)] dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all h-14 px-8 text-lg font-bold tracking-wide">
                    INITIATE SCANNER
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/learn">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 h-14 px-8 text-lg border-primary/30 text-primary hover:bg-primary/10 transition-all font-semibold dark:hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-background/50 backdrop-blur-sm">
                    ENTER TRAINING
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Status Cards */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-card/40 backdrop-blur-xl border-border hover:border-primary/50 transition-all shadow-lg group">
              <div className="space-y-3 relative z-10">
                <p className="text-sm font-semibold text-primary uppercase tracking-widest">Global Defense Score</p>
                <div className="text-4xl font-bold text-card-foreground group-hover:text-primary transition-colors drop-shadow-sm dark:drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">85%</div>
                <p className="text-xs text-muted-foreground">Based on system heuristics</p>
              </div>
            </Card>
            <Card className="p-6 bg-card/40 backdrop-blur-xl border-border hover:border-cyan-500/50 transition-all shadow-lg group">
              <div className="space-y-3 relative z-10">
                <p className="text-sm font-semibold text-cyan-500 uppercase tracking-widest">Threats Neutralized</p>
                <div className="text-4xl font-bold text-card-foreground group-hover:text-cyan-500 transition-colors drop-shadow-sm dark:drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">42</div>
                <p className="text-xs text-muted-foreground">Current cycle</p>
              </div>
            </Card>
            <Card className="p-6 bg-card/40 backdrop-blur-xl border-border hover:border-violet-500/50 transition-all shadow-lg group">
              <div className="space-y-3 relative z-10">
                <p className="text-sm font-semibold text-violet-500 uppercase tracking-widest">Simulations Cleared</p>
                <div className="text-4xl font-bold text-card-foreground group-hover:text-violet-500 transition-colors drop-shadow-sm dark:drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]">12</div>
                <p className="text-xs text-muted-foreground">Operational readiness high</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Platform Capabilities</h2>
              <p className="text-primary/80">Premium suite of security modules</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <Link key={feature.title} href={feature.href}>
                    <Card className="h-full p-6 bg-card hover:bg-accent/50 backdrop-blur-xl border-border hover:border-primary/50 hover:shadow-lg dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all cursor-pointer group">
                      <div className="flex items-start gap-5">
                        <div className={`p-4 rounded-xl bg-background border border-border group-hover:border-primary/50 transition-colors shadow-inner`}>
                          <Icon className="w-7 h-7 text-primary group-hover:text-primary/80" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-card-foreground mb-2 tracking-wide group-hover:text-primary transition-colors">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{feature.description}</p>
                          <div className="inline-flex items-center text-sm font-bold text-primary group-hover:text-primary/80">
                            INITIALIZE
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* Quick Safety Tips */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Quick Safety Tips</h2>
              <p className="text-muted-foreground">Important reminders to keep you protected</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {safetyTips.map((tip, idx) => (
                <div key={idx} className="flex gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                  <p className="text-sm text-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative border-t border-border bg-linear-to-br from-primary/10 via-background to-background overflow-hidden mt-12 py-20 transition-colors duration-700">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0,transparent_50%)]"></div>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight drop-shadow-md">Engage Defense Protocols</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Stay one step ahead of threat actors. Initiate scanning heuristics and protect your environment immediately.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <Link href="/scanner">
                  <Button size="lg" className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all h-14 px-10 text-lg font-bold tracking-widest">
                    ACTIVATE SCANNER NOW
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border bg-background transition-colors duration-700">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm text-muted-foreground font-mono">
                © 2026 CYBERSAFE. ALL SYSTEMS NOMINAL.
              </div>
              <div className="flex gap-6 text-sm text-muted-foreground font-mono">
                <button className="hover:text-primary transition-colors tracking-widest">PRIVACY_</button>
                <button className="hover:text-primary transition-colors tracking-widest">TERMS_</button>
                <button className="hover:text-primary transition-colors tracking-widest">CONTACT_</button>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
