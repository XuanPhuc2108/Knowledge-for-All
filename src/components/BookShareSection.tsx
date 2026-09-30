import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from './Button'
import { useToast } from '../hooks/useToast'

interface BookShareSectionProps {
  bookId: string
  title: string
  ownerName: string
}

export function BookShareSection({ bookId, title, ownerName }: BookShareSectionProps) {
  const { showToast } = useToast()
  const [qr, setQr] = useState<{ url: string; png?: string; svg?: string; failed?: boolean }>({ url: '' })
  const publicUrl = new URL(`/books/${encodeURIComponent(bookId)}`, window.location.origin).toString()

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      QRCode.toDataURL(publicUrl, { width: 240, margin: 2, errorCorrectionLevel: 'M' }),
      QRCode.toString(publicUrl, { type: 'svg', width: 240, margin: 2, errorCorrectionLevel: 'M' }),
    ])
      .then(([png, svg]) => {
        if (cancelled) return
        setQr({ url: publicUrl, png, svg })
      })
      .catch((cause: unknown) => {
        console.error('Unable to generate a book sharing QR code', cause)
        if (!cancelled) setQr({ url: publicUrl, failed: true })
      })
    return () => { cancelled = true }
  }, [publicUrl])
  const qrPng = qr.url === publicUrl ? qr.png : undefined
  const qrSvg = qr.url === publicUrl ? qr.svg : undefined
  const qrFailed = qr.url === publicUrl && Boolean(qr.failed)

  const copyLink = async () => {
    try {
      await copyText(publicUrl)
      showToast('Đã sao chép liên kết sách.', 'success')
      return true
    } catch (cause) {
      console.error('Unable to copy the public book link', cause)
      showToast('Không thể sao chép liên kết. Hãy thử lại hoặc sao chép từ thanh địa chỉ.', 'error')
      return false
    }
  }

  const shareBook = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: publicUrl })
        return
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        console.error('Native sharing failed; falling back to copying the public book link', cause)
        if (await copyText(publicUrl).catch(() => false)) {
          showToast('Không thể mở bảng chia sẻ. Đã sao chép liên kết sách.', 'info')
          return
        }
        showToast('Không thể chia sẻ liên kết lúc này. Hãy thử sao chép liên kết.', 'error')
        return
      }
    }
    await copyLink()
  }

  const downloadPng = () => {
    if (qrPng) downloadDataUrl(qrPng, `booki-${safeFilename(bookId)}-qr.png`)
  }

  const downloadSvg = () => {
    if (!qrSvg) return
    const blobUrl = URL.createObjectURL(new Blob([qrSvg], { type: 'image/svg+xml;charset=utf-8' }))
    downloadUrl(blobUrl, `booki-${safeFilename(bookId)}-qr.svg`)
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  }

  return (
    <section className="glass-card grid gap-5 rounded-2xl p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5" aria-labelledby="book-share-title">
      <div className="min-w-0">
        <h2 id="book-share-title" className="font-bold text-text-primary">Chia sẻ cuốn sách</h2>
        <p className="mt-1 text-sm text-text-muted">
          {ownerName} chia sẻ cuốn sách này. Liên kết công khai không chứa thông tin riêng tư.
        </p>
        <a href={publicUrl} className="mt-2 block break-all text-xs text-accent-yellow hover:underline" aria-label="Liên kết công khai đến cuốn sách">
          {publicUrl}
        </a>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void shareBook()}>Chia sẻ</Button>
          <Button size="sm" variant="outline" onClick={() => void copyLink()}>Sao chép liên kết</Button>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 sm:min-w-40">
        {qrPng ? (
          <img src={qrPng} alt={`Mã QR liên kết công khai đến sách ${title}`} width={160} height={160} loading="lazy" decoding="async" className="h-40 w-40 rounded-xl bg-white p-2" />
        ) : (
          <div className="flex h-40 w-40 items-center justify-center rounded-xl bg-[rgb(var(--color-interactive-surface)/.8)] p-3 text-center text-xs text-text-muted" role="status">
            {qrFailed ? 'Chưa tạo được mã QR.' : 'Đang tạo mã QR...'}
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" variant="outline" disabled={!qrPng} onClick={downloadPng}>Tải PNG</Button>
          <Button size="sm" variant="outline" disabled={!qrSvg} onClick={downloadSvg}>Tải SVG</Button>
        </div>
      </div>
    </section>
  )
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Clipboard copy command failed')
}

function downloadDataUrl(dataUrl: string, filename: string) {
  downloadUrl(dataUrl, filename)
}

function downloadUrl(url: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}
