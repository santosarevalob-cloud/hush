export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const LABELS: Record<Exclude<SaveStatus, 'idle'>, string> = {
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Not saved, retrying…',
}

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  return (
    <span className={`text-xs ${status === 'error' ? 'text-red-400' : 'text-slate-500'}`}>{LABELS[status]}</span>
  )
}
