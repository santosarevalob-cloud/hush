import type { Song } from '../types/database'

interface SongCardProps {
  song: Song
  tagNames: string[]
  onClick: () => void
}

export function SongCard({ song, tagNames, onClick }: SongCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl glass border border-white/10 text-left shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-fuchsia-400/50 hover:shadow-xl hover:shadow-fuchsia-500/10"
    >
      <div className="aspect-square w-full bg-white/5">
        {song.cover_image_url ? (
          <img src={song.cover_image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-500">
            <svg
              viewBox="0 0 24 24"
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="truncate font-medium text-slate-100">{song.title || 'Untitled'}</div>
        <div className="text-xs text-slate-400">{song.status}</div>
        {tagNames.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tagNames.slice(0, 3).map((name) => (
              <span
                key={name}
                className="rounded-full border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}
