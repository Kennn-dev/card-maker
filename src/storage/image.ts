export class ImageDecodeError extends Error {
  constructor(message = 'Không đọc được ảnh') {
    super(message)
    this.name = 'ImageDecodeError'
  }
}

export function fitWithin(w: number, h: number, maxEdge = 1500): { w: number; h: number } {
  const long = Math.max(w, h)
  if (long <= maxEdge) return { w, h }
  const k = maxEdge / long
  return { w: Math.round(w * k), h: Math.round(h * k) }
}

export async function compressImage(file: Blob, maxEdge = 1500): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new ImageDecodeError()
  }
  try {
    const { w, h } = fitWithin(bitmap.width, bitmap.height, maxEdge)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ImageDecodeError()
    ctx.drawImage(bitmap, 0, 0, w, h)
    // Browsers without webp encoding fall back to the format they return (e.g. png).
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.92),
    )
    if (!blob) throw new ImageDecodeError()
    return blob
  } finally {
    bitmap.close?.()
  }
}
