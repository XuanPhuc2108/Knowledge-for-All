export async function compressImage(
  file: Blob,
  maxDimension = 1600,
  quality = 0.82,
): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const pixels = bitmap.width * bitmap.height
    if (pixels > 40_000_000) {
      throw new Error('Image dimensions exceed the supported limit')
    }

    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context is unavailable')

    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error('Image encoding failed')),
        'image/webp',
        quality,
      )
    })

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Image encoding returned an invalid result'))
      reader.onerror = () => reject(reader.error ?? new Error('Image encoding failed'))
      reader.readAsDataURL(blob)
    })
  } finally {
    bitmap.close()
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
  return new Blob([array], { type: mime })
}
