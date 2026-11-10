export interface CropPixels {
  x: number
  y: number
  width: number
  height: number
}

export const COVER_OUTPUT_SIZE = 3000

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = src
  })
}

/** Renders the selected crop region onto a fixed-size square canvas and exports it as a JPEG blob. */
export async function getCroppedImageBlob(
  imageSrc: string,
  cropPixels: CropPixels,
  outputSize = COVER_OUTPUT_SIZE,
): Promise<Blob> {
  const image = await loadImage(imageSrc)

  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create a canvas context')

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputSize,
    outputSize,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not export the cropped image'))
      },
      'image/jpeg',
      0.9,
    )
  })
}

/** True if the crop's source resolution is below the output size (the result will be upscaled). */
export function isUpscaled(cropPixels: CropPixels, outputSize = COVER_OUTPUT_SIZE): boolean {
  return cropPixels.width < outputSize || cropPixels.height < outputSize
}
