export async function compressImage(
  file: Blob,
  maxWidth = 1400,
  quality = 0.82,
): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Không thể nén ảnh')

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const mimeType = canvas.toDataURL('image/webp').startsWith('data:image/webp')
    ? 'image/webp'
    : 'image/jpeg'

  return canvas.toDataURL(mimeType, quality)
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
  return new Blob([array], { type: mime })
}
