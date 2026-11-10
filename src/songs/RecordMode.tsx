import { useEffect, useRef, useState } from 'react'

interface RecordModeProps {
  title: string
  lyrics: string
  onClose: () => void
}

const SPEEDS = [0, 10, 20, 30, 45, 60, 80] // pixels per second; 0 = no auto-scroll

// Full-screen teleprompter for the booth: big text, optional auto-scroll,
// keeps the screen awake. Space = play/pause, Esc = exit.
export function RecordMode({ title, lyrics, onClose }: RecordModeProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [speedIndex, setSpeedIndex] = useState(2)
  const [playing, setPlaying] = useState(false)
  const [fontSize, setFontSize] = useState(34)

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let last = performance.now()
    let carry = 0 // sub-pixel remainder, since scrollTop rounds to whole pixels
    function step(now: number) {
      const el = scrollRef.current
      if (el) {
        carry += (SPEEDS[speedIndex] * (now - last)) / 1000
        const whole = Math.floor(carry)
        el.scrollTop += whole
        carry -= whole
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) setPlaying(false)
      }
      last = now
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [playing, speedIndex])

  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock?.request('screen').then((l) => (lock = l), () => {})
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      lock?.release()
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const btn = 'rounded-full border border-white/12 px-3 py-1.5 text-sm text-slate-300 transition hover:border-accent/60 hover:text-accent disabled:opacity-30'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950" role="dialog" aria-label="Recording mode">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6" onClick={() => setPlaying((p) => !p)}>
        <div className="mx-auto max-w-3xl py-[40vh]">
          <h2 className="mb-8 font-serif text-5xl italic text-slate-400">{title}</h2>
          <p className="whitespace-pre-wrap leading-relaxed text-slate-100" style={{ fontSize }}>
            {lyrics || 'No lyrics yet.'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-slate-900 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" className={btn} onClick={() => setPlaying((p) => !p)} disabled={SPEEDS[speedIndex] === 0}>
          {playing ? 'Pause' : 'Scroll'}
        </button>
        <button type="button" className={btn} onClick={() => setSpeedIndex((i) => Math.max(0, i - 1))} aria-label="Slower">
          Slower
        </button>
        <span className="w-14 text-center text-xs text-slate-500">speed {speedIndex}</span>
        <button
          type="button"
          className={btn}
          onClick={() => setSpeedIndex((i) => Math.min(SPEEDS.length - 1, i + 1))}
          aria-label="Faster"
        >
          Faster
        </button>
        <button type="button" className={btn} onClick={() => setFontSize((s) => Math.max(20, s - 4))} aria-label="Smaller text">
          A−
        </button>
        <button type="button" className={btn} onClick={() => setFontSize((s) => Math.min(64, s + 4))} aria-label="Bigger text">
          A+
        </button>
        <button type="button" className={btn} onClick={onClose}>
          Exit
        </button>
      </div>
    </div>
  )
}
