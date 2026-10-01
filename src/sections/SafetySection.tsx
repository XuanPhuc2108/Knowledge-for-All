import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { FadeIn } from '../components/FadeIn'

const SAFETY_CARDS = [
  'Mình tự chọn thông tin liên hệ nào được hiện',
  'Không công khai vị trí chính xác của thành viên',
  'Hỏi rõ tình trạng sách trước khi nhận',
  'Hẹn trao sách ở chỗ an toàn, thuận tiện cho đôi bên',
]

export function SafetySection() {
  return (
    <section id="safety" className="px-5 py-20 sm:px-8 md:py-32 lg:px-16">
      <FadeIn className="mb-12 text-center">
        <h2
          className="font-black text-text-primary"
          style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)' }}
        >
          Chia sẻ sách vui, gặp nhau vẫn nhớ an toàn
        </h2>
      </FadeIn>

      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
        {SAFETY_CARDS.map((text, i) => (
          <FadeIn key={text} delay={i * 0.1}>
            <motion.article
              whileHover={{ y: -3 }}
              className="glass-card group rounded-2xl p-6 transition-shadow hover:shadow-[0_18px_48px_rgb(251_191_36_/_0.06)] lg:rounded-[1.5rem]"
            >
              <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-accent-yellow/20 bg-accent-yellow/[0.08]">
                <ShieldCheck className="h-5 w-5 text-accent-yellow transition-colors group-hover:text-amber-300" />
              </span>
              <p className="font-medium text-text-primary">{text}</p>
            </motion.article>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
