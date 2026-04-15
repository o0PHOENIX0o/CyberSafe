'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { Sidebar } from '@/components/sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUser } from '@/components/user-context'
import { Timer, ShieldAlert, ShieldCheck, Trophy, ArrowRight, RefreshCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Scenario {
  id: number
  text: string
  isScam: boolean
  explanation: string
}

const gauntletScenarios: Scenario[] = [
  { id: 1, text: "URGENT: Your PayPal account is suspended. Click here to verify: http://paypal-secure-verify.tk", isScam: true, explanation: "Urgent tone with a sketchy top-level domain (.tk)." },
  { id: 2, text: "Hey! We're still on for lunch tomorrow at 12? See you at the usual spot.", isScam: false, explanation: "Standard personal communication with no embedded links." },
  { id: 3, text: "Amazon: Your recent order #112-445 for 'iPhone 15' was shipped. Track here: bit.ly/amz-trk", isScam: true, explanation: "Unexpected high-value item with a shortened, unverified link." },
  { id: 4, text: "Hi team, please find the quarterly report attached securely to our internal SharePoint.", isScam: false, explanation: "Standard office communication mentioning internal secure platforms." },
  { id: 5, text: "Netflix Payment Declined. To avoid interruption of service, update billing: http://netfIix.com/billing", isScam: true, explanation: "Homoglyph attack: 'netfIix' uses a capital 'I' instead of 'l'." },
  { id: 6, text: "Your Netflix subscription has been successfully renewed. Thank you!", isScam: false, explanation: "Normal transactional receipt with no action demanded." },
  { id: 7, text: "Government Subsidy Approved! Click here to claim your $1,400 allowance immediately.", isScam: true, explanation: "Promises free money and demands immediate action." },
  { id: 8, text: "A login from Windows PC was blocked. If this wasn't you, ignore it. If it was, use the app to unblock.", isScam: false, explanation: "Legitimate security alert that does not require clicking a link." },
  { id: 9, text: "HR Dept: Important policy update. Review document: http://drive-google.doc5.com/login", isScam: true, explanation: "Spoofed, complex subdomain pretending to be Google Drive." },
  { id: 10, text: "Mom, I lost my phone, this is my new number. I need £50 urgently to get home, pls send to my friend's account.", isScam: true, explanation: "Classic 'Hi Mom' WhatsApp scam requesting urgent money to unknown accounts." },
]

export default function GauntletPage() {
  const { addPoints } = useUser()
  const { setTheme } = useTheme()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(10)
  const [score, setScore] = useState(0)
  const [results, setResults] = useState<{scenario: Scenario, userChoice: boolean, correct: boolean}[]>([])
  
  // Force dark mode cinematically on enter
  useEffect(() => {
    setTheme('dark')
  }, [setTheme])

  // Timer logic
  useEffect(() => {
    if (!isPlaying || isGameOver) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          handleChoice(null) // Time ran out
          return 10
        }
        return prev - 0.1
      })
    }, 100)

    return () => clearInterval(timer)
  }, [isPlaying, isGameOver, currentIndex])

  const handleChoice = useCallback((isScamPrediction: boolean | null) => {
    const currentScenario = gauntletScenarios[currentIndex]
    
    // Check if correct
    let isCorrect = false
    if (isScamPrediction !== null && isScamPrediction === currentScenario.isScam) {
      isCorrect = true
      setScore(s => s + 1)
    }

    setResults(prev => [...prev, { scenario: currentScenario, userChoice: isScamPrediction || false, correct: isCorrect }])

    // Go next
    if (currentIndex < gauntletScenarios.length - 1) {
      setCurrentIndex(i => i + 1)
      setTimeLeft(10)
    } else {
      endGame()
    }
  }, [currentIndex])

  const endGame = () => {
    setIsPlaying(false)
    setIsGameOver(true)
    const pointsEarned = score * 10
    if (pointsEarned > 0) {
      addPoints(pointsEarned)
    }
  }

  const startGame = () => {
    setResults([])
    setScore(0)
    setCurrentIndex(0)
    setTimeLeft(10)
    setIsGameOver(false)
    setIsPlaying(true)
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isGameOver) return
      if (e.key === 'ArrowLeft') handleChoice(false) // Safe
      if (e.key === 'ArrowRight') handleChoice(true) // Scam
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, isGameOver, handleChoice])

  return (
    <div className="min-h-screen bg-background relative overflow-hidden transition-colors duration-1000">
      {/* Cool Neon Grid Background */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_10%,transparent_100%)]"></div>

      <Sidebar />
      <main className="md:ml-64 mt-16 md:mt-0 p-4 sm:p-8 flex items-center justify-center min-h-[calc(100vh-4rem)] md:min-h-screen relative z-10">
        <div className="w-full max-w-3xl">
          
          {/* Pre-Game State */}
          {!isPlaying && !isGameOver && (
            <Card className="p-10 text-center space-y-6 bg-card/80 backdrop-blur-2xl border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)] rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)] animate-pulse-fast">
                <Timer className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">The Phishing Gauntlet</h1>
                <p className="text-emerald-400/80 text-lg">
                  Test your real-world reflexes. You have <span className="font-bold text-white">10 seconds</span> per message to decide: <span className="font-bold text-emerald-400">SAFE</span> or <span className="font-bold text-rose-500">SCAM</span>.
                </p>
                <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-400 font-mono">
                  <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-lg border border-white/5">
                    <kbd className="px-2 py-1 bg-gray-800 text-emerald-400 rounded">←</kbd> Safe
                  </div>
                  <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-lg border border-white/5">
                    <kbd className="px-2 py-1 bg-gray-800 text-rose-400 rounded">→</kbd> Scam
                  </div>
                </div>
              </div>
              <Button size="lg" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all font-bold tracking-wider mt-4" onClick={startGame}>
                START SIMULATION <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Card>
          )}

          {/* Playing State */}
          {isPlaying && !isGameOver && (
            <Card className="p-8 space-y-8 relative overflow-hidden bg-card/90 backdrop-blur-3xl border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)] rounded-2xl">
              {/* Progress bar timer */}
              <div 
                className={cn("absolute top-0 left-0 h-1.5 transition-all duration-100 ease-linear shadow-[0_0_10px_currentColor]", 
                  timeLeft > 5 ? "bg-emerald-500 text-emerald-500" : timeLeft > 2 ? "bg-amber-500 text-amber-500" : "bg-rose-500 text-rose-500"
                )} 
                style={{ width: `${(timeLeft / 10) * 100}%` }}
              />
              
              <div className="flex justify-between items-center text-sm font-semibold text-emerald-500/70 uppercase tracking-widest font-mono">
                <span>Message 0{currentIndex + 1} / 10</span>
                <span>Score: {score}</span>
              </div>

              <div className="bg-black border border-emerald-500/20 rounded-xl p-8 shadow-inner min-h-[200px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:10px_10px]"></div>
                <p className="text-xl md:text-2xl font-mono text-emerald-400 text-center relative z-10 font-bold tracking-wide leading-relaxed">
                  "{gauntletScenarios[currentIndex].text}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-24 text-xl border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all bg-black/50"
                  onClick={() => handleChoice(false)}
                >
                  <ShieldCheck className="w-8 h-8 mr-3 text-emerald-500" />
                  SAFE (←)
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-24 text-xl border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:shadow-[0_0_25px_rgba(244,63,94,0.4)] transition-all bg-black/50"
                  onClick={() => handleChoice(true)}
                >
                  <ShieldAlert className="w-8 h-8 mr-3 text-rose-500" />
                  SCAM (→)
                </Button>
              </div>
            </Card>
          )}

          {/* Game Over State */}
          {isGameOver && (
             <Card className="p-8 space-y-6 bg-card/90 backdrop-blur-2xl border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.15)] rounded-2xl">
               <div className="text-center">
                  <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto text-blue-400 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)] mb-6">
                    <Trophy className="w-12 h-12" />
                  </div>
                  <h2 className="text-4xl font-bold text-white tracking-tight">Simulation Complete</h2>
                  <p className="text-lg text-blue-300/80 mt-3">
                    You scored <span className="font-bold text-white">{score}/{gauntletScenarios.length}</span>.
                    Earned <span className="text-emerald-400 font-bold">+{score * 10}</span> Safety Context.
                  </p>
               </div>

               <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                 {results.map((res, idx) => (
                   <div key={idx} className={cn("p-5 rounded-xl border backdrop-blur-md", res.correct ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]" : "bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.05)]")}>
                     <div className="flex justify-between items-start mb-2">
                       <p className="font-mono text-gray-200 text-[13px] tracking-wide w-4/5 leading-relaxed">"{res.scenario.text}"</p>
                       {!res.correct && <span className="text-xs font-bold text-rose-400 uppercase px-2 py-1 bg-rose-500/20 rounded border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)] ml-2 shrink-0">Missed</span>}
                     </div>
                     <p className="text-sm text-gray-400 mt-2"><span className="font-semibold text-white">Why: </span>{res.scenario.explanation}</p>
                   </div>
                 ))}
               </div>

               <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] font-bold tracking-widest mt-4" onClick={startGame}>
                 <RefreshCcw className="w-5 h-5 mr-3" /> INITIALIZE NEW SIMULATION
               </Button>
             </Card>
          )}

        </div>
      </main>
    </div>
  )
}
