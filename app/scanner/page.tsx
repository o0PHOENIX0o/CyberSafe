'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { analyzeText, analyzeEmail, type ScamAnalysisResult } from '@/lib/scam-detector'
import { Shield, CheckCircle, AlertTriangle, AlertCircle, Copy, Zap } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export default function ScannerPage() {
  const [activeTab, setActiveTab] = useState('text')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ScamAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleScan = async () => {
    if (!input.trim()) return

    setLoading(true)

    try {
      let analysisResult: ScamAnalysisResult

      if (activeTab === 'url') {
        const response = await fetch('http://localhost:8000/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: [input] }),
        })

        if (!response.ok) {
          throw new Error(`Backend scan failed with status ${response.status}`)
        }

        const data = await response.json()
        if (!data.success || !Array.isArray(data.results) || data.results.length === 0) {
          throw new Error('Backend scan returned no results')
        }

        const scanResult = data.results[0]
        const riskScore = Math.min(100, Math.max(0, Math.round(scanResult.score ?? 0)))
        let riskLevel: ScamAnalysisResult['riskLevel'] = 'safe'
        if (riskScore >= 80) riskLevel = 'critical'
        else if (riskScore >= 60) riskLevel = 'high'
        else if (riskScore >= 40) riskLevel = 'medium'
        else if (riskScore >= 20) riskLevel = 'low'

        const patterns = Array.isArray(scanResult.patterns)
          ? scanResult.patterns.map((pattern: string) => ({
              name: pattern,
              confidence: scanResult.isSuspicious ? 80 : 40,
              description: pattern,
              severity: scanResult.isSuspicious ? 'high' : 'low',
            }))
          : []

        analysisResult = {
          riskScore,
          riskLevel,
          patterns,
          explanation: scanResult.isSuspicious
            ? 'Backend URL scan detected suspicious characteristics in the submitted URL.'
            : 'Backend URL scan did not find suspicious patterns in the submitted URL.',
          recommendations: scanResult.isSuspicious
            ? [
                'Do not visit this URL or click any links from it.',
                'Verify the sender/domain before interacting.',
                'Report the URL to your security team or browser provider.',
              ]
            : ['The URL appears safe based on backend detection. Continue with caution.'],
        }
      } else {
        switch (activeTab) {
          case 'email':
            analysisResult = analyzeEmail(input)
            break
          case 'text':
          default:
            analysisResult = analyzeText(input)
        }
      }

      setResult(analysisResult)
    } catch (error) {
      console.error(error)
      setResult({
        riskScore: 0,
        riskLevel: 'safe',
        patterns: [],
        explanation: 'Unable to scan the URL. Please try again later.',
        recommendations: ['Check your internet connection and try again.'],
      })
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'text-red-600 dark:text-red-400'
      case 'high':
        return 'text-orange-600 dark:text-orange-400'
      case 'medium':
        return 'text-amber-600 dark:text-amber-400'
      case 'low':
        return 'text-yellow-600 dark:text-yellow-400'
      default:
        return 'text-green-600 dark:text-green-400'
    }
  }

  const getRiskBgColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'high':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
      case 'medium':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      case 'low':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      default:
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    }
  }

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
      case 'high':
        return AlertCircle
      case 'medium':
        return AlertTriangle
      case 'low':
        return AlertTriangle
      default:
        return CheckCircle
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="md:ml-64 mt-16 md:mt-0">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Instant Detection</span>
              </div>
              <h1 className="text-4xl font-bold text-foreground">Scam Scanner</h1>
              <p className="text-lg text-muted-foreground">
                Analyze messages, URLs, and emails to detect potential scams in seconds
              </p>
            </div>
          </div>
        </div>

        {/* Scanner Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text">Message/Text</TabsTrigger>
                <TabsTrigger value="url">URL</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="text" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Paste your message or text
                    </label>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Paste the text you want to scan for potential scams..."
                      className="w-full h-48 p-4 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="url" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Paste the URL to scan
                    </label>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="https://example.com/suspicious-link"
                      className="w-full p-4 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="email" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Paste the full email
                    </label>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Paste the complete email content including headers..."
                      className="w-full h-48 p-4 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </TabsContent>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleScan}
                  disabled={!input.trim() || loading}
                  className="gap-2"
                  size="lg"
                >
                  {loading ? 'Scanning...' : 'Scan Now'}
                  {!loading && <Shield className="w-4 h-4" />}
                </Button>
                {input && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setInput('')
                      setResult(null)
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </Tabs>
          </Card>

          {/* Results Section */}
          {result && (
            <div className="mt-8 space-y-6">
              {/* Risk Score Card */}
              <Card className={cn('p-8 border-2', getRiskBgColor(result.riskLevel))}>
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const RiskIcon = getRiskIcon(result.riskLevel)
                        return <RiskIcon className={cn('w-8 h-8', getRiskColor(result.riskLevel))} />
                      })()}
                      <h2 className={cn('text-3xl font-bold', getRiskColor(result.riskLevel))}>
                        {result.riskScore}%
                      </h2>
                    </div>
                    <div>
                      <p className={cn('text-sm font-semibold uppercase', getRiskColor(result.riskLevel))}>
                        Risk Level: {result.riskLevel}
                      </p>
                      <p className="text-foreground mt-2 text-lg">{result.explanation}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center bg-background/50">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">{result.riskScore}%</div>
                        <div className="text-xs text-muted-foreground">Risk</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Detected Patterns */}
              {result.patterns.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Detected Issues</h3>
                  <div className="space-y-3">
                    {result.patterns.map((pattern, idx) => (
                      <div
                        key={idx}
                        className="p-4 border border-border rounded-lg bg-card"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">{pattern.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
                          </div>
                          <div className="ml-4 text-right">
                            <div className={cn('text-sm font-semibold', getRiskColor(pattern.severity))}>
                              {pattern.confidence}%
                            </div>
                            <div className={cn('text-xs uppercase', getRiskColor(pattern.severity))}>
                              {pattern.severity}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Recommendations */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">What You Should Do</h3>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-foreground">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Share Results */}
              <Card className="p-6 bg-card border-primary/20">
                <h3 className="text-lg font-semibold text-foreground mb-3">Share This Analysis</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const text = `CyberSafe Scam Detection: Risk Score ${result.riskScore}% (${result.riskLevel.toUpperCase()})\n\n${result.explanation}`
                      navigator.clipboard.writeText(text)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy Results'}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {!result && !loading && (
            <div className="mt-12 text-center space-y-4">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto opacity-50" />
              <h3 className="text-xl font-semibold text-foreground">No scan yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Paste a message, URL, or email above to scan for potential scams. Our AI-powered detector will analyze patterns and give you a risk score.
              </p>
            </div>
          )}
        </div>

        {/* How It Works Section */}
        <div className="bg-card border-t border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">How Our Scanner Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Pattern Analysis',
                  description: 'We analyze text for common scam indicators like urgent language, financial threats, and suspicious requests.',
                },
                {
                  title: 'URL Inspection',
                  description: 'Check for suspicious domains, URL shorteners, and lookalike addresses that mimic legitimate services.',
                },
                {
                  title: 'Risk Scoring',
                  description: 'Combine multiple signals to calculate an accurate risk score from 0-100, helping you understand the threat level.',
                },
              ].map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
