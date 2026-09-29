import { Camera, ImagePlus, RotateCcw } from 'lucide-react'
import { Button } from './Button'
import { useCamera } from '../hooks/useCamera'

interface CameraCaptureProps {
  onImageCapture: (dataUrl: string) => void
}

export function CameraCapture({ onImageCapture }: CameraCaptureProps) {
  const {
    videoRef,
    active,
    preview,
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
    if (!file) return
    const data = await handleFileUpload(file)
    onImageCapture(data)
  }

  return (
    <div className="space-y-4">
      {preview ? (
        <div className="relative overflow-hidden rounded-2xl ring-2 ring-accent-purple/50">
          <img src={preview} alt="Ảnh xem trước" className="w-full object-cover" />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <Button size="sm" variant="secondary" onClick={retake} aria-label="Chụp lại">
              <RotateCcw className="h-4 w-4" />
              Chụp lại
            </Button>
          </div>
        </div>
      ) : active ? (
        <div className="relative overflow-hidden rounded-2xl bg-black ring-2 ring-accent-teal/50">
          <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted />
          <div className="absolute inset-0 animate-pulse-slow rounded-2xl ring-2 ring-inset ring-accent-teal/30" />
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <Button onClick={() => void onCapture()} aria-label="Chụp ảnh">
              <Camera className="h-4 w-4" />
              Chụp ảnh
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-glass bg-white/5">
          <Camera className="h-12 w-12 text-accent-purple" />
          <p className="text-sm text-text-muted">Chụp ảnh bìa sách hoặc tải từ máy</p>
          <div className="flex flex-wrap justify-center gap-2">
            {supported && (
              <Button onClick={() => void startCamera()}>
                <Camera className="h-4 w-4" />
                Mở camera
              </Button>
            )}
            <label>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => void onFileChange(e)}
              />
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-glass px-6 py-2.5 text-sm font-medium text-text-primary hover:bg-white/5">
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
