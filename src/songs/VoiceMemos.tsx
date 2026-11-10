import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { SongMemo } from '../types/database'

const BUCKET = 'song-memos'

// Safari records mp4/aac, Chrome/Firefox record webm/opus.
function pickMimeType(): string {
  for (const type of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

function formatSeconds(total: number): string {
  const s = Math.round(total)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function VoiceMemos({ songId, userId }: { songId: string; userId: string }) {
  const [memos, setMemos] = useState<SongMemo[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const startedAtRef = useRef(0)

  async function load() {
    const { data, error: err } = await supabase
      .from('song_memos')
      .select('*')
      .eq('song_id', songId)
      .order('created_at', { ascending: false })
    if (err) return setError(err.message)
    setMemos(data ?? [])
    if (data && data.length > 0) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(
        data.map((m) => m.storage_path),
        60 * 60,
      )
      setUrls(Object.fromEntries((signed ?? []).map((s) => [s.path, s.signedUrl])))
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId])

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => setElapsed((Date.now() - startedAtRef.current) / 1000), 250)
    return () => clearInterval(timer)
  }, [recording])

  // Stop the mic if you leave the page mid-recording.
  useEffect(() => () => recorderRef.current?.stream.getTracks().forEach((t) => t.stop()), [])

  async function start() {
    setError(null)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return setError('Microphone access was blocked. Allow it in your browser settings.')
    }
    const mimeType = pickMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      save(new Blob(chunks, { type: recorder.mimeType }), (Date.now() - startedAtRef.current) / 1000)
    }
    recorderRef.current = recorder
    startedAtRef.current = Date.now()
    setElapsed(0)
    recorder.start()
    setRecording(true)
  }

  function stop() {
    recorderRef.current?.stop()
    setRecording(false)
  }

  async function save(blob: Blob, duration: number) {
    setBusy(true)
    const id = crypto.randomUUID()
    const ext = blob.type.includes('mp4') ? 'm4a' : 'webm'
    const path = `${userId}/${songId}/${id}.${ext}`
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type })
    if (uploadErr) {
      setBusy(false)
      return setError(`Memo not saved: ${uploadErr.message}`)
    }
    const { error: insertErr } = await supabase
      .from('song_memos')
      .insert({ id, song_id: songId, storage_path: path, duration_seconds: duration })
    if (insertErr) {
      await supabase.storage.from(BUCKET).remove([path])
      setBusy(false)
      return setError(`Memo not saved: ${insertErr.message}`)
    }
    await load()
    setBusy(false)
  }

  async function remove(memo: SongMemo) {
    if (!window.confirm("Delete this voice memo? This can't be undone.")) return
    const { error: err } = await supabase.from('song_memos').delete().eq('id', memo.id)
    if (err) return setError(err.message)
    await supabase.storage.from(BUCKET).remove([memo.storage_path])
    setMemos((prev) => prev.filter((m) => m.id !== memo.id))
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">Voice memos</span>
        <button
          type="button"
          onClick={recording ? stop : start}
          disabled={busy}
          className={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-50 ${
            recording
              ? 'border-red-400/60 text-red-300'
              : 'border-white/12 text-slate-300 hover:border-accent/60 hover:text-accent'
          }`}
        >
          {recording ? `Stop ${formatSeconds(elapsed)}` : busy ? 'Saving…' : 'Record'}
        </button>
      </div>
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
      <ul className="space-y-2">
        {memos.map((memo, i) => (
          <li key={memo.id}>
            <div className="mb-0.5 flex justify-between text-xs text-slate-500">
              <span>
                Memo {memos.length - i} · {formatSeconds(memo.duration_seconds)}
              </span>
              <button type="button" onClick={() => remove(memo)} className="hover:text-red-400">
                Delete
              </button>
            </div>
            {urls[memo.storage_path] && (
              <audio controls preload="none" src={urls[memo.storage_path]} className="h-8 w-full" />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
