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
  rotation: number
  zoom: number
  fitMode: 'smart' | 'fill' | 'contain' | 'original'
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

export function getRotatedImageDimensions(imageWidth: number, imageHeight: number, rotation: number) {
  if (
    !Number.isFinite(imageWidth) || imageWidth <= 0
    || !Number.isFinite(imageHeight) || imageHeight <= 0
    || !Number.isFinite(rotation)
  ) {
    throw new Error('Ảnh không hợp lệ để tính góc xoay.')
  }
  const radians = (rotation * Math.PI) / 180
  const normalize = (value: number) => (
    value < 1e-10 ? 0 : Math.abs(value - 1) < 1e-10 ? 1 : value
  )
  const cosine = normalize(Math.abs(Math.cos(radians)))
  const sine = normalize(Math.abs(Math.sin(radians)))
  return {
    width: Math.max(1, Math.ceil(imageWidth * cosine + imageHeight * sine)),
    height: Math.max(1, Math.ceil(imageWidth * sine + imageHeight * cosine)),
  }
}

export function transformPointForRotation(
  point: BrushPoint,
  imageWidth: number,
  imageHeight: number,
  fromRotation: number,
  toRotation: number,
): BrushPoint {
  const from = getRotatedImageDimensions(imageWidth, imageHeight, fromRotation)
  const to = getRotatedImageDimensions(imageWidth, imageHeight, toRotation)
  const fromRadians = (fromRotation * Math.PI) / 180
  const toRadians = (toRotation * Math.PI) / 180
  const fromX = point.x * from.width - from.width / 2
  const fromY = point.y * from.height - from.height / 2
  const sourceX = Math.cos(fromRadians) * fromX + Math.sin(fromRadians) * fromY
  const sourceY = -Math.sin(fromRadians) * fromX + Math.cos(fromRadians) * fromY
  const rotatedX = Math.cos(toRadians) * sourceX - Math.sin(toRadians) * sourceY + to.width / 2
  const rotatedY = Math.sin(toRadians) * sourceX + Math.cos(toRadians) * sourceY + to.height / 2
  return { x: rotatedX / to.width, y: rotatedY / to.height }
}

export function getVisibleImageCrop(
  crop: CropRect,
  imageWidth: number,
  imageHeight: number,
  rotation: number,
  zoom = 1,
  cover = true,
): CropRect {
  if (!Number.isFinite(zoom) || zoom < 1 || zoom > 3) {
    throw new Error('Mức thu phóng ảnh không hợp lệ.')
  }
  const rotated = getRotatedImageDimensions(imageWidth, imageHeight, rotation)
  const pixelCrop = getCropPixelBounds(crop, rotated.width, rotated.height)
  const centerX = pixelCrop.left + pixelCrop.width / 2
  const centerY = pixelCrop.top + pixelCrop.height / 2
  const angle = (rotation * Math.PI) / 180
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const corners = [
    [pixelCrop.left, pixelCrop.top],
    [pixelCrop.left + pixelCrop.width, pixelCrop.top],
    [pixelCrop.left, pixelCrop.top + pixelCrop.height],
    [pixelCrop.left + pixelCrop.width, pixelCrop.top + pixelCrop.height],
  ].map(([x, y]) => {
    const relativeX = x - rotated.width / 2
    const relativeY = y - rotated.height / 2
    return {
      x: imageWidth / 2 + cosine * relativeX + sine * relativeY,
      y: imageHeight / 2 - sine * relativeX + cosine * relativeY,
    }
  })

  const fits = (scale: number) => corners.every((point) => {
    const x = imageWidth / 2 + (point.x - imageWidth / 2) / scale
    const y = imageHeight / 2 + (point.y - imageHeight / 2) / scale
    return x >= -0.5 && x <= imageWidth + 0.5 && y >= -0.5 && y <= imageHeight + 0.5
  })
  let fillZoom = 1
  if (cover) {
    let low = 1
    let high = 1
    while (high < 32 && !fits(high)) high *= 2
    if (!fits(high)) high = 32
    for (let iteration = 0; iteration < 24; iteration += 1) {
      const middle = (low + high) / 2
      if (fits(middle)) high = middle
      else low = middle
    }
    fillZoom = high
  }
  const scale = fillZoom * zoom
  const width = pixelCrop.width / scale
  const height = pixelCrop.height / scale
  return {
    x: (centerX - width / 2) / rotated.width,
    y: (centerY - height / 2) / rotated.height,
    width: width / rotated.width,
    height: height / rotated.height,
  }
}

export function getCenteredAspectCrop(
  imageWidth: number,
  imageHeight: number,
  targetAspect = 3 / 4,
): CropRect {
  if (
    !Number.isFinite(imageWidth) || imageWidth <= 0
    || !Number.isFinite(imageHeight) || imageHeight <= 0
    || !Number.isFinite(targetAspect) || targetAspect <= 0
  ) {
    throw new Error('Ảnh không hợp lệ để tự căn khung.')
  }

  const imageAspect = imageWidth / imageHeight
  if (imageAspect > targetAspect) {
    const width = targetAspect / imageAspect
    return { x: (1 - width) / 2, y: 0, width, height: 1 }
  }

  const height = imageAspect / targetAspect
  return { x: 0, y: (1 - height) / 2, width: 1, height }
}

export function getConservativeContentCrop(
  pixels: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  targetAspect = 3 / 4,
): CropRect | null {
  if (
    imageWidth < 8 || imageHeight < 8
    || pixels.length !== imageWidth * imageHeight * 4
    || !Number.isFinite(targetAspect) || targetAspect <= 0
  ) return null

  const patchSize = Math.max(2, Math.floor(Math.min(imageWidth, imageHeight) / 24))
  const cornerColors: number[][] = []
  for (const [originX, originY] of [
    [0, 0],
    [imageWidth - patchSize, 0],
    [0, imageHeight - patchSize],
    [imageWidth - patchSize, imageHeight - patchSize],
  ]) {
    const color = [0, 0, 0, 0]
    for (let y = originY; y < originY + patchSize; y += 1) {
      for (let x = originX; x < originX + patchSize; x += 1) {
        const offset = (y * imageWidth + x) * 4
        for (let channel = 0; channel < 4; channel += 1) color[channel] += pixels[offset + channel]
      }
    }
    const sampleCount = patchSize * patchSize
    cornerColors.push(color.map((channel) => channel / sampleCount))
  }
  const backgroundsAgree = cornerColors.every((color) => cornerColors.every((other) => (
    Math.hypot(
      color[0] - other[0],
      color[1] - other[1],
      color[2] - other[2],
      (color[3] - other[3]) * 0.5,
    ) <= 36
  )))
  if (!backgroundsAgree) return null

  const background = cornerColors.reduce(
    (sum, color) => sum.map((channel, index) => channel + color[index] / cornerColors.length),
    [0, 0, 0, 0],
  )
  const rowForeground = new Uint32Array(imageHeight)
  const columnForeground = new Uint32Array(imageWidth)
  for (let y = 0; y < imageHeight; y += 1) {
    for (let x = 0; x < imageWidth; x += 1) {
      const offset = (y * imageWidth + x) * 4
      const difference = Math.hypot(
        pixels[offset] - background[0],
        pixels[offset + 1] - background[1],
        pixels[offset + 2] - background[2],
        (pixels[offset + 3] - background[3]) * 0.5,
      )
      if (difference > 48) {
        rowForeground[y] += 1
        columnForeground[x] += 1
      }
    }
  }

  const rowThreshold = Math.max(2, imageWidth * 0.025)
  const columnThreshold = Math.max(2, imageHeight * 0.025)
  const firstRow = rowForeground.findIndex((count) => count >= rowThreshold)
  const lastRow = imageHeight - 1 - [...rowForeground].reverse().findIndex((count) => count >= rowThreshold)
  const firstColumn = columnForeground.findIndex((count) => count >= columnThreshold)
  const lastColumn = imageWidth - 1 - [...columnForeground].reverse().findIndex((count) => count >= columnThreshold)
  if (firstRow < 0 || firstColumn < 0 || lastRow < firstRow || lastColumn < firstColumn) return null

  const contentWidth = lastColumn - firstColumn + 1
  const contentHeight = lastRow - firstRow + 1
  const margins = [
    firstColumn / imageWidth,
    (imageWidth - lastColumn - 1) / imageWidth,
    firstRow / imageHeight,
    (imageHeight - lastRow - 1) / imageHeight,
  ]
  if (
    contentWidth < imageWidth * 0.18
    || contentHeight < imageHeight * 0.25
    || margins.filter((margin) => margin >= 0.06).length < 2
  ) return null

  const padding = Math.max(2, Math.round(Math.min(contentWidth, contentHeight) * 0.035))
  const requiredWidth = contentWidth + padding * 2
  const requiredHeight = contentHeight + padding * 2
  let cropWidth = requiredWidth
  let cropHeight = requiredHeight
  if (cropWidth / cropHeight > targetAspect) cropHeight = cropWidth / targetAspect
  else cropWidth = cropHeight * targetAspect
  if (cropWidth > imageWidth || cropHeight > imageHeight) return null

  const centerX = (firstColumn + lastColumn + 1) / 2
  const centerY = (firstRow + lastRow + 1) / 2
  const left = Math.max(0, Math.min(imageWidth - cropWidth, centerX - cropWidth / 2))
  const top = Math.max(0, Math.min(imageHeight - cropHeight, centerY - cropHeight / 2))
  return {
    x: left / imageWidth,
    y: top / imageHeight,
    width: cropWidth / imageWidth,
    height: cropHeight / imageHeight,
  }
}

export function getSmartAspectCrop(
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  rotation = 0,
  targetAspect = 3 / 4,
): CropRect {
  const rotated = getRotatedImageDimensions(imageWidth, imageHeight, rotation)
  const sampleScale = Math.min(1, 256 / Math.max(rotated.width, rotated.height))
  const width = Math.max(1, Math.round(rotated.width * sampleScale))
  const height = Math.max(1, Math.round(rotated.height * sampleScale))
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context is unavailable')
  try {
    context.translate(width / 2, height / 2)
    context.scale(sampleScale, sampleScale)
    context.rotate((rotation * Math.PI) / 180)
    context.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight)
    const pixels = context.getImageData(0, 0, width, height).data
    return getConservativeContentCrop(pixels, width, height, targetAspect)
      ?? getCenteredAspectCrop(rotated.width, rotated.height, targetAspect)
  } catch (cause) {
    console.warn('Smart book-cover crop could not inspect source pixels; using a centered crop', cause)
    return getCenteredAspectCrop(rotated.width, rotated.height, targetAspect)
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

export function createInitialImageEditState(): ImageEditState {
  return {
    crop: ORIGINAL_CROP,
    rotation: 0,
    zoom: 1,
    fitMode: 'smart',
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

function drawRotatedImage(
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  rotation: number,
): HTMLCanvasElement {
  const bounds = getRotatedImageDimensions(imageWidth, imageHeight, rotation)
  const scale = Math.min(1, MAX_IMAGE_EDIT_DIMENSION / Math.max(bounds.width, bounds.height))
  const canvas = createCanvas(Math.max(1, Math.round(bounds.width * scale)), Math.max(1, Math.round(bounds.height * scale)))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context is unavailable')
  context.translate(canvas.width / 2, canvas.height / 2)
  context.scale(scale, scale)
  context.rotate((rotation * Math.PI) / 180)
  context.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight)
  return canvas
}

export function drawBookImagePreview(
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  state: ImageEditState,
): HTMLCanvasElement {
  const rotatedImage = drawRotatedImage(image, imageWidth, imageHeight, state.rotation)
  const visibleCrop = getVisibleImageCrop(
    state.crop,
    imageWidth,
    imageHeight,
    state.rotation,
    state.zoom,
    state.fitMode !== 'contain' && state.fitMode !== 'original',
  )
  const crop = getCropPixelBounds(visibleCrop, rotatedImage.width, rotatedImage.height)
  const outputScale = Math.min(1, MAX_IMAGE_EDIT_DIMENSION / Math.max(crop.width, crop.height))
  const width = Math.max(1, Math.round(crop.width * outputScale))
  const height = Math.max(1, Math.round(crop.height * outputScale))
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  if (!context) {
    rotatedImage.width = 0
    rotatedImage.height = 0
    throw new Error('Canvas 2D context is unavailable')
  }
  const filterDescriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(context), 'filter')
  if (typeof filterDescriptor?.set === 'function') {
    context.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%)`
    context.drawImage(rotatedImage, crop.left, crop.top, crop.width, crop.height, 0, 0, width, height)
    context.filter = 'none'
  } else {
    context.drawImage(rotatedImage, crop.left, crop.top, crop.width, crop.height, 0, 0, width, height)
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
      const radius = Math.max(1, (stroke.radius / visibleCrop.width) * width)
      maskContext.lineWidth = radius * 2
      maskContext.shadowColor = '#fff'
      maskContext.shadowBlur = radius * 0.28
      const points = stroke.points
        .map((point) => ({
          x: ((point.x - visibleCrop.x) / visibleCrop.width) * width,
          y: ((point.y - visibleCrop.y) / visibleCrop.height) * height,
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

  rotatedImage.width = 0
  rotatedImage.height = 0
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
