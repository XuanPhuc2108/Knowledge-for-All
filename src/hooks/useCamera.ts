import { useCallback, useEffect, useRef, useState } from 'react'
import { compressImage } from '../lib/imageCompression'

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [active, setActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [supported] = useState(() => Boolean(navigator.mediaDevices?.getUserMedia))

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setActive(true)
    } catch {
      setError('Bạn đã từ chối quyền camera. Bạn vẫn có thể tải ảnh từ máy.')
      stopCamera()
    }
  }, [stopCamera])

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current
    if (!video) return null
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    )
    if (!blob) return null
    const compressed = await compressImage(blob)
    setPreview(compressed)
    stopCamera()
    return compressed
  }, [stopCamera])

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null)
    const compressed = await compressImage(file)
    setPreview(compressed)
    return compressed
  }, [])

  const retake = useCallback(() => {
    setPreview(null)
    void startCamera()
  }, [startCamera])

  const clearPreview = useCallback(() => setPreview(null), [])

  return {
    videoRef,
    active,
    preview,
    error,
    supported,
    startCamera,
    stopCamera,
    capturePhoto,
    handleFileUpload,
    retake,
    clearPreview,
  }
}
