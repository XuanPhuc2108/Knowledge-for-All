import clsx from 'clsx'
import { useState } from 'react'
import { BOOK_CATEGORIES } from '../lib/constants'
import { validateBookForm } from '../lib/validation'
import type { BookCondition, CreateBookInput, ExchangeType } from '../types/book'

interface BookFormProps {
  initial?: Partial<CreateBookInput>
  onSubmit: (data: CreateBookInput) => Promise<void>
  useLocation?: boolean
  locationEnabled?: boolean
  imageUrls: string[]
  onImageCapture: (url: string) => void
  submitLabel?: string
  cameraSlot: React.ReactNode
}

const OTHER_CATEGORY_LABEL = 'Khác'
const OTHER_CATEGORY_VALUE = '__other__'
const CATEGORY_OPTIONS = BOOK_CATEGORIES.filter((category) => category !== OTHER_CATEGORY_LABEL)

const liquidControlClass = clsx(
  'w-full rounded-xl bg-white/5 px-4 py-2.5 text-white backdrop-blur-md',
  'border border-white/10 outline-none transition-all',
  'placeholder:text-white/40 focus:border-amber-500 focus:ring-1 focus:ring-amber-500',
)

function getInitialCategoryState(category?: string) {
  if (!category) return { choice: '', custom: '' }
  if ((BOOK_CATEGORIES as readonly string[]).includes(category)) {
    return { choice: category, custom: '' }
  }
  return { choice: OTHER_CATEGORY_VALUE, custom: category }
}

export function BookForm({
  initial,
  onSubmit,
  useLocation: useLoc = false,
  locationEnabled = false,
  imageUrls,
  submitLabel = 'Đăng sách',
  cameraSlot,
}: BookFormProps) {
  const initialCategory = getInitialCategoryState(initial?.category)
  const [categoryChoice, setCategoryChoice] = useState(initialCategory.choice)
  const [customCategory, setCustomCategory] = useState(initialCategory.custom)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const selectedCategory = fd.get('category') as string
    const data = {
      title: fd.get('title') as string,
      author: (fd.get('author') as string) || undefined,
      category: selectedCategory === OTHER_CATEGORY_VALUE ? customCategory.trim() : selectedCategory,
      condition: fd.get('condition') as BookCondition,
      exchangeType: fd.get('exchangeType') as ExchangeType,
      description: fd.get('description') as string,
      contactPhone: (fd.get('contactPhone') as string).trim() || undefined,
      contactEmail: (fd.get('contactEmail') as string).trim().toLowerCase() || undefined,
    }

    const errors = validateBookForm(data)
    const errorEl = document.getElementById('form-errors')
    if (Object.keys(errors).length > 0) {
      if (errorEl) {
        errorEl.textContent = Object.values(errors).join('. ')
        errorEl.classList.remove('hidden')
      }
      return
    }
    if (errorEl) errorEl.classList.add('hidden')

    await onSubmit({
      ...data,
      imageUrls,
      ...(useLoc && locationEnabled ? {} : {}),
    })
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {cameraSlot}

      <div id="form-errors" className="hidden text-sm text-accent-rose" role="alert" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên sách *" name="title" defaultValue={initial?.title} placeholder="Tên sách của bạn" required />
        <Field label="Tác giả" name="author" defaultValue={initial?.author} placeholder="Tác giả" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-text-primary">
            Thể loại *
          </label>
          <select
            id="category"
            name="category"
            value={categoryChoice}
            onChange={(e) => {
              setCategoryChoice(e.target.value)
              if (e.target.value !== OTHER_CATEGORY_VALUE) setCustomCategory('')
            }}
            required
            className={clsx(liquidControlClass, '[&>option]:bg-dark [&>option]:text-white')}
          >
            <option value="" disabled>Chọn thể loại</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value={OTHER_CATEGORY_VALUE}>{OTHER_CATEGORY_LABEL}</option>
          </select>

          {categoryChoice === OTHER_CATEGORY_VALUE && (
            <div className="mt-3">
              <label htmlFor="customCategory" className="mb-1.5 block text-sm font-medium text-text-primary">
                Nhập thể loại *
              </label>
              <input
                id="customCategory"
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Ví dụ: Tâm lý học, Nghệ thuật..."
                required
                autoFocus
                className={liquidControlClass}
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="condition" className="mb-1.5 block text-sm font-medium text-text-primary">
            Tình trạng *
          </label>
          <select
            id="condition"
            name="condition"
            defaultValue={initial?.condition ?? 'good'}
            required
            className={clsx(liquidControlClass, '[&>option]:bg-dark [&>option]:text-white')}
          >
            <option value="new">Mới</option>
            <option value="good">Tốt</option>
            <option value="used">Đã dùng</option>
            <option value="old">Cũ</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="exchangeType" className="mb-1.5 block text-sm font-medium text-text-primary">
          Hình thức *
        </label>
        <select
          id="exchangeType"
          name="exchangeType"
          defaultValue={initial?.exchangeType ?? 'share'}
          required
          className={clsx(liquidControlClass, '[&>option]:bg-dark [&>option]:text-white')}
        >
          <option value="share">Chia sẻ</option>
          <option value="exchange">Trao đổi</option>
          <option value="borrow">Cho mượn</option>
        </select>
      </div>

      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-text-primary">
          Mô tả *
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={initial?.description}
          placeholder="Mô tả ngắn về sách (ít nhất 20 ký tự)"
          required
          minLength={20}
          className={clsx(liquidControlClass, 'resize-none')}
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">Thông tin liên hệ trên bài đăng (không bắt buộc)</p>
          <p className="mt-1 text-xs text-text-muted">
            Chỉ thông tin bạn nhập mới hiển thị trên sách đã đăng. Để trống nếu không muốn chia sẻ.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Số điện thoại"
            name="contactPhone"
            defaultValue={initial?.contactPhone}
            placeholder="0901234567"
            type="tel"
          />
          <Field
            label="Email liên hệ"
            name="contactEmail"
            defaultValue={initial?.contactEmail}
            placeholder="ban@email.com"
            type="email"
          />
        </div>
      </div>

      {locationEnabled && (
        <label className="flex items-center gap-3 text-sm text-text-muted">
          <input type="checkbox" name="useLocation" defaultChecked className="h-4 w-4 rounded accent-accent-yellow" />
          Dùng vị trí hiện tại cho sách này
        </label>
      )}

      <button
        type="submit"
        className={clsx(
          'inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold',
          'border border-white/10 bg-white/5 text-white backdrop-blur-md outline-none transition-all',
          'hover:border-amber-500/60 hover:bg-white/10 hover:shadow-lg hover:shadow-amber-500/10',
          'focus:border-amber-500 focus:ring-1 focus:ring-amber-500',
        )}
      >
        {submitLabel}
      </button>
    </form>
  )
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  type = 'text',
}: {
  label: string
  name: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  type?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-text-primary">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className={liquidControlClass}
      />
    </div>
  )
}
