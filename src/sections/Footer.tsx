import { BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AnimatedText } from '../components/AnimatedText'
import { Magnetic } from '../components/Magnetic'
import { APP_NAME } from '../lib/constants'

const TEAM = [
  {
    name: 'Nguyễn Xuân Phúc',
    role: 'Trưởng nhóm · Phụ trách chính',
    contribution: 'Lên ý tưởng, xây dựng và hoàn thiện website.',
    email: 'nguyenxuanphucdongthap123@gmail.com',
  },
  {
    name: 'Nguyễn Thanh Trạng',
    role: 'Kiểm thử',
    contribution: 'Kiểm tra các tính năng và trải nghiệm sử dụng.',
  },
  {
    name: 'Cô Phạm Nguyễn Cẩm Tú',
    role: 'Chỉ đạo',
    contribution: 'Định hướng và chỉ đạo quá trình thực hiện.',
  },
]

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
            text="Có sách hay thì share, đang kiếm sách thì ghé Booki nghen. Mình kết nối với nhau để sách được đọc thêm nhiều lần."
            scrollReveal
            className="max-w-xl text-sm leading-relaxed text-text-muted md:text-base"
          />
        </div>

        <div className="mb-20 text-center">
          <h2 className="mb-3 font-black leading-[0.95] tracking-[-0.06em] text-[clamp(2.25rem,7vw,5.5rem)] text-text-primary">
            Kiếm sách gì nè?
          </h2>
          <p className="text-[clamp(1rem,2.5vw,1.5rem)] font-medium tracking-wide text-accent-yellow">
            Sách hay, share liền tay.
          </p>
        </div>

        <div className="mb-16 flex justify-center px-2">
          <div className="w-full max-w-4xl">
            <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Đội ngũ phát triển
            </p>
            <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
              {TEAM.map((member, index) => (
                <article key={member.name} className={`team-member-card ${index === 0 ? 'team-member-lead sm:col-span-2' : ''}`}>
                  {index === 0 && <span className="team-lead-orbit" aria-hidden="true" />}
                  {index === 0 && <span className="team-member-badge">TRƯỞNG NHÓM</span>}
                  <p className="text-base font-bold tracking-tight text-text-primary md:text-lg">
                    {member.name}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">{member.role}</p>
                  <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-text-muted">{member.contribution}</p>
                  {member.email && (
                    <a href={`mailto:${member.email}`} className="mt-2 block break-all text-xs text-accent-yellow hover:underline">
                      {member.email}
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-text-muted md:text-left">
          © {new Date().getFullYear()} {APP_NAME}. Tất cả quyền được bảo lưu.
        </p>
      </div>
    </footer>
  )
}
