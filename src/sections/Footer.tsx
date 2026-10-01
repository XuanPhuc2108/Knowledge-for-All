import { BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AnimatedText } from '../components/AnimatedText'
import { Magnetic } from '../components/Magnetic'
import { APP_NAME } from '../lib/constants'

export function Footer() {
  return (
    <footer
      className="main-wrapper relative overflow-x-clip border-t border-glass/10 bg-dark px-5 py-20 sm:px-8 lg:px-16 lg:py-24"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,215,77,0.45), rgba(192,192,192,0.35), transparent)',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-16 flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <Magnetic strength={5} padding={60}>
            <Link
              to="/"
              className="group flex items-center gap-3 transition-colors duration-150"
            >
              <BookOpen className="h-7 w-7 text-accent-yellow transition-transform duration-300 ease-awwwards group-hover:scale-105" />
              <span className="text-lg font-black uppercase tracking-tighter text-text-primary">
                {APP_NAME}
              </span>
            </Link>
          </Magnetic>

          <AnimatedText
            text="Có sách hay thì share liền tay; đang kiếm sách thì ghé Booki. Biết đâu lại gặp đúng cuốn đang tìm."
            scrollReveal
            className="max-w-xl text-sm leading-relaxed text-text-muted md:text-base"
          />
        </div>

        <div className="booki-credit-section mb-14">
          <h2 className="booki-credit-heading">Người đứng sau Booki</h2>

          <div className="booki-credit-lead-wrap">
            <div className="booki-credit-orbit booki-credit-orbit-one" aria-hidden="true">
              <span />
            </div>
            <div className="booki-credit-orbit booki-credit-orbit-two" aria-hidden="true">
              <span />
            </div>
            <article className="booki-credit-lead">
              <p className="booki-credit-role">Trưởng nhóm · Người phát triển chính</p>
              <h3>Nguyễn Xuân Phúc</h3>
              <p className="booki-credit-text">
                Người lên ý tưởng, xây dựng và hoàn thiện phần lớn website Booki.
              </p>
              <span className="booki-credit-mark">BOOKI <span aria-hidden="true">·</span> PROJECT</span>
            </article>
          </div>

          <div className="booki-credit-support">
            <article className="booki-credit-mini">
              <span>Nguyễn Thanh Trạng</span>
              <small>Kiểm thử</small>
            </article>
            <article className="booki-credit-mini">
              <span>Cô Phạm Nguyễn Cẩm Tú</span>
              <small>Định hướng và cố vấn</small>
            </article>
          </div>
        </div>

        <div className="mb-12 text-center">
          <h2 className="mb-3 font-black leading-[0.95] tracking-[-0.06em] text-[clamp(2.25rem,7vw,5.5rem)] text-text-primary">
            Kiếm sách gì nè?
          </h2>
          <p className="text-[clamp(1rem,2.5vw,1.5rem)] font-medium tracking-wide text-accent-yellow">
            Sách hay, share liền tay.
          </p>
        </div>

        <p className="text-center text-xs text-text-muted md:text-left">
          © {new Date().getFullYear()} {APP_NAME}. Tất cả quyền được bảo lưu.
        </p>
      </div>
    </footer>
  )
}
