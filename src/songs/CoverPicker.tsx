import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { searchPhotos } from '../lib/pexels'
import type { PexelsPhoto } from '../lib/pexels'
import { ImageCropper } from './ImageCropper'
import { useSongCover } from './useSongCover'

interface CoverPickerProps {
  songId: string
  userId: string | undefined
  onClose: () => void
  onSaved: (url: string) => void
}

type Tab = 'pexels' | 'upload'

const PHOTOS_PER_PAGE = 20
const MAX_SHUFFLE_PAGE = 25

export function CoverPicker({ songId, userId, onClose, onSaved }: CoverPickerProps) {
  const { uploadCover, uploading, error: uploadError } = useSongCover(songId, userId)
  const [tab, setTab] = useState<Tab>('pexels')
  const [query, setQuery] = useState('')
  const [photos, setPhotos] = useState<PexelsPhoto[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  async function runSearch(page: number) {
    setSearching(true)
    setSearchError(null)
    try {
      const result = await searchPhotos(query.trim(), page)
      setPhotos(result.photos)
      setTotalResults(result.totalResults)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    await runSearch(1)
  }

  function handleShuffle() {
    if (!query.trim()) return
    const maxPage = Math.max(1, Math.min(MAX_SHUFFLE_PAGE, Math.ceil(totalResults / PHOTOS_PER_PAGE)))
    const randomPage = maxPage <= 1 ? 1 : Math.floor(Math.random() * maxPage) + 1
    runSearch(randomPage)
  }

  function handleFileSelected(file: File) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setSelectedImageSrc(url)
  }

  async function handleCropConfirm(blob: Blob) {
    const url = await uploadCover(blob)
    if (url) onSaved(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl glass-strong border border-white/14 p-4 shadow-2xl shadow-black/50">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">
            {selectedImageSrc ? 'Crop cover' : 'Choose a cover'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-200">
            ✕
          </button>
        </div>

        {selectedImageSrc ? (
          <ImageCropper
            imageSrc={selectedImageSrc}
            onConfirm={handleCropConfirm}
            onCancel={() => setSelectedImageSrc(null)}
          />
        ) : (
          <>
            <div className="mb-3 flex gap-1 rounded-lg border border-white/12 p-1 text-sm">
              <button
                type="button"
                onClick={() => setTab('pexels')}
                className={`flex-1 rounded px-2 py-1 transition ${tab === 'pexels' ? 'bg-accent text-slate-950' : 'text-slate-300 hover:bg-white/10'}`}
              >
                Search Pexels
              </button>
              <button
                type="button"
                onClick={() => setTab('upload')}
                className={`flex-1 rounded px-2 py-1 transition ${tab === 'upload' ? 'bg-accent text-slate-950' : 'text-slate-300 hover:bg-white/10'}`}
              >
                Upload
              </button>
            </div>

            {tab === 'pexels' ? (
              <div>
                <form onSubmit={handleSearch} className="mb-3 flex gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search photos…"
                    className="flex-1 rounded-lg glass-input border border-white/12 px-3 py-2 text-slate-100 outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
                  />
                  <button
                    type="submit"
                    disabled={searching}
                    className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-slate-950 transition hover:brightness-110 disabled:opacity-60"
                  >
                    {searching ? 'Searching…' : 'Search'}
                  </button>
                  <button
                    type="button"
                    onClick={handleShuffle}
                    disabled={searching || photos.length === 0}
                    title="Show a different set of results for this search"
                    className="rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    🔀 Shuffle
                  </button>
                </form>
                {searchError && <p className="mb-2 text-sm text-red-400">{searchError}</p>}
                <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto">
                  {photos.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setSelectedImageSrc(photo.src.large2x)}
                      className="aspect-square overflow-hidden rounded-lg border border-white/12 transition hover:border-accent/60"
                    >
                      <img
                        src={photo.src.medium}
                        alt={`Photo by ${photo.photographer}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelected(file)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border border-dashed border-white/20 py-8 text-sm text-slate-400 transition hover:border-accent/60 hover:text-slate-200"
                >
                  Click to choose an image from your device
                </button>
              </div>
            )}
          </>
        )}

        {uploadError && <p className="mt-2 text-sm text-red-400">{uploadError}</p>}
        {uploading && <p className="mt-2 text-sm text-slate-400">Uploading…</p>}
      </div>
    </div>
  )
}
