import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { FadeIn } from '../components/FadeIn'

const SAFETY_CARDS = [
  'Tự quyết định thông tin chia sẻ',
  'Không công khai vị trí chính xác',
  'Kiểm tra tình trạng sách trước khi nhận',
  'Hẹn gặp ở nơi phù hợp',
]

export function SafetySection() {
  return (
    <section id="safety" className="px-5 py-20 sm:px-8 md:py-32 lg:px-16">
      <FadeIn className="mb-12 text-center">
        <h2
          className="font-black text-text-primary"
          style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)' }}
        >
          Chia sẻ văn minh và an toàn
        </h2>
      </FadeIn>

      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
        {SAFETY_CARDS.map((text, i) => (
          <FadeIn key={text} delay={i * 0.1}>
            <motion.article
              whileHover={{ rotateX: 2, rotateY: -2 }}
              className="glass-card group rounded-card p-6 transition-shadow hover:shadow-lg hover:shadow-accent-purple/10 lg:rounded-card-lg"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <ShieldCheck className="mb-4 h-8 w-8 text-accent-teal transition-colors group-hover:text-accent-yellow" />
              <p className="font-medium text-text-primary">{text}</p>
            </motion.article>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
