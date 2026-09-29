import { Camera, ImagePlus, RotateCcw } from 'lucide-react'
import { Button } from './Button'
import { useCamera } from '../hooks/useCamera'
import { ImageWithSkeleton } from './ImageWithSkeleton'

interface CameraCaptureProps {
  onImageCapture: (dataUrl: string) => void
}

export function CameraCapture({ onImageCapture }: CameraCaptureProps) {
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
  } = useCamera()

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
      {preview ? (
        <div className="glass-card relative overflow-hidden rounded-2xl ring-1 ring-accent-yellow/20">
          <ImageWithSkeleton
            src={preview}
            alt="Ảnh bìa đã tối ưu, xem trước"
            width={800}
            height={1067}
            loading="eager"
            wrapperClassName="aspect-[3/4] w-full"
            className="h-full w-full object-contain"
          />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <Button size="sm" variant="secondary" disabled={processing} onClick={retake} aria-label="Chụp lại">
              <RotateCcw className="h-4 w-4" />
              Chụp lại
            </Button>
          </div>
          {compressionInfo && (
            <p className="border-t border-glass/10 px-3 py-2 text-xs text-text-muted">
              Dung lượng: {formatBytes(compressionInfo.originalBytes)} → {formatBytes(compressionInfo.optimizedBytes)}
            </p>
          )}
        </div>
      ) : active ? (
        <div className="relative overflow-hidden rounded-2xl bg-black ring-1 ring-accent-yellow/35">
          <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted width={1280} height={960} />
          <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-accent-yellow/20" />
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <Button disabled={processing} onClick={() => void onCapture()} aria-label="Chụp ảnh">
              <Camera className="h-4 w-4" />
              {processing ? 'Đang tối ưu ảnh...' : 'Chụp ảnh'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-glass/20 bg-[rgb(var(--color-interactive-surface)/.7)]" role={processing ? 'status' : undefined}>
          <Camera className="h-10 w-10 text-accent-yellow" />
          <p className="text-sm text-text-muted">{processing ? 'Đang tối ưu ảnh...' : 'Chụp ảnh bìa sách hoặc tải từ máy'}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {supported && (
              <Button disabled={processing} onClick={() => void startCamera()}>
                <Camera className="h-4 w-4" />
                Mở camera
              </Button>
            )}
            <label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                disabled={processing}
                onChange={(e) => void onFileChange(e)}
              />
              <span className="filter-chip inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium">
                <ImagePlus className="h-4 w-4" />
                Tải ảnh từ máy
              </span>
            </label>
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
