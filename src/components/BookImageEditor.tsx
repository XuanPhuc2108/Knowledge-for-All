import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Redo2, RotateCcw, RotateCw, Undo2, X } from 'lucide-react'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import {
  createInitialImageEditState,
  drawBookImagePreview,
  getCenteredAspectCrop,
  getSmartAspectCrop,
  getCropFromDrag,
  getCropPixelBounds,
  getRotatedImageDimensions,
  getVisibleImageCrop,
  MAX_IMAGE_EDIT_POINTS_PER_STROKE,
  MAX_IMAGE_EDIT_STROKES,
  ORIGINAL_CROP,
  pushImageEditHistory,
  redoImageEdit,
  renderBookImage,
  transformPointForRotation,
  undoImageEdit,
  validateEditedImageBlob,
  type BrushPoint,
  type CropRect,
  type ImageEditHistory,
  type ImageEditState,
} from '../lib/bookImageEditor'
import { dataUrlToBlob } from '../lib/imageCompression'
import { Button } from './Button'
import { GradientButton } from './GradientButton'

type Tool = 'view' | 'crop' | 'blur'

interface BookImageEditorProps {
  source: string
  onApply: (image: string) => void
  onClose: () => void
}

export function BookImageEditor({ source, onApply, onClose }: BookImageEditorProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('view')
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)
  const [fitMode, setFitMode] = useState<'smart' | 'fill' | 'contain' | 'original'>('smart')
  const [state, setState] = useState<ImageEditState>(createInitialImageEditState)
  const [history, setHistory] = useState<ImageEditHistory>({ past: [], future: [] })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const dragStartRef = useRef<{ pointerId: number; point: BrushPoint } | null>(null)
  const cropDraftRef = useRef<CropRect | null>(null)
  const strokeRef = useRef<{ points: BrushPoint[]; radius: number } | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const savingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const rotatedDimensions = image
    ? getRotatedImageDimensions(image.naturalWidth, image.naturalHeight, state.rotation)
    : { width: 1, height: 1 }
  const visibleCrop = image
    ? getVisibleImageCrop(
        state.crop,
        image.naturalWidth,
        image.naturalHeight,
        state.rotation,
        state.zoom,
        state.fitMode !== 'contain' && state.fitMode !== 'original',
      )
    : state.crop
  useEffect(() => {
    savingRef.current = saving
    onCloseRef.current = onClose
  }, [onClose, saving])
  useBodyScrollLock(true)

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()
    const imageElement = new Image()
    if (/^https?:/i.test(source)) imageElement.crossOrigin = 'anonymous'
    imageElement.onload = () => {
      setImage(imageElement)
      setImageError(null)
      const crop = getSmartAspectCrop(
        imageElement,
        imageElement.naturalWidth,
        imageElement.naturalHeight,
      )
      setState((current) => ({
        ...current,
        crop,
      }))
      setAspectRatio(3 / 4)
      setFitMode('smart')
    }
    imageElement.onerror = () => setImageError(
      'Chưa thể xử lý ảnh này. Bạn có thể dùng ảnh gốc hoặc chọn ảnh khác.',
    )
    imageElement.src = source

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingRef.current) {
        event.preventDefault()
        onCloseRef.current()
      }
      if (event.key === 'Tab') {
        const dialog = document.getElementById('book-image-editor')
        const focusable = dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled)',
        )
        if (!focusable?.length) return
        const first = focusable.item(0)
        const last = focusable.item(focusable.length - 1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      imageElement.onload = null
      imageElement.onerror = null
      document.removeEventListener('keydown', handleKeyDown)
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
      previousFocusRef.current?.focus()
    }
  }, [source])

  useEffect(() => {
    if (!image || !canvasRef.current || !overlayRef.current) return
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
    animationFrameRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current
      const overlay = overlayRef.current
      if (!canvas || !overlay) return
      try {
        const rendered = drawBookImagePreview(image, image.naturalWidth, image.naturalHeight, state)
        canvas.width = rendered.width
        canvas.height = rendered.height
        overlay.width = rendered.width
        overlay.height = rendered.height
        const context = canvas.getContext('2d')
        context?.drawImage(rendered, 0, 0)
        rendered.width = 0
        rendered.height = 0
      } catch (cause) {
        console.error('Unable to preview book image edits', cause)
        setImageError('Chưa thể xử lý ảnh này. Bạn có thể dùng ảnh gốc hoặc chọn ảnh khác.')
      }
      animationFrameRef.current = null
    })
  }, [image, state])

  const changeState = (next: ImageEditState) => {
    setHistory((current) => pushImageEditHistory(current, state))
    setState(next)
    setSaveError(null)
  }

  const undo = () => {
    const result = undoImageEdit(history, state)
    if (!result) return
    setHistory(result.history)
    setState(result.state)
  }

  const redo = () => {
    const result = redoImageEdit(history, state)
    if (!result) return
    setHistory(result.history)
    setState(result.state)
  }

  const clearOverlay = () => {
    const overlay = overlayRef.current
    const context = overlay?.getContext('2d')
    if (overlay && context) context.clearRect(0, 0, overlay.width, overlay.height)
  }

  const getLocalPoint = (event: ReactPointerEvent<HTMLCanvasElement>): BrushPoint | null => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    }
  }

  const drawLiveBrush = () => {
    const overlay = overlayRef.current
    const context = overlay?.getContext('2d')
    const stroke = strokeRef.current
    if (!overlay || !context || !stroke) return
    clearOverlay()
    context.beginPath()
    context.strokeStyle = 'rgb(255 255 255 / 0.88)'
    context.lineWidth = Math.max(2, (stroke.radius / visibleCrop.width) * overlay.width * 2)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    const first = stroke.points[0]
    context.moveTo(
      ((first.x - visibleCrop.x) / visibleCrop.width) * overlay.width,
      ((first.y - visibleCrop.y) / visibleCrop.height) * overlay.height,
    )
    for (const point of stroke.points.slice(1)) {
      context.lineTo(
        ((point.x - visibleCrop.x) / visibleCrop.width) * overlay.width,
        ((point.y - visibleCrop.y) / visibleCrop.height) * overlay.height,
      )
    }
    context.stroke()
  }

  const drawCropDraft = (crop: CropRect | null) => {
    const overlay = overlayRef.current
    const context = overlay?.getContext('2d')
    if (!overlay || !context) return
    clearOverlay()
    if (!crop) return
    const bounds = getCropPixelBounds(crop, rotatedDimensions.width, rotatedDimensions.height)
    const imageCrop = getCropPixelBounds(visibleCrop, rotatedDimensions.width, rotatedDimensions.height)
    const left = ((bounds.left - imageCrop.left) / imageCrop.width) * overlay.width
    const top = ((bounds.top - imageCrop.top) / imageCrop.height) * overlay.height
    const width = (bounds.width / imageCrop.width) * overlay.width
    const height = (bounds.height / imageCrop.height) * overlay.height
    context.fillStyle = 'rgb(8 11 23 / 0.58)'
    context.fillRect(0, 0, overlay.width, overlay.height)
    context.clearRect(left, top, width, height)
    context.strokeStyle = '#fff'
    context.lineWidth = Math.max(2, overlay.width / 320)
    context.setLineDash([8, 6])
    context.strokeRect(left, top, width, height)
    context.setLineDash([])
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (tool === 'view' || !image) return
    const point = getLocalPoint(event)
    const overlay = overlayRef.current
    if (!point || !overlay) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartRef.current = { pointerId: event.pointerId, point }

    if (tool === 'blur') {
      strokeRef.current = {
        points: [{
          x: visibleCrop.x + point.x * visibleCrop.width,
          y: visibleCrop.y + point.y * visibleCrop.height,
        }],
        radius: (state.brushSize / Math.max(1, overlay.clientWidth)) * visibleCrop.width / 2,
      }
      drawLiveBrush()
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragStartRef.current?.pointerId !== event.pointerId) return
    const point = getLocalPoint(event)
    if (!point) return
    if (tool === 'crop' && image) {
      const currentCropAspect = (visibleCrop.width * rotatedDimensions.width) / (visibleCrop.height * rotatedDimensions.height)
      cropDraftRef.current = getCropFromDrag(
        visibleCrop,
        dragStartRef.current.point,
        point,
        currentCropAspect,
        aspectRatio,
      )
      drawCropDraft(cropDraftRef.current)
    } else if (tool === 'blur' && strokeRef.current) {
      const previous = strokeRef.current.points.at(-1)
      const localX = visibleCrop.x + point.x * visibleCrop.width
      const localY = visibleCrop.y + point.y * visibleCrop.height
      const localDistance = previous
        ? Math.hypot(
            (localX - previous.x) / visibleCrop.width * (overlayRef.current?.clientWidth ?? 1),
            (localY - previous.y) / visibleCrop.height * (overlayRef.current?.clientHeight ?? 1),
          )
        : Infinity
      if (localDistance >= 3 && strokeRef.current.points.length < MAX_IMAGE_EDIT_POINTS_PER_STROKE) {
        strokeRef.current.points.push({ x: localX, y: localY })
        drawLiveBrush()
      }
    }
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragStartRef.current?.pointerId !== event.pointerId) return
    dragStartRef.current = null
    if (tool === 'crop' && cropDraftRef.current) {
      changeState({ ...state, crop: cropDraftRef.current, zoom: 1 })
    } else if (tool === 'blur' && strokeRef.current) {
      changeState({ ...state, strokes: [...state.strokes, strokeRef.current].slice(-MAX_IMAGE_EDIT_STROKES) })
    }
    cropDraftRef.current = null
    strokeRef.current = null
    clearOverlay()
  }

  const onPointerCancel = () => {
    dragStartRef.current = null
    cropDraftRef.current = null
    strokeRef.current = null
    clearOverlay()
  }

  const reset = () => {
    setState({ ...createInitialImageEditState(), fitMode: 'original' })
    setHistory({ past: [], future: [] })
    setTool('view')
    setAspectRatio(null)
    setFitMode('original')
    setSaveError(null)
  }

  const apply = async () => {
    if (!image || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const blob = validateEditedImageBlob(
        await renderBookImage(image, image.naturalWidth, image.naturalHeight, state),
      )
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error('Không thể đọc ảnh đã xử lý.'))
        reader.onerror = () => reject(reader.error ?? new Error('Không thể đọc ảnh đã xử lý.'))
        reader.readAsDataURL(blob)
      })
      if (dataUrlToBlob(dataUrl).size !== blob.size) {
        throw new Error('Edited image output did not match the exported image')
      }
      onApply(dataUrl)
    } catch (cause) {
      console.error('Unable to export edited book image', cause)
      setSaveError('Chưa thể áp dụng ảnh này. Ảnh gốc vẫn được giữ nguyên; hãy thử lại hoặc hủy để dùng ảnh gốc.')
    } finally {
      setSaving(false)
    }
  }

  const resetToOriginalCrop = () => changeState({ ...state, crop: createInitialImageEditState().crop, zoom: 1 })
  const autoAlignImage = () => {
    if (!image) return
    changeState({
      ...state,
      crop: getSmartAspectCrop(
        image,
        image.naturalWidth,
        image.naturalHeight,
        state.rotation,
      ),
      zoom: 1,
      fitMode: 'smart',
    })
    setAspectRatio(3 / 4)
    setFitMode('smart')
    setTool('view')
  }

  const applyFitMode = (mode: 'smart' | 'fill' | 'contain' | 'original') => {
    if (!image) return
    setFitMode(mode)
    setTool('view')
    setSaveError(null)
    if (mode === 'smart' || mode === 'fill') {
      changeState({
        ...state,
        crop: mode === 'smart'
          ? getSmartAspectCrop(image, image.naturalWidth, image.naturalHeight, state.rotation)
          : getCenteredAspectCrop(rotatedDimensions.width, rotatedDimensions.height),
        rotation: state.rotation,
        zoom: 1,
        fitMode: mode,
      })
      setAspectRatio(3 / 4)
    } else if (mode === 'contain') {
      changeState({ ...state, crop: ORIGINAL_CROP, zoom: 1, fitMode: mode })
      setAspectRatio(null)
    } else {
      reset()
    }
  }

  const changeRotation = (nextRotation: number) => {
    if (!image) return
    const normalizedRotation = Math.max(-180, Math.min(180, Math.round(nextRotation)))
    const nextDimensions = getRotatedImageDimensions(image.naturalWidth, image.naturalHeight, normalizedRotation)
    const targetAspect = aspectRatio ?? 3 / 4
    const cropWidth = Math.min(nextDimensions.width, nextDimensions.height * targetAspect)
    const cropHeight = cropWidth / targetAspect
    const cropCenter = transformPointForRotation(
      { x: state.crop.x + state.crop.width / 2, y: state.crop.y + state.crop.height / 2 },
      image.naturalWidth,
      image.naturalHeight,
      state.rotation,
      normalizedRotation,
    )
    const cropLeft = Math.max(0, Math.min(nextDimensions.width - cropWidth, cropCenter.x * nextDimensions.width - cropWidth / 2))
    const cropTop = Math.max(0, Math.min(nextDimensions.height - cropHeight, cropCenter.y * nextDimensions.height - cropHeight / 2))
    const crop = {
      x: cropLeft / nextDimensions.width,
      y: cropTop / nextDimensions.height,
      width: cropWidth / nextDimensions.width,
      height: cropHeight / nextDimensions.height,
    }
    changeState({
      ...state,
      rotation: normalizedRotation,
      crop,
      zoom: state.zoom,
      fitMode: 'smart',
      strokes: state.strokes.map((stroke) => ({
        ...stroke,
        points: stroke.points.map((point) => transformPointForRotation(
          point,
          image.naturalWidth,
          image.naturalHeight,
          state.rotation,
          normalizedRotation,
        )),
      })),
    })
    setFitMode('smart')
    setAspectRatio(targetAspect)
  }

  const rotateBy = (degrees: number) => {
    const next = ((state.rotation + degrees + 180) % 360 + 360) % 360 - 180
    changeRotation(next === -180 && state.rotation + degrees > 0 ? 180 : next)
  }

  const dialog = (
    <div
      className="fixed inset-0 z-[1000] flex h-[100dvh] items-end justify-center bg-dark/90 p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <section
        id="book-image-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-image-editor-title"
        className="book-image-editor flex h-[100dvh] min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-none border-0 bg-dark-secondary p-3 shadow-2xl sm:h-[min(780px,calc(100dvh-2rem))] sm:max-w-3xl sm:rounded-2xl sm:border sm:border-glass/12 sm:p-5"
      >
        <header className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <div>
            <h2 id="book-image-editor-title" className="text-lg font-bold text-text-primary">Chỉnh ảnh bìa sách</h2>
            <p className="mt-1 text-xs text-text-muted">Ảnh được xử lý ngay trên thiết bị của bạn.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} disabled={saving} aria-label="Đóng trình chỉnh ảnh" className="grid min-h-11 min-w-11 place-items-center rounded-xl text-text-muted transition-colors hover:bg-[rgb(var(--color-interactive-surface)/.8)] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow disabled:opacity-50">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {imageError ? (
            <div>
              <p role="alert" className="rounded-xl border border-accent-rose/25 bg-accent-rose/10 p-4 text-sm text-accent-rose">{imageError}</p>
              <p className="mt-2 text-sm text-text-muted">Ảnh gốc vẫn được giữ trong biểu mẫu.</p>
            </div>
          ) : !image ? (
            <p role="status" className="py-16 text-center text-sm text-text-muted">Đang mở ảnh...</p>
          ) : (
            <>
              <fieldset className="mb-4 rounded-xl border border-glass/10 p-3">
                <legend className="px-1 text-sm font-semibold text-text-primary">Cách vừa khung bìa</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {([
                    ['smart', 'Tự động'],
                    ['fill', 'Đầy khung'],
                    ['contain', 'Giữ toàn ảnh'],
                    ['original', 'Ảnh gốc'],
                  ] as const).map(([mode, label]) => (
                    <Button
                      key={mode}
                      type="button"
                      size="sm"
                      variant={fitMode === mode ? 'primary' : 'secondary'}
                      aria-pressed={fitMode === mode}
                      onClick={() => applyFitMode(mode)}
                      disabled={saving}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mb-4 space-y-3 rounded-xl border border-glass/10 p-3">
                <legend className="px-1 text-sm font-semibold text-text-primary">Xoay ảnh</legend>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    aria-label="Xoay trái 90 độ"
                    onClick={() => rotateBy(-90)}
                    disabled={saving}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" /> -90°
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    aria-label="Xoay phải 90 độ"
                    onClick={() => rotateBy(90)}
                    disabled={saving}
                  >
                    <RotateCw className="h-4 w-4" aria-hidden="true" /> +90°
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => rotateBy(180)} disabled={saving}>
                    Xoay 180°
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => changeRotation(0)} disabled={saving}>
                    Đặt góc về 0°
                  </Button>
                  <span className="self-center text-sm font-semibold tabular-nums text-accent-yellow" aria-live="polite">
                    {state.rotation > 0 ? '+' : ''}{state.rotation}°
                  </span>
                </div>
                <label className="grid gap-2 text-xs text-text-muted">
                  <span className="flex justify-between gap-3">
                    <span>Chỉnh góc chính xác</span>
                    <span>{state.rotation > 0 ? '+' : ''}{state.rotation}°</span>
                  </span>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={state.rotation}
                    aria-label="Góc xoay ảnh"
                    aria-valuetext={`${state.rotation} độ`}
                    onChange={(event) => changeRotation(Number(event.target.value))}
                    disabled={saving}
                    className="w-full accent-[rgb(var(--color-accent))]"
                  />
                </label>
              </fieldset>

              <div className="mb-4 grid gap-3 rounded-xl border border-glass/10 bg-black/20 p-2 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Ảnh gốc</p>
                  <div className="flex min-h-40 items-center justify-center rounded-lg bg-black/30">
                    <img src={source} alt="Ảnh bìa gốc" className="block max-h-[28dvh] max-w-full rounded-lg object-contain" />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Ảnh sẽ đăng</p>
                  <div className={`relative mx-auto flex min-h-40 w-fit max-w-full items-center justify-center ${tool === 'view' ? 'touch-pan-y' : 'touch-none'}`}>
                    <canvas ref={canvasRef} aria-label="Ảnh xem trước sau chỉnh sửa" className="block max-h-[28dvh] max-w-full rounded-lg object-contain sm:max-h-[34dvh]" />
                    <canvas
                      ref={overlayRef}
                      aria-hidden="true"
                      className={`absolute inset-0 h-full w-full rounded-lg ${tool === 'view' ? 'pointer-events-none' : 'cursor-crosshair touch-none'}`}
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerCancel={onPointerCancel}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2" aria-label="Công cụ chỉnh ảnh">
                <Button type="button" size="sm" variant={tool === 'crop' ? 'primary' : 'secondary'} onClick={() => setTool(tool === 'crop' ? 'view' : 'crop')} aria-pressed={tool === 'crop'}>
                  Cắt ảnh
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={autoAlignImage} disabled={!image || saving}>
                  Tự căn ảnh
                </Button>
                <Button type="button" size="sm" variant={tool === 'blur' ? 'primary' : 'secondary'} onClick={() => setTool(tool === 'blur' ? 'view' : 'blur')} aria-pressed={tool === 'blur'}>
                  Cọ làm mờ
                </Button>
              </div>
              <p className="mb-4 text-xs text-text-muted">Tự động chỉ cắt viền nền đồng nhất khi nhận diện đủ chắc chắn; trường hợp khác sẽ giữ khung giữa an toàn. Bạn có thể kéo để chỉnh vùng cắt.</p>

              <fieldset className="mb-4 space-y-3 rounded-xl border border-glass/10 p-3">
                <legend className="px-1 text-sm font-semibold text-text-primary">Thu phóng khung ảnh</legend>
                <label className="grid gap-2 text-xs text-text-muted">
                  <span className="flex justify-between gap-3">
                    <span>Phóng to</span>
                    <span>{state.zoom.toFixed(1)}×</span>
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={state.zoom}
                    aria-label="Thu phóng ảnh"
                    aria-valuetext={`${state.zoom.toFixed(1)} lần`}
                    onChange={(event) => changeState({ ...state, zoom: Number(event.target.value) })}
                    disabled={saving}
                    className="w-full accent-[rgb(var(--color-accent))]"
                  />
                </label>
                <p className="text-xs text-text-muted">Góc xoay được dựng lại từ ảnh gốc; khung được tự phóng vừa để tránh lộ góc trống khi chọn kiểu Đầy khung.</p>
              </fieldset>

              {tool === 'crop' && (
                <fieldset className="mb-4 space-y-3 rounded-xl border border-glass/10 p-3">
                  <legend className="px-1 text-sm font-semibold text-text-primary">Cắt ảnh</legend>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Tự do', ratio: null },
                      { label: 'Vuông 1:1', ratio: 1 },
                      { label: 'Sách 4:3', ratio: 4 / 3 },
                    ].map((option) => (
                      <Button
                        key={option.label}
                        type="button"
                        size="sm"
                        variant={aspectRatio === option.ratio ? 'primary' : 'secondary'}
                        aria-pressed={aspectRatio === option.ratio}
                        onClick={() => setAspectRatio(option.ratio)}
                      >
                        {option.label}
                      </Button>
                    ))}
                    <Button type="button" size="sm" variant="secondary" onClick={resetToOriginalCrop}>Khôi phục vùng cắt</Button>
                  </div>
                  <p className="text-xs text-text-muted">Kéo trên ảnh để chọn vùng cắt.</p>
                </fieldset>
              )}

              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <SliderControl
                  label="Độ sáng"
                  value={state.brightness}
                  min={50}
                  max={150}
                  onChange={(value) => changeState({ ...state, brightness: value })}
                  onReset={() => changeState({ ...state, brightness: 100 })}
                />
                <SliderControl
                  label="Tương phản"
                  value={state.contrast}
                  min={50}
                  max={150}
                  onChange={(value) => changeState({ ...state, contrast: value })}
                  onReset={() => changeState({ ...state, contrast: 100 })}
                />
              </div>

              {tool === 'blur' && (
                <div className="mb-4 grid gap-3 rounded-xl border border-glass/10 p-3 sm:grid-cols-2">
                  <SliderControl
                    label="Kích thước cọ"
                    value={state.brushSize}
                    min={16}
                    max={112}
                    suffix=" px"
                    onChange={(value) => setState((current) => ({ ...current, brushSize: value }))}
                  />
                  <SliderControl
                    label="Độ mờ"
                    value={state.blurStrength}
                    min={2}
                    max={24}
                    onChange={(value) => changeState({ ...state, blurStrength: value })}
                  />
                  <p className="text-xs text-text-muted sm:col-span-2">Tô lên vùng ảnh cần làm mờ. Nét cọ được hoàn tác cùng lịch sử chỉnh sửa.</p>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="mt-3 flex shrink-0 flex-col gap-2 border-t border-glass/10 bg-dark-secondary pt-3 pb-1">
          {saveError && <p role="alert" className="text-sm text-accent-rose">{saveError}</p>}
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={undo} disabled={!history.past.length || saving} aria-label="Hoàn tác" className="min-w-0 px-1 text-[11px]">
              <Undo2 className="h-4 w-4 shrink-0" aria-hidden="true" /> Hoàn tác
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={redo} disabled={!history.future.length || saving} aria-label="Làm lại" className="min-w-0 px-1 text-[11px]">
              <Redo2 className="h-4 w-4 shrink-0" aria-hidden="true" /> Làm lại
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={reset} disabled={saving} className="min-w-0 px-1 text-[11px]">
              <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" /> <span className="whitespace-normal">Khôi phục ảnh gốc</span>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Hủy</Button>
            <GradientButton type="button" disabled={!image || Boolean(imageError) || saving} onClick={() => void apply()} className="w-full">
              {saving ? 'Đang áp dụng...' : 'Áp dụng ảnh'}
            </GradientButton>
          </div>
        </footer>
      </section>
    </div>
  )
  return createPortal(dialog, document.body)
}

function SliderControl({
  label,
  value,
  min,
  max,
  suffix = '%',
  onChange,
  onReset,
}: {
  label: string
  value: number
  min: number
  max: number
  suffix?: string
  onChange: (value: number) => void
  onReset?: () => void
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-text-primary">{label}</label>
        <div className="flex items-center gap-2">
          <output className="min-w-10 text-right text-xs tabular-nums text-text-muted">{value}{suffix}</output>
          {onReset && (
            <button type="button" onClick={onReset} className="min-h-9 rounded-lg px-2 text-xs font-semibold text-accent-yellow hover:bg-[rgb(var(--color-interactive-surface)/.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow">
              Đặt lại
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        aria-valuetext={`${value}${suffix}`}
        className="min-h-11 w-full cursor-pointer accent-accent-yellow"
      />
    </div>
  )
}
