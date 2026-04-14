'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  Mic,
  Video,
  Upload,
  X,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ShieldAlert,
  Waves,
  Film,
  Info,
  Play,
  Pause,
} from 'lucide-react'

const BACKEND_URL = 'http://127.0.0.1:8000'

interface DetectionResult {
  label: string
  score?: number
  confidence?: number
  average_score?: number
  fake_percentage?: number
  total_analyzed_frames?: number
  fake_frames?: number
}

// ─── Circular Confidence Meter ───────────────────────────────────────────────
function CircularMeter({ score, isFake }: { score: number; isFake: boolean }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = circumference - (score / 100) * circumference
  const color = isFake ? (score > 80 ? '#ef4444' : '#f97316') : '#22c55e'

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
        <circle
          cx="64" cy="64" r={radius} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={progress}
          style={{ filter: `drop-shadow(0 0 8px ${color}80)`, transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold font-mono" style={{ color }}>{Math.round(score)}%</span>
        <span className="text-xs text-muted-foreground mt-0.5">confidence</span>
      </div>
    </div>
  )
}

// ─── Result Card ─────────────────────────────────────────────────────────────
function ResultCard({ result, type }: { result: DetectionResult; type: 'audio' | 'video' }) {
  const isFake = result.label.toUpperCase().includes('FAKE') || result.label.toUpperCase().includes('SYNTHETIC')
  const score = (result.confidence ?? result.score ?? 0) * 100

  return (
    <div className={cn(
      'rounded-2xl border-2 p-8 space-y-6 transition-all duration-500',
      isFake ? 'border-red-500/50 bg-red-500/5 dark:bg-red-950/20' : 'border-green-500/50 bg-green-500/5 dark:bg-green-950/20'
    )}>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <CircularMeter score={score} isFake={isFake} />
        <div className="flex-1 text-center sm:text-left space-y-3">
          <div className={cn(
            'inline-flex items-center gap-2 text-sm font-bold px-4 py-1.5 rounded-full',
            isFake ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'
          )}>
            {isFake ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {isFake ? 'DEEPFAKE DETECTED' : 'AUTHENTIC CONTENT'}
          </div>
          <h3 className={cn('text-2xl font-extrabold tracking-tight', isFake ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400')}>
            {result.label}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isFake
              ? type === 'audio'
                ? 'This audio exhibits AI-generated voice characteristics. It is likely synthetic or cloned.'
                : 'The video shows signs of AI manipulation. Facial inconsistencies detected across frames.'
              : type === 'audio'
                ? 'The audio patterns closely match a genuine human voice with no synthetic indicators.'
                : 'No significant deepfake artifacts detected. Video appears to be authentic.'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Detection Confidence</span>
            <span className="font-mono font-semibold">{Math.round(score)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-1000', isFake ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-emerald-400 to-green-500')}
              style={{ width: `${Math.round(score)}%` }}
            />
          </div>
        </div>

        {type === 'video' && result.total_analyzed_frames !== undefined && (
          <div className="grid grid-cols-3 gap-2 mt-4 p-4 bg-background/40 backdrop-blur-sm rounded-xl border border-border">
            <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/30">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Frames Analyzed</span>
              <span className="font-mono text-lg font-bold text-foreground">{result.total_analyzed_frames}</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/30">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Fake Frames</span>
              <span className={cn("font-mono text-lg font-bold", result.fake_frames && result.fake_frames > 0 ? "text-red-400" : "text-green-400")}>
                {result.fake_frames} <span className="text-xs font-normal text-muted-foreground">({result.fake_percentage}%)</span>
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/30">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Avg Fake Prob</span>
              <span className={cn("font-mono text-lg font-bold", isFake ? "text-red-400" : "text-green-400")}>
                {Math.round((result.average_score ?? 0) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 p-3 bg-muted/30 rounded-lg border border-border text-xs text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>This analysis is AI-assisted and may not be 100% accurate. Always cross-verify with other sources before drawing conclusions.</span>
      </div>
    </div>
  )
}

// ─── Audio Preview Player ─────────────────────────────────────────────────────
function AudioPreview({ file }: { file: File }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  if (!objectUrl) return null

  return (
    <div className="mt-4 p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 space-y-3">
      <audio
        ref={audioRef}
        src={objectUrl}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />

      {/* Waveform visual */}
      <div className="flex items-end justify-center gap-[3px] h-12 px-2">
        {Array.from({ length: 48 }).map((_, i) => {
          const heightPct = 20 + Math.abs(Math.sin(i * 0.7 + i * 0.3) * 70)
          const filled = pct > 0 && (i / 48) * 100 < pct
          return (
            <div
              key={i}
              className={cn(
                'w-1 rounded-full transition-all duration-100',
                filled ? 'bg-violet-400' : 'bg-violet-400/25'
              )}
              style={{ height: `${heightPct}%` }}
            />
          )
        })}
      </div>

      {/* Progress bar */}
      <div
        className="relative h-1.5 rounded-full bg-muted cursor-pointer overflow-hidden"
        onClick={(e) => {
          if (!audioRef.current || !duration) return
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          audioRef.current.currentTime = (x / rect.width) * duration
        }}
      >
        <div
          className="absolute inset-y-0 left-0 bg-violet-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shrink-0 transition-colors shadow-lg shadow-violet-500/30"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <span className="text-xs font-mono text-muted-foreground">
          {fmt(currentTime)} / {duration ? fmt(duration) : '--:--'}
        </span>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground truncate max-w-[140px]">{file.name}</span>
      </div>
    </div>
  )
}

// ─── Video Preview Player ─────────────────────────────────────────────────────
function VideoPreview({ file }: { file: File }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!objectUrl) return null

  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-pink-500/20 bg-black shadow-xl shadow-pink-500/10">
      <video
        src={objectUrl}
        controls
        className="w-full max-h-72 object-contain"
        preload="metadata"
      />
      <div className="px-4 py-2 flex items-center gap-2 bg-pink-500/5 border-t border-pink-500/20">
        <Film className="w-3.5 h-3.5 text-pink-400 shrink-0" />
        <span className="text-xs text-muted-foreground truncate">{file.name}</span>
        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {(file.size / 1024 / 1024).toFixed(1)} MB
        </span>
      </div>
    </div>
  )
}

// ─── File Dropzone ────────────────────────────────────────────────────────────
function FileDropzone({
  accept, icon: Icon, label, hint, file, onFileChange, onClear,
}: {
  accept: string
  icon: React.ElementType
  label: string
  hint: string
  file: File | null
  onFileChange: (f: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) onFileChange(dropped)
  }, [onFileChange])

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center gap-4 w-full rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all',
        dragging ? 'border-primary bg-primary/10 scale-[1.01]'
          : file ? 'border-primary/60 bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/30'
      )}
      onClick={() => !file && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0])}
      />

      {file ? (
        <>
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Icon className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground text-sm">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClear() }}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-muted hover:bg-destructive/20 hover:text-destructive transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center">
            <Upload className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{label}</p>
            <p className="text-sm text-muted-foreground">{hint}</p>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DeepfakePage() {
  const [activeTab, setActiveTab] = useState<'audio' | 'video'>('audio')

  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioResult, setAudioResult] = useState<DetectionResult | null>(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoResult, setVideoResult] = useState<DetectionResult | null>(null)
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoStage, setVideoStage] = useState('')

  const handleAudioScan = async () => {
    if (!audioFile) return
    setAudioLoading(true)
    setAudioError(null)
    setAudioResult(null)
    try {
      const form = new FormData()
      form.append('file', audioFile)
      const res = await fetch(`${BACKEND_URL}/audio`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      
      const data = await res.json()
      
      setAudioResult({
         label: data.label,
         confidence: data.confidence,
         score: data.score
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setAudioError(`Failed to connect to detection backend. Make sure the backend server is running on port 8000. (${message})`)
    } finally {
      setAudioLoading(false)
    }
  }

  const handleVideoScan = async () => {
    if (!videoFile) return
    setVideoLoading(true)
    setVideoError(null)
    setVideoResult(null)
    setVideoProgress(0)
    setVideoStage('')
    try {
      const form = new FormData()
      form.append('file', videoFile)
      const res = await fetch(`${BACKEND_URL}/video`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      
      const data = await res.json()
      
      setVideoResult({
          label: data.label,
          confidence: data.confidence,
          average_score: data.score,
          fake_percentage: data.details?.fake_percentage,
          total_analyzed_frames: data.details?.frames_analyzed,
          fake_frames: data.details?.fake_frames
      })
      setVideoProgress(100)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setVideoError(`Failed to connect to detection backend. Make sure the backend server is running on port 8000. (${message})`)
    } finally {
      setVideoLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,#000_20%,transparent_100%)]" />

      <Sidebar />

      <main className="md:ml-64 mt-16 md:mt-0 relative z-10">
        {/* Header */}
        <div className="relative border-b border-border bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-violet-600/10 via-background to-background overflow-hidden">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-sm font-semibold tracking-wider uppercase">AI Forensics Module</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
                Deepfake{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">Detector</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                Upload a voice recording or video clip to detect AI-generated deepfakes using our state-of-the-art WavLM audio model and CNN-BiLSTM video analysis engine.
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'audio' | 'video')} className="w-full">
            <TabsList className="grid w-full max-w-sm grid-cols-2 mb-8">
              <TabsTrigger value="audio" className="gap-2"><Mic className="w-4 h-4" /> Audio</TabsTrigger>
              <TabsTrigger value="video" className="gap-2"><Video className="w-4 h-4" /> Video</TabsTrigger>
            </TabsList>

            {/* ── AUDIO TAB ── */}
            <TabsContent value="audio" className="space-y-6">
              <Card className="p-6 bg-card/60 backdrop-blur-xl border-border space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">Voice Deepfake Analysis</h2>
                    <p className="text-xs text-muted-foreground">Powered by WavLM + Keras classifier</p>
                  </div>
                </div>

                <FileDropzone
                  accept=".wav,.mp3,.flac,.m4a,.ogg"
                  icon={Waves}
                  label="Drop your audio file here"
                  hint="Supports WAV, MP3, FLAC, M4A, OGG — up to 50 MB"
                  file={audioFile}
                  onFileChange={(f) => { setAudioFile(f); setAudioResult(null); setAudioError(null) }}
                  onClear={() => { setAudioFile(null); setAudioResult(null); setAudioError(null) }}
                />

                {/* Audio Preview */}
                {audioFile && <AudioPreview file={audioFile} />}

                {audioError && (
                  <div className="flex gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{audioError}</span>
                  </div>
                )}

                <Button
                  onClick={handleAudioScan}
                  disabled={!audioFile || audioLoading}
                  size="lg"
                  className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold tracking-wide dark:shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                >
                  {audioLoading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Voice Patterns...</>
                  ) : (
                    <><ShieldAlert className="w-5 h-5" /> ANALYZE AUDIO</>
                  )}
                </Button>
              </Card>

              {audioResult && <ResultCard result={audioResult} type="audio" />}

              {/* How it works */}
              <Card className="p-6 border-border bg-card/40 space-y-4">
                <h3 className="font-semibold text-foreground">How Audio Detection Works</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  {[
                    { step: '01', title: 'Feature Extraction', desc: 'WavLM encodes deep contextual audio features from the waveform.' },
                    { step: '02', title: 'Embedding Analysis', desc: 'Temporal embeddings are averaged and passed to the classifier.' },
                    { step: '03', title: 'Verdict', desc: 'A Keras binary classifier outputs a probability score for synthesis.' },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-3">
                      <span className="text-violet-400 font-mono font-bold text-sm">{step}</span>
                      <div>
                        <p className="font-semibold text-foreground">{title}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* ── VIDEO TAB ── */}
            <TabsContent value="video" className="space-y-6">
              <Card className="p-6 bg-card/60 backdrop-blur-xl border-border space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                    <Video className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">Video Deepfake Analysis</h2>
                    <p className="text-xs text-muted-foreground">Powered by YOLOv8 face detection + CNN-BiLSTM</p>
                  </div>
                </div>

                <FileDropzone
                  accept=".mp4,.avi,.mov,.mkv,.webm"
                  icon={Film}
                  label="Drop your video file here"
                  hint="Supports MP4, AVI, MOV, MKV, WebM — up to 200 MB"
                  file={videoFile}
                  onFileChange={(f) => { setVideoFile(f); setVideoResult(null); setVideoError(null) }}
                  onClear={() => { setVideoFile(null); setVideoResult(null); setVideoError(null) }}
                />

                {/* Video Preview */}
                {videoFile && <VideoPreview file={videoFile} />}

                {videoError && (
                  <div className="flex gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{videoError}</span>
                  </div>
                )}

                <Button
                  onClick={handleVideoScan}
                  disabled={!videoFile || videoLoading}
                  size="lg"
                  className="w-full gap-2 bg-pink-600 hover:bg-pink-700 text-white font-bold tracking-wide dark:shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                >
                  {videoLoading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing Frames... This may take a while</>
                  ) : (
                    <><ShieldAlert className="w-5 h-5" /> ANALYZE VIDEO</>
                  )}
                </Button>

                {videoLoading && (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div 
                        className={cn(
                           "h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all duration-500",
                           videoProgress === 0 ? "animate-pulse w-2/3" : ""
                        )}
                        style={videoProgress > 0 ? { width: `${videoProgress}%` } : {}}
                      />
                    </div>
                    <p className="text-center text-xs">{videoStage || 'Extracting faces → running through CNN-BiLSTM model...'}</p>
                  </div>
                )}
              </Card>

              {videoResult && <ResultCard result={videoResult} type="video" />}

              {/* How it works */}
              <Card className="p-6 border-border bg-card/40 space-y-4">
                <h3 className="font-semibold text-foreground">How Video Detection Works</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
                  {[
                    { step: '01', title: 'Face Detection', desc: 'YOLOv8 locates faces in every frame.' },
                    { step: '02', title: 'CNN Encoding', desc: 'EfficientNet-B0 extracts spatial features per frame.' },
                    { step: '03', title: 'Temporal Modeling', desc: 'BiLSTM captures inconsistencies across the frame sequence.' },
                    { step: '04', title: 'Verdict', desc: 'Class probabilities are smoothed with EMA for a final score.' },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-3">
                      <span className="text-pink-400 font-mono font-bold text-sm">{step}</span>
                      <div>
                        <p className="font-semibold text-foreground">{title}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
