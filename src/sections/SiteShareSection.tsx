import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from '../components/Button'
import { useToast } from '../hooks/useToast'

const SITE_URL = 'https://booki-vn.vercel.app/'

export function SiteShareSection() {
  const { showToast } = useToast()
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void QRCode.toDataURL(SITE_URL, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#202019', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (!cancelled) setQr(dataUrl)
      })
      .catch((cause: unknown) => {
        console.error('Unable to generate the Booki website QR code', cause)
        if (!cancelled) setQr(null)
      })
    return () => { cancelled = true }
  }, [])

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(SITE_URL)
      } else {
        const field = document.createElement('textarea')
        field.value = SITE_URL
        field.setAttribute('readonly', '')
        field.style.position = 'fixed'
        field.style.opacity = '0'
        document.body.append(field)
        field.select()
        const copied = document.execCommand('copy')
        field.remove()
        if (!copied) throw new Error('Browser clipboard fallback failed')
      }
      showToast('Chép link Booki xong rồi, gửi hội bạn thôi!', 'success')
    } catch (cause) {
      console.error('Unable to copy the Booki website URL', cause)
      showToast('Chưa chép được liên kết. Hãy thử lại hoặc sao chép từ thanh địa chỉ.', 'error')
    }
  }

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Booki — Sách hay, share liền tay', url: SITE_URL })
        return
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        console.error('Unable to open native sharing for the Booki website', cause)
      }
    }
    await copyLink()
  }

  const downloadQr = () => {
    if (!qr) return
    const anchor = document.createElement('a')
    anchor.href = qr
    anchor.download = 'booki-website-qr.png'
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
  }

  return (
    <section className="px-5 pb-20 sm:px-8 md:pb-28 lg:px-16" aria-labelledby="site-share-title">
      <div className="site-share-card mx-auto grid max-w-5xl items-center gap-8 rounded-[1.75rem] border border-accent-yellow/20 p-6 sm:p-9 md:grid-cols-[minmax(0,1fr)_auto] md:p-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-yellow">GỬI BOOKI CHO HỘI BẠN</p>
          <h2 id="site-share-title" className="mt-3 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
            Quét mã, kiếm sách hay
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
            Mã này chỉ dẫn tới trang chủ Booki, không chứa tài khoản hay thông tin riêng tư. Chia sẻ với bạn bè để cùng ghé xem sách.
          </p>
          <a href={SITE_URL} className="mt-4 inline-block break-all text-sm font-medium text-accent-yellow hover:underline">
            {SITE_URL}
          </a>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => void shareLink()}>Chia sẻ Booki</Button>
            <Button variant="outline" onClick={() => void copyLink()}>Chép link</Button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          {qr ? (
            <img src={qr} alt="Mã QR dẫn đến trang chủ Booki" width={192} height={192} decoding="async" className="h-48 w-48 rounded-2xl bg-white p-2 shadow-[0_14px_36px_rgb(0_0_0_/_0.2)]" />
          ) : (
            <div className="grid h-48 w-48 place-items-center rounded-2xl bg-[rgb(var(--color-interactive-surface)/.8)] p-4 text-center text-sm text-text-muted" role="status">
              Chưa tạo được mã QR. Bạn vẫn có thể dùng liên kết bên cạnh.
            </div>
          )}
          <Button variant="outline" size="sm" disabled={!qr} onClick={downloadQr}>Tải mã QR PNG</Button>
        </div>
      </div>
    </section>
  )
}
