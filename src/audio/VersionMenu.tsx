import { useState } from 'react'
import type { SongAudio } from '../types/database'

interface VersionMenuProps {
  versions: SongAudio[]
  onPreview: (version: SongAudio) => void
  onRestore: (version: SongAudio) => void
  onDelete: (version: SongAudio) => void
}

export function VersionMenu({ versions, onPreview, onRestore, onDelete }: VersionMenuProps) {
  const [open, setOpen] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  if (versions.length === 0) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-white/14 bg-white/10 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/15"
      >
        🕐 {versions.length}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl glass-solid border border-white/14 p-2 shadow-2xl shadow-black/50">
            <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Versions
            </div>
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {versions.map((version) => (
                <li
                  key={version.id}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white/10"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-slate-200">
                      v{version.version_number}
                      {version.is_current && (
                        <span className="ml-1 text-xs text-fuchsia-400">(current)</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(version.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => onPreview(version)}
                      className="rounded border border-white/12 px-1.5 py-0.5 text-slate-300 transition hover:bg-white/10"
                    >
                      ▶
                    </button>
                    {!version.is_current && (
                      <button
                        type="button"
                        onClick={() => onRestore(version)}
                        className="rounded border border-white/12 px-1.5 py-0.5 text-slate-300 transition hover:bg-white/10"
                      >
                        Restore
                      </button>
                    )}
                    {confirmingId === version.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(version)
                            setConfirmingId(null)
                          }}
                          className="rounded border border-red-400/60 px-1.5 py-0.5 text-red-400 transition hover:bg-red-500/20"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="rounded border border-white/12 px-1.5 py-0.5 text-slate-300 transition hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(version.id)}
                        className="rounded border border-white/12 px-1.5 py-0.5 text-slate-400 transition hover:bg-red-500/20 hover:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
