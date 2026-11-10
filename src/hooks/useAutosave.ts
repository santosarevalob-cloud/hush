import { useEffect, useRef, useState } from 'react'
import { useDebouncedCallback } from './useDebouncedCallback'
import type { SaveStatus } from '../songs/SaveIndicator'

const RETRY_MS = 5000

// Debounced save with a status badge. A failed save (e.g. no signal) keeps
// retrying the latest value every 5s, and closing the tab while unsaved asks first.
export function useAutosave<T>(save: (value: T) => Promise<boolean>, delayMs: number) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const latestRef = useRef<{ value: T } | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unsavedRef = useRef(false)

  async function run() {
    const pending = latestRef.current
    if (!pending) return
    const ok = await save(pending.value)
    if (latestRef.current !== pending) return // a newer edit is queued; its save reports status
    if (ok) {
      unsavedRef.current = false
      setStatus('saved')
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1500)
    } else {
      setStatus('error')
      retryRef.current = setTimeout(run, RETRY_MS)
    }
  }

  const debouncedRun = useDebouncedCallback(run, delayMs)

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (unsavedRef.current) event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  function queue(value: T) {
    if (retryRef.current) clearTimeout(retryRef.current)
    latestRef.current = { value }
    unsavedRef.current = true
    setStatus('saving')
    debouncedRun()
  }

  return { status, queue }
}
