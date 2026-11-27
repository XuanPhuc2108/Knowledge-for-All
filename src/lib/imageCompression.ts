interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  dispose: () => void
}

async function decodeImage(file: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      }
    } catch {
      // Fall back to the browser's image decoder for older mobile WebViews and unsupported bitmap formats.
    }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Image format is not supported by this browser'))
      element.src = objectUrl
    })
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(objectUrl),
    }
  } catch (cause) {
    URL.revokeObjectURL(objectUrl)
    throw cause
  }
}

export async function compressImage(
  file: Blob,
  maxDimension = 1600,
  quality = 0.82,
): Promise<string> {
  const decoded = await decodeImage(file)
  let canvas: HTMLCanvasElement | null = null
  try {
    const pixels = decoded.width * decoded.height
    if (pixels > 40_000_000) {
      throw new Error('Image dimensions exceed the supported limit')
    }

    const scale = Math.min(1, maxDimension / Math.max(decoded.width, decoded.height))
    const width = Math.round(decoded.width * scale)
    const height = Math.round(decoded.height * scale)

    canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context is unavailable')

    ctx.drawImage(decoded.source, 0, 0, width, height)
    const blob = await canvasToBlob(canvas, 'image/webp', quality)

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Image encoding returned an invalid result'))
      reader.onerror = () => reject(reader.error ?? new Error('Image encoding failed'))
      reader.readAsDataURL(blob)
    })
  } finally {
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
    decoded.dispose()
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  if (typeof canvas.toBlob === 'function') {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error('Image encoding failed')),
        type,
        quality,
      )
    })
  }

  try {
    const dataUrl = canvas.toDataURL(type, quality)
    const match = /^data:([^;,]+);base64,([\s\S]+)$/i.exec(dataUrl)
    if (!match) return Promise.reject(new Error('Image encoding returned an invalid result'))
    const binary = atob(match[2])
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return Promise.resolve(new Blob([bytes], { type: match[1] }))
  } catch (cause) {
    return Promise.reject(cause)
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:(image\/(?:webp|jpeg|png));base64,([\s\S]+)$/i.exec(dataUrl)
  if (!match) throw new Error('Ảnh đã chọn không hợp lệ. Hãy chọn lại ảnh nha.')
  const mime = match[1].toLowerCase()
  let binary: string
  try {
    binary = atob(match[2].replace(/\s/g, ''))
  } catch {
    throw new Error('Ảnh đã chọn không hợp lệ. Hãy chọn lại ảnh nha.')
  }
  if (!binary.length) throw new Error('Ảnh đã chọn không hợp lệ. Hãy chọn lại ảnh nha.')
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
  return new Blob([array], { type: mime })
}
