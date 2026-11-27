import { Camera, ImagePlus, RotateCcw, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { Button } from './Button'
import { useCamera } from '../hooks/useCamera'
import { ImageWithSkeleton } from './ImageWithSkeleton'

interface CameraCaptureProps {
  onImageCapture: (dataUrl: string) => void
  onImageRemove: () => void
  disabled?: boolean
  logContext?: 'Add Book' | 'Edit Book'
}

export function CameraCapture({
  onImageCapture,
  onImageRemove,
  disabled = false,
  logContext = 'Add Book',
}: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    videoRef,
    active,
    preview,
    compressionInfo,
    processing,
    error,
    supported,
    startCamera,
    capturePhoto,
    handleFileUpload,
    retake,
    clearPreview,
    cancelRetake,
  } = useCamera(logContext)

  const onCapture = async () => {
    const data = await capturePhoto()
    if (data) onImageCapture(data)
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.currentTarget.value = ''
    if (!file) return
    const data = await handleFileUpload(file)
    if (data) onImageCapture(data)
  }

  return (
    <div className="space-y-4" aria-busy={processing}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        disabled={processing || disabled}
        onChange={(e) => void onFileChange(e)}
      />
      {preview ? (
        <div className="glass-card relative overflow-hidden rounded-2xl ring-1 ring-accent-yellow/20">
          <div className="aspect-[3/4] w-full">
            <ImageWithSkeleton
              src={preview}
              alt="Ảnh bìa đã tối ưu, xem trước"
              width={800}
              height={1067}
              loading="eager"
              wrapperClassName="h-full w-full"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-glass/10 p-3">
            <Button type="button" size="sm" variant="secondary" disabled={processing || disabled} onClick={retake} aria-label="Chụp ảnh khác">
              <RotateCcw className="h-4 w-4" />
              Chụp ảnh khác
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={processing || disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              Tải ảnh khác
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={processing || disabled}
              onClick={() => {
                clearPreview()
                onImageRemove()
              }}
              aria-label="Xóa ảnh bìa"
            >
              <Trash2 className="h-4 w-4" />
              Xóa ảnh
            </Button>
          </div>
          {compressionInfo && (
            <p className="px-3 pb-3 text-xs text-text-muted">
              Đã chọn ảnh · Dung lượng: {formatBytes(compressionInfo.originalBytes)} → {formatBytes(compressionInfo.optimizedBytes)}
            </p>
          )}
        </div>
      ) : active ? (
        <div className="relative overflow-hidden rounded-2xl bg-black ring-1 ring-accent-yellow/35">
          <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted width={1280} height={960} />
          <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-accent-yellow/20" />
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <div className="flex gap-2">
              <Button type="button" disabled={processing || disabled} onClick={() => void onCapture()} aria-label="Chụp ảnh">
                <Camera className="h-4 w-4" />
                {processing ? 'Đang tối ưu ảnh...' : 'Chụp ảnh'}
              </Button>
              <Button type="button" variant="secondary" disabled={processing || disabled} onClick={cancelRetake}>
                Hủy
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-glass/20 bg-[rgb(var(--color-interactive-surface)/.7)]" role={processing ? 'status' : undefined}>
          <Camera className="h-10 w-10 text-accent-yellow" />
          <p className="text-sm text-text-muted">{processing ? 'Đang tối ưu ảnh...' : 'Chụp ảnh bìa sách hoặc tải từ máy'}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {supported && (
              <Button type="button" disabled={processing || disabled} onClick={() => void startCamera()}>
                <Camera className="h-4 w-4" />
                Mở camera
              </Button>
            )}
            <Button type="button" disabled={processing || disabled} onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="h-4 w-4" />
              Tải ảnh từ máy
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-accent-rose" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kilobytes = bytes / 1024
  if (kilobytes < 1024) return `${kilobytes.toFixed(0)} KB`
  return `${(kilobytes / 1024).toFixed(1)} MB`
}
