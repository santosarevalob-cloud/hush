import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { PeakPair } from '../lib/audioEngine'

interface WaveformCanvasProps {
  peaks: PeakPair[]
  viewStart: number
  viewDuration: number
  downbeatOffset: number
  loopEnd: number | null
  barLines: number[]
  playheadTime: number | null
  onScrub: (seconds: number) => void
  onScrubEnd: () => void
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 120

export function WaveformCanvas({
  peaks,
  viewStart,
  viewDuration,
  downbeatOffset,
  loopEnd,
  barLines,
  playheadTime,
  onScrub,
  onScrubEnd,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || viewDuration <= 0) return

    const timeToX = (t: number) => ((t - viewStart) / viewDuration) * CANVAS_WIDTH
    const clampX = (x: number) => Math.max(0, Math.min(CANVAS_WIDTH, x))

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.fillStyle = '#0f1217'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    if (loopEnd !== null) {
      const startX = clampX(timeToX(downbeatOffset))
      const endX = clampX(timeToX(loopEnd))
      if (endX > startX) {
        ctx.fillStyle = 'rgba(123, 134, 255, 0.12)'
        ctx.fillRect(startX, 0, endX - startX, CANVAS_HEIGHT)
      }
    }

    const mid = CANVAS_HEIGHT / 2
    ctx.fillStyle = '#8a94a3'
    const barWidth = CANVAS_WIDTH / peaks.length
    peaks.forEach((peak, i) => {
      const x = i * barWidth
      const yTop = mid + peak.min * mid
      const yBottom = mid + peak.max * mid
      ctx.fillRect(x, Math.min(yTop, yBottom), Math.max(barWidth, 1), Math.max(Math.abs(yBottom - yTop), 1))
    })

    ctx.strokeStyle = 'rgba(217, 222, 230, 0.22)'
    ctx.lineWidth = 1
    barLines.forEach((t) => {
      const x = timeToX(t)
      if (x < 0 || x > CANVAS_WIDTH) return
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, CANVAS_HEIGHT)
      ctx.stroke()
    })

    const markerX = timeToX(downbeatOffset)
    if (markerX >= 0 && markerX <= CANVAS_WIDTH) {
      ctx.strokeStyle = '#7b86ff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(markerX, 0)
      ctx.lineTo(markerX, CANVAS_HEIGHT)
      ctx.stroke()
    }

    if (loopEnd !== null) {
      const endX = timeToX(loopEnd)
      if (endX >= 0 && endX <= CANVAS_WIDTH) {
        ctx.strokeStyle = 'rgba(123, 134, 255, 0.6)'
        ctx.beginPath()
        ctx.moveTo(endX, 0)
        ctx.lineTo(endX, CANVAS_HEIGHT)
        ctx.stroke()
      }
    }

    if (playheadTime !== null) {
      const x = timeToX(playheadTime)
      if (x >= 0 && x <= CANVAS_WIDTH) {
        ctx.strokeStyle = '#d9dee6'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, CANVAS_HEIGHT)
        ctx.stroke()
      }
    }
  }, [peaks, viewStart, viewDuration, downbeatOffset, loopEnd, barLines, playheadTime])

  function handlePointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (viewDuration <= 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    onScrub(viewStart + ratio * viewDuration)
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="h-[120px] w-full cursor-pointer touch-none rounded-xl border border-white/10"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        handlePointer(e)
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) handlePointer(e)
      }}
      onPointerUp={onScrubEnd}
    />
  )
}
