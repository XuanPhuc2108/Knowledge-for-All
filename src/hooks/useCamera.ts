import { useCallback, useEffect, useRef, useState } from 'react'
import { compressImage, dataUrlToBlob } from '../lib/imageCompression'

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

function logImageStage(context: string, stage: string, details?: { mimeType?: string; size?: number }) {
  if (!import.meta.env.DEV) return
  const message = `[Booki] ${context}: ${stage}`
  if (details) console.info(message, details)
  else console.info(message)
}

export function useCamera(context = 'Add Book') {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const previousPreviewRef = useRef<string | null>(null)
  const previousCompressionInfoRef = useRef<{ originalBytes: number; optimizedBytes: number } | null>(null)
  const [active, setActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [compressionInfo, setCompressionInfo] = useState<{ originalBytes: number; optimizedBytes: number } | null>(null)
  const [processing, setProcessing] = useState(false)
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
    } catch (cause) {
      if (import.meta.env.DEV) console.error(`[Booki] ${context}: camera access failed`, cause)
      setError('Bạn đã từ chối quyền camera. Bạn vẫn có thể tải ảnh từ máy.')
      stopCamera()
      if (previousPreviewRef.current) {
        setPreview(previousPreviewRef.current)
        setCompressionInfo(previousCompressionInfoRef.current)
        previousPreviewRef.current = null
        previousCompressionInfoRef.current = null
      }
    }
  }, [context, stopCamera])

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current
    if (!video) return null
    setError(null)
    setProcessing(true)
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx || !canvas.width || !canvas.height) {
      setProcessing(false)
      setError('Không thể chụp ảnh. Hãy thử lại hoặc tải ảnh từ máy.')
      return null
    }
    try {
      ctx.drawImage(video, 0, 0)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      )
      if (!blob) throw new Error('Camera image capture failed')
      const compressed = await compressImage(blob)
      const optimizedBlob = dataUrlToBlob(compressed)
      previousPreviewRef.current = null
      previousCompressionInfoRef.current = null
      setPreview(compressed)
      setCompressionInfo({ originalBytes: blob.size, optimizedBytes: optimizedBlob.size })
      logImageStage(context, 'image compressed', { mimeType: optimizedBlob.type, size: optimizedBlob.size })
      stopCamera()
      return compressed
    } catch (cause) {
      if (import.meta.env.DEV) console.error(`[Booki] ${context}: captured image compression failed`, cause)
      setError('Không thể xử lý ảnh vừa chụp. Hãy thử lại hoặc tải ảnh khác.')
      return null
    } finally {
      setProcessing(false)
    }
  }, [context, stopCamera])

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null)
    setCompressionInfo(null)
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setError('Định dạng ảnh chưa được hỗ trợ. Hãy chọn ảnh JPG, PNG, WebP hoặc AVIF.')
      return null
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn 20 MB.')
      return null
    }
    if (file.size === 0) {
      setError('Tệp ảnh trống. Hãy chọn một ảnh khác.')
      return null
    }

    logImageStage(context, 'image selected', { mimeType: file.type, size: file.size })
    setProcessing(true)
    try {
      const compressed = await compressImage(file)
      const optimizedBlob = dataUrlToBlob(compressed)
      setPreview(compressed)
      setCompressionInfo({ originalBytes: file.size, optimizedBytes: optimizedBlob.size })
      logImageStage(context, 'image compressed', { mimeType: optimizedBlob.type, size: optimizedBlob.size })
      return compressed
    } catch (cause) {
      if (import.meta.env.DEV) console.error(`[Booki] ${context}: selected image compression failed`, cause)
      setError('Không thể xử lý ảnh này. Hãy chọn ảnh khác thử nhé.')
      return null
    } finally {
      setProcessing(false)
    }
  }, [context])

  const retake = useCallback(() => {
    previousPreviewRef.current = preview
    previousCompressionInfoRef.current = compressionInfo
    setPreview(null)
    setCompressionInfo(null)
    void startCamera()
  }, [compressionInfo, preview, startCamera])

  const clearPreview = useCallback(() => {
    previousPreviewRef.current = null
    previousCompressionInfoRef.current = null
    setPreview(null)
    setCompressionInfo(null)
  }, [])

  const cancelRetake = useCallback(() => {
    stopCamera()
    setPreview(previousPreviewRef.current)
    setCompressionInfo(previousCompressionInfoRef.current)
    previousPreviewRef.current = null
    previousCompressionInfoRef.current = null
  }, [stopCamera])

  return {
    videoRef,
    active,
    preview,
    compressionInfo,
    processing,
    error,
    supported,
    startCamera,
    stopCamera,
    capturePhoto,
    handleFileUpload,
    retake,
    clearPreview,
    cancelRetake,
  }
}
