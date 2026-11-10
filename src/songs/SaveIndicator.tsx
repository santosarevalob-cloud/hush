export type SaveStatus = 'idle' | 'saving' | 'saved'

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  return (
    <span className="text-xs text-slate-500">{status === 'saving' ? 'Saving…' : 'Saved'}</span>
  )
}
