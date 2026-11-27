export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface BrushPoint {
  x: number
  y: number
}

export interface BlurStroke {
  points: BrushPoint[]
  radius: number
}

export interface ImageEditState {
  crop: CropRect
  brightness: number
  contrast: number
  strokes: BlurStroke[]
  brushSize: number
  blurStrength: number
}

export interface ImageEditHistory {
  past: ImageEditState[]
  future: ImageEditState[]
}

export const MAX_IMAGE_EDIT_HISTORY = 15
export const MAX_IMAGE_EDIT_POINTS_PER_STROKE = 240
export const MAX_IMAGE_EDIT_STROKES = 80
export const MAX_IMAGE_EDIT_DIMENSION = 1440
const EXPORTED_IMAGE_TYPES = new Set(['image/webp', 'image/jpeg', 'image/png'])

export function validateEditedImageBlob(blob: Blob): Blob {
  if (!blob.size || !EXPORTED_IMAGE_TYPES.has(blob.type)) {
    throw new Error('Không thể xuất ảnh đã chỉnh sửa. Hãy thử lại hoặc chọn ảnh khác.')
  }
  return blob
}

export const ORIGINAL_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 }

export function createInitialImageEditState(): ImageEditState {
  return {
    crop: ORIGINAL_CROP,
    brightness: 100,
    contrast: 100,
    strokes: [],
    brushSize: 44,
    blurStrength: 12,
  }
}

export function adjustImageChannel(value: number, brightness: number, contrast: number): number {
  const contrastAmount = (contrast / 100 - 1) * 255
  const factor = (259 * (contrastAmount + 255)) / (255 * (259 - contrastAmount))
  const brightened = value * (brightness / 100)
  return Math.max(0, Math.min(255, factor * (brightened - 128) + 128))
}

export function getCropFromDrag(
  currentCrop: CropRect,
  start: BrushPoint,
  end: BrushPoint,
  sourceAspect: number,
  targetAspect: number | null,
): CropRect | null {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const directionX = Math.sign(deltaX) || 1
  const directionY = Math.sign(deltaY) || 1
  const maxWidth = directionX > 0 ? 1 - start.x : start.x
  const maxHeight = directionY > 0 ? 1 - start.y : start.y
  let width = Math.min(Math.abs(deltaX), maxWidth)
  let height = Math.min(Math.abs(deltaY), maxHeight)

  if (targetAspect && Number.isFinite(sourceAspect) && sourceAspect > 0) {
    const normalizedAspect = targetAspect / sourceAspect
    if (width > height * normalizedAspect) width = height * normalizedAspect
    else height = width / normalizedAspect
  }

  if (width < 0.02 || height < 0.02) return null
  const localX = directionX > 0 ? start.x : start.x - width
  const localY = directionY > 0 ? start.y : start.y - height

  return {
    x: currentCrop.x + localX * currentCrop.width,
    y: currentCrop.y + localY * currentCrop.height,
    width: width * currentCrop.width,
    height: height * currentCrop.height,
  }
}

export function getCropPixelBounds(
  crop: CropRect,
  imageWidth: number,
  imageHeight: number,
) {
  const left = Math.max(0, Math.min(imageWidth - 1, Math.floor(crop.x * imageWidth)))
  const top = Math.max(0, Math.min(imageHeight - 1, Math.floor(crop.y * imageHeight)))
  const right = Math.max(left + 1, Math.min(imageWidth, Math.ceil((crop.x + crop.width) * imageWidth)))
  const bottom = Math.max(top + 1, Math.min(imageHeight, Math.ceil((crop.y + crop.height) * imageHeight)))
  return { left, top, width: right - left, height: bottom - top }
}

export function pushImageEditHistory(
  history: ImageEditHistory,
  current: ImageEditState,
): ImageEditHistory {
  return {
    past: [...history.past, current].slice(-MAX_IMAGE_EDIT_HISTORY),
    future: [],
  }
}

export function undoImageEdit(
  history: ImageEditHistory,
  current: ImageEditState,
): { history: ImageEditHistory; state: ImageEditState } | null {
  const previous = history.past.at(-1)
  if (!previous) return null
  return {
    history: {
      past: history.past.slice(0, -1),
      future: [current, ...history.future].slice(0, MAX_IMAGE_EDIT_HISTORY),
    },
    state: previous,
  }
}

export function redoImageEdit(
  history: ImageEditHistory,
  current: ImageEditState,
): { history: ImageEditHistory; state: ImageEditState } | null {
  const next = history.future[0]
  if (!next) return null
  return {
    history: {
      past: [...history.past, current].slice(-MAX_IMAGE_EDIT_HISTORY),
      future: history.future.slice(1),
    },
    state: next,
  }
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export function drawBookImagePreview(
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  state: ImageEditState,
): HTMLCanvasElement {
  const crop = getCropPixelBounds(state.crop, imageWidth, imageHeight)
  const scale = Math.min(
    1,
    MAX_IMAGE_EDIT_DIMENSION / Math.max(crop.width, crop.height),
  )
  const width = Math.max(1, Math.round(crop.width * scale))
  const height = Math.max(1, Math.round(crop.height * scale))
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context is unavailable')

  const drawAdjustedImage = () => {
    context.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%)`
    context.drawImage(
      image,
      crop.left,
      crop.top,
      crop.width,
      crop.height,
      0,
      0,
      width,
      height,
    )
    context.filter = 'none'
  }

  const filterDescriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(context),
    'filter',
  )
  if (typeof filterDescriptor?.set === 'function') {
    drawAdjustedImage()
  } else {
    context.drawImage(
      image,
      crop.left,
      crop.top,
      crop.width,
      crop.height,
      0,
      0,
      width,
      height,
    )
    if (state.brightness !== 100 || state.contrast !== 100) {
      const pixels = context.getImageData(0, 0, width, height)
      for (let index = 0; index < pixels.data.length; index += 4) {
        for (let channel = 0; channel < 3; channel += 1) {
          pixels.data[index + channel] = adjustImageChannel(
            pixels.data[index + channel],
            state.brightness,
            state.contrast,
          )
        }
      }
      context.putImageData(pixels, 0, 0)
    }
  }

  if (state.strokes.length > 0) {
    const mask = createCanvas(width, height)
    const maskContext = mask.getContext('2d')
    const blurCanvas = createCanvas(width, height)
    const blurContext = blurCanvas.getContext('2d')
    if (!maskContext || !blurContext) throw new Error('Canvas 2D context is unavailable')

    maskContext.strokeStyle = '#fff'
    maskContext.fillStyle = '#fff'
    maskContext.lineCap = 'round'
    maskContext.lineJoin = 'round'
    for (const stroke of state.strokes) {
      const radius = Math.max(1, (stroke.radius / state.crop.width) * width)
      maskContext.lineWidth = radius * 2
      maskContext.shadowColor = '#fff'
      maskContext.shadowBlur = radius * 0.28
      const points = stroke.points
        .map((point) => ({
          x: ((point.x - state.crop.x) / state.crop.width) * width,
          y: ((point.y - state.crop.y) / state.crop.height) * height,
        }))
        .filter((point) => point.x >= -radius && point.x <= width + radius && point.y >= -radius && point.y <= height + radius)
      if (points.length === 0) continue
      if (points.length === 1) {
        maskContext.beginPath()
        maskContext.arc(points[0].x, points[0].y, radius, 0, Math.PI * 2)
        maskContext.fill()
        continue
      }
      maskContext.beginPath()
      maskContext.moveTo(points[0].x, points[0].y)
      for (const point of points.slice(1)) maskContext.lineTo(point.x, point.y)
      maskContext.stroke()
    }

    blurContext.filter = `blur(${Math.max(1, state.blurStrength)}px)`
    blurContext.drawImage(canvas, 0, 0)
    blurContext.filter = 'none'
    blurContext.globalCompositeOperation = 'destination-in'
    blurContext.drawImage(mask, 0, 0)
    context.drawImage(blurCanvas, 0, 0)
    mask.width = 0
    mask.height = 0
    blurCanvas.width = 0
    blurCanvas.height = 0
  }

  return canvas
}

export async function renderBookImage(
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  state: ImageEditState,
): Promise<Blob> {
  const canvas = drawBookImagePreview(image, imageWidth, imageHeight, state)
  let blob: Blob | null = null
  try {
    if (typeof canvas.toBlob === 'function') {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/webp', 0.88)
      })
    }
    if (!blob) {
      const dataUrl = canvas.toDataURL('image/webp', 0.88)
      const match = /^data:(image\/(?:webp|jpeg|png));base64,([\s\S]+)$/i.exec(dataUrl)
      if (!match) throw new Error('Image export returned an invalid data URL')
      const binary = atob(match[2])
      const bytes = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
      blob = new Blob([bytes], { type: match[1].toLowerCase() })
    }
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
  return validateEditedImageBlob(blob)
}
