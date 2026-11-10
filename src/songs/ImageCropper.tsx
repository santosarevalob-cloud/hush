import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { COVER_OUTPUT_SIZE, getCroppedImageBlob, isUpscaled } from '../lib/imageCrop'

interface ImageCropperProps {
  imageSrc: string
  onConfirm: (blob: Blob) => void | Promise<void>
  onCancel: () => void
}

export function ImageCropper({ imageSrc, onConfirm, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleConfirm() {
    if (!croppedAreaPixels) return
    setSaving(true)
    setError(null)
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels)
      await onConfirm(blob)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process the image')
    } finally {
      setSaving(false)
    }
  }

  const upscaled = croppedAreaPixels ? isUpscaled(croppedAreaPixels) : false

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-80 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="rect"
          showGrid
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
        />
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={0.05}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        className="w-full"
        aria-label="Zoom"
      />
      {upscaled && (
        <p className="text-xs text-amber-400">
          This image is smaller than {COVER_OUTPUT_SIZE}×{COVER_OUTPUT_SIZE} at the selected crop, so the
          result will be upscaled and may look a little soft.
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/14 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!croppedAreaPixels || saving}
          className="rounded-lg bg-fuchsia-500 px-3 py-1.5 text-sm font-medium text-slate-950 shadow-lg shadow-fuchsia-500/25 transition hover:bg-fuchsia-400 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Use this crop'}
        </button>
      </div>
    </div>
  )
}
