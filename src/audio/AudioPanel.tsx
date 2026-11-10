import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { computePeaksForRange, decodeAudioFile, LoopPlayer, snapToZeroCrossing } from '../lib/audioEngine'
import { useDebouncedCallback } from '../hooks/useDebouncedCallback'
import type { SongAudio } from '../types/database'
import { useSongAudio } from './useSongAudio'
import { WaveformCanvas } from './WaveformCanvas'
import { VersionMenu } from './VersionMenu'

interface AudioPanelProps {
  songId: string
  onAudioUploaded?: (bpm: number) => void
}

export function AudioPanel({ songId, onAudioUploaded }: AudioPanelProps) {
  const { user } = useAuth()
  const {
    versions,
    current,
    loading,
    error,
    uploadVersion,
    updateCurrentSettings,
    restoreVersion,
    deleteVersion,
    downloadAudioBlob,
  } = useSongAudio(songId, user?.id)

  const audioContextRef = useRef<AudioContext | null>(null)
  const playerRef = useRef<LoopPlayer | null>(null)
  const rafRef = useRef<number | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement>(null)
  const previewUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [buffer, setBuffer] = useState<AudioBuffer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loopEnabled, setLoopEnabled] = useState(true)
  const [playheadTime, setPlayheadTime] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [viewStart, setViewStart] = useState(0)

  const [bpm, setBpm] = useState(120)
  const [bars, setBars] = useState(4)
  const [beatsPerBar, setBeatsPerBar] = useState(4)
  const [downbeat, setDownbeat] = useState(0)

  useEffect(() => {
    if (current) {
      setBpm(current.bpm)
      setBars(current.bars)
      setBeatsPerBar(current.beats_per_bar)
      setDownbeat(current.downbeat_offset_seconds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  function getAudioContext(): AudioContext {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    return audioContextRef.current
  }

  useEffect(() => {
    let cancelled = false

    async function loadBuffer() {
      stopPlayback()
      if (!current) {
        setBuffer(null)
        return
      }
      const blob = await downloadAudioBlob(current.storage_path)
      if (!blob || cancelled) return
      const arrayBuffer = await blob.arrayBuffer()
      const ctx = getAudioContext()
      const decoded = await decodeAudioFile(arrayBuffer, ctx)
      if (cancelled) return
      setBuffer(decoded)
      setZoomLevel(1)
      setViewStart(0)
      playerRef.current = new LoopPlayer(ctx, decoded)
    }

    loadBuffer()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.storage_path])

  useEffect(() => {
    return () => {
      stopPlayback()
      audioContextRef.current?.close()
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loopEnd = bpm > 0 ? downbeat + bars * beatsPerBar * (60 / bpm) : null

  const barLines = useMemo(() => {
    if (bpm <= 0) return []
    const secondsPerBar = beatsPerBar * (60 / bpm)
    const lines: number[] = []
    for (let i = 1; i < bars; i++) lines.push(downbeat + i * secondsPerBar)
    return lines
  }, [downbeat, bpm, bars, beatsPerBar])

  const duration = buffer?.duration ?? 0
  const viewDuration = zoomLevel > 0 ? duration / zoomLevel : duration
  const maxZoom = Math.max(1, Math.floor(duration / 2))

  const visiblePeaks = useMemo(() => {
    if (!buffer || viewDuration <= 0) return []
    return computePeaksForRange(buffer, viewStart, viewStart + viewDuration, 800)
  }, [buffer, viewStart, viewDuration])

  function setZoom(newZoomLevel: number) {
    if (!buffer) return
    const clampedZoom = Math.max(1, Math.min(maxZoom, newZoomLevel))
    const newViewDuration = duration / clampedZoom
    let newViewStart = downbeat - newViewDuration / 2
    newViewStart = Math.max(0, Math.min(newViewStart, duration - newViewDuration))
    setZoomLevel(clampedZoom)
    setViewStart(newViewStart)
  }

  function handlePan(newViewStart: number) {
    setViewStart(Math.max(0, Math.min(newViewStart, duration - viewDuration)))
  }

  // Always sends all three values: the timer keeps only the last call, so a
  // partial patch would drop an edit made to another field within 600ms.
  const debouncedSaveSettings = useDebouncedCallback(
    (patch: { bpm?: number; bars?: number; beatsPerBar?: number }) => {
      updateCurrentSettings(patch)
    },
    600,
  )

  function handleBpmChange(value: number) {
    setBpm(value)
    debouncedSaveSettings({ bpm: value, bars, beatsPerBar })
  }
  function handleBarsChange(value: number) {
    setBars(value)
    debouncedSaveSettings({ bpm, bars: value, beatsPerBar })
  }
  function handleBeatsPerBarChange(value: number) {
    setBeatsPerBar(value)
    debouncedSaveSettings({ bpm, bars, beatsPerBar: value })
  }

  function commitDownbeat(value: number) {
    const snapped = buffer ? snapToZeroCrossing(buffer, value) : value
    setDownbeat(snapped)
    updateCurrentSettings({ downbeatOffsetSeconds: snapped })
  }

  function stopPlayback() {
    playerRef.current?.stop()
    setIsPlaying(false)
    setPlayheadTime(null)
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  function handlePlay() {
    if (!buffer || !playerRef.current || loopEnd === null) return
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') ctx.resume()

    playerRef.current.play(downbeat, loopEnabled ? { start: downbeat, end: loopEnd } : null)
    setIsPlaying(true)

    function tick() {
      if (!playerRef.current?.playing) {
        setIsPlaying(false)
        setPlayheadTime(null)
        rafRef.current = null
        return
      }
      setPlayheadTime(playerRef.current.getCurrentTime())
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function handleMarkDownbeat() {
    if (!playerRef.current?.playing) return
    commitDownbeat(playerRef.current.getCurrentTime())
  }

  async function handleFileSelected(file: File) {
    setUploading(true)
    const effectiveBpm = current?.bpm ?? bpm
    await uploadVersion(file, {
      bpm: effectiveBpm,
      bars: current?.bars ?? bars,
      beatsPerBar: current?.beats_per_bar ?? beatsPerBar,
      downbeatOffsetSeconds: 0,
    })
    onAudioUploaded?.(effectiveBpm)
    setUploading(false)
  }

  async function handlePreview(version: SongAudio) {
    const blob = await downloadAudioBlob(version.storage_path)
    if (!blob || !previewAudioRef.current) return
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const url = URL.createObjectURL(blob)
    previewUrlRef.current = url
    previewAudioRef.current.src = url
    previewAudioRef.current.play()
  }

  async function handleDelete(version: SongAudio) {
    await deleteVersion(version.id)
  }

  if (loading) return <p className="text-slate-500">Loading audio…</p>

  return (
    <div className="rounded-2xl glass border border-white/10 p-4 shadow-lg shadow-black/20">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">Audio loop</span>
        <div className="flex items-center gap-2">
          <VersionMenu
            versions={versions}
            onPreview={handlePreview}
            onRestore={(v) => restoreVersion(v.id)}
            onDelete={handleDelete}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-white/12 bg-white/5 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : current ? 'Replace WAV' : 'Upload WAV'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,audio/wav"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelected(file)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      <audio ref={previewAudioRef} className="hidden" />

      {!current ? (
        <p className="text-sm text-slate-500">
          No audio yet. Upload a WAV to set a BPM and loop a section of it.
        </p>
      ) : (
        <div className="space-y-3">
          {buffer ? (
            <>
              <WaveformCanvas
                peaks={visiblePeaks}
                viewStart={viewStart}
                viewDuration={viewDuration}
                downbeatOffset={downbeat}
                loopEnd={loopEnd}
                barLines={barLines}
                playheadTime={playheadTime}
                onScrub={(t) => setDownbeat(buffer ? snapToZeroCrossing(buffer, t) : t)}
                onScrubEnd={() => commitDownbeat(downbeat)}
              />
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => setZoom(zoomLevel / 2)}
                  disabled={zoomLevel <= 1}
                  className="rounded border border-white/12 px-2 py-0.5 transition hover:bg-white/10 disabled:opacity-30"
                >
                  Zoom out
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(zoomLevel * 2)}
                  disabled={zoomLevel >= maxZoom}
                  className="rounded border border-white/12 px-2 py-0.5 transition hover:bg-white/10 disabled:opacity-30"
                >
                  Zoom in
                </button>
                <span>{zoomLevel === 1 ? 'Full song' : `${zoomLevel.toFixed(0)}×`}</span>
                {zoomLevel > 1 && (
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, duration - viewDuration)}
                    step={viewDuration / 200 || 0.01}
                    value={viewStart}
                    onChange={(e) => handlePan(Number(e.target.value))}
                    className="ml-1 flex-1"
                    aria-label="Scroll through song"
                  />
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Decoding audio…</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <label className="flex items-center gap-1">
              BPM
              <input
                type="number"
                min={1}
                value={bpm}
                onChange={(e) => handleBpmChange(Number(e.target.value) || 0)}
                className="w-20 rounded-lg glass-input border border-white/12 px-2 py-1 outline-none transition focus:border-accent/60"
              />
            </label>
            <label className="flex items-center gap-1">
              Bars
              <button
                type="button"
                onClick={() => handleBarsChange(Math.max(1, bars - 1))}
                className="rounded-lg glass-input border border-white/12 px-2 py-1 text-slate-300 transition hover:bg-white/10"
                aria-label="Fewer bars"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={bars}
                onChange={(e) => handleBarsChange(Number(e.target.value) || 1)}
                className="w-14 rounded-lg glass-input border border-white/12 px-2 py-1 text-center outline-none transition focus:border-accent/60"
              />
              <button
                type="button"
                onClick={() => handleBarsChange(bars + 1)}
                className="rounded-lg glass-input border border-white/12 px-2 py-1 text-slate-300 transition hover:bg-white/10"
                aria-label="More bars"
              >
                +
              </button>
            </label>
            <label className="flex items-center gap-1 text-slate-500">
              Beats/bar
              <input
                type="number"
                min={1}
                value={beatsPerBar}
                onChange={(e) => handleBeatsPerBarChange(Number(e.target.value) || 1)}
                className="w-16 rounded-lg glass-input border border-white/12 px-2 py-1 outline-none transition focus:border-accent/60"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={isPlaying ? stopPlayback : handlePlay}
              disabled={!buffer}
              className="rounded-lg bg-accent px-3 py-1.5 font-medium text-slate-950 transition hover:brightness-110 disabled:opacity-60"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <label className="flex items-center gap-1 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={loopEnabled}
                onChange={(e) => setLoopEnabled(e.target.checked)}
                className="accent-accent"
              />
              Loop
            </label>
            <button
              type="button"
              onClick={handleMarkDownbeat}
              disabled={!isPlaying}
              className="rounded-lg border border-white/12 px-2 py-1 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
            >
              Mark downbeat here
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Zoom in to see individual beats on longer files, then drag on the waveform to set the downbeat
            (or press Play and tap "Mark downbeat here" in time).
          </p>
        </div>
      )}
    </div>
  )
}
