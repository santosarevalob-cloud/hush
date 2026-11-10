import { useEffect, useRef } from 'react'

// Debounces calls, but never drops the last one: a pending call runs right away
// when the component unmounts (e.g. tapping "All songs") or the page is hidden
// (switching apps on iPhone, closing the tab).
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
) {
  const callbackRef = useRef(callback)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingArgsRef = useRef<Args | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    function flush() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = null
      const args = pendingArgsRef.current
      pendingArgsRef.current = null
      if (args) callbackRef.current(...args)
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  return (...args: Args) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    pendingArgsRef.current = args
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      pendingArgsRef.current = null
      callbackRef.current(...args)
    }, delayMs)
  }
}
