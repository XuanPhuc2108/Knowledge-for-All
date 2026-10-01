import { Camera, HeartHandshake, MapPin, UserPlus } from 'lucide-react'
import { FadeIn } from '../components/FadeIn'

const STEPS = [
  {
    num: '01',
    title: 'Tạo tài khoản',
    desc: 'Đăng ký bằng email và xác nhận mã OTP, hoặc đăng nhập nhanh bằng Google/Facebook.',
    icon: UserPlus,
    tone: 'bg-accent-yellow/[0.13] border-accent-yellow/20',
  },
  {
    num: '02',
    title: 'Bật định vị',
    desc: 'Bật định vị để tìm sách gần bạn. Không muốn chia sẻ vị trí thì vẫn xem được toàn bộ sách.',
    icon: MapPin,
    tone: 'bg-[rgb(var(--color-interactive-surface)/.82)] border-glass/10',
  },
  {
    num: '03',
    title: 'Chụp ảnh & đăng sách',
    desc: 'Chụp bìa, ghi vài dòng thiệt tình rồi chọn cho mượn, trao đổi hay tặng.',
    icon: Camera,
    tone: 'bg-[rgb(var(--color-interactive-surface)/.82)] border-glass/10',
  },
  {
    num: '04',
    title: 'Kết nối & trao đổi',
    desc: 'Xem thông tin liên hệ, gửi lời đề nghị và thống nhất cách trao sách.',
    icon: HeartHandshake,
    tone: 'bg-accent-yellow/[0.13] border-accent-yellow/20',
  },
]

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="how-it-works-section rounded-t-[2rem] border-y px-5 py-20 sm:rounded-t-[2.75rem] sm:px-8 md:py-28 lg:rounded-t-[3.5rem] lg:px-16"
    >
      <FadeIn className="mb-16 text-center">
        <h2
          className="mx-auto max-w-4xl font-black text-text-primary"
          style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)' }}
        >
          Muốn share sách? Mấy bước là xong
        </h2>
      </FadeIn>

      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 sm:gap-5">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <FadeIn key={step.num} delay={i * 0.1}>
              <article className={`step-card h-full rounded-[1.5rem] border p-5 text-text-primary shadow-[0_12px_32px_rgb(0_0_0_/_0.1)] transition-transform duration-200 hover:-translate-y-1 sm:p-7 ${step.tone}`}>
                <div className="flex items-start gap-6">
                  <span className="text-4xl font-black tracking-[-0.08em] text-accent-yellow/50 md:text-6xl">{step.num}</span>
                  <div>
                    <div className="mb-3 flex items-center gap-3">
                      <Icon className="h-6 w-6" />
                      <h3 className="text-xl font-bold">{step.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-text-muted">{step.desc}</p>
                  </div>
                </div>
              </article>
            </FadeIn>
          )
        })}
      </div>
    </section>
  )
}
