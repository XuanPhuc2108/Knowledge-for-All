import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { BOOK_CATEGORIES } from '../lib/constants'
import { validateBookForm } from '../lib/validation'
import type { BookCondition, CreateBookInput, ExchangeType } from '../types/book'
import { Button } from './Button'

interface BookFormProps {
  initial?: Partial<CreateBookInput>
  onSubmit: (data: CreateBookInput) => Promise<void>
  useLocation?: boolean
  locationEnabled?: boolean
  imageUrls: string[]
  onImageCapture: (url: string) => void
  submitLabel?: string
  isSubmitting?: boolean
  cameraSlot: React.ReactNode
}

const OTHER_CATEGORY_LABEL = 'Khác'
const OTHER_CATEGORY_VALUE = '__other__'
const CATEGORY_OPTIONS = BOOK_CATEGORIES.filter((category) => category !== OTHER_CATEGORY_LABEL)

const liquidControlClass = clsx(
  'field-control px-4 py-3 text-sm',
  'transition-[border-color,background-color,box-shadow] duration-150',
  'placeholder:text-text-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow',
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
  isSubmitting = false,
  cameraSlot,
}: BookFormProps) {
  const initialCategory = getInitialCategoryState(initial?.category)
  const [categoryChoice, setCategoryChoice] = useState(initialCategory.choice)
  const [customCategory, setCustomCategory] = useState(initialCategory.custom)
  const categoryLabel = categoryChoice === OTHER_CATEGORY_VALUE
    ? OTHER_CATEGORY_LABEL
    : categoryChoice
  const updateCategory = (value: string) => {
    setCategoryChoice(value)
    if (value !== OTHER_CATEGORY_VALUE) setCustomCategory('')
  }

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
      contactZaloUrl: (fd.get('contactZaloUrl') as string).trim() || undefined,
      contactMessengerUrl: (fd.get('contactMessengerUrl') as string).trim() || undefined,
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
          <CategoryDropdown
            id="category"
            value={categoryChoice}
            label={categoryLabel}
            onChange={updateCategory}
          />

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

      <div className="space-y-3 rounded-2xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.65)] p-4 sm:p-5">
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
          <Field
            label="Link Zalo"
            name="contactZaloUrl"
            defaultValue={initial?.contactZaloUrl}
            placeholder="https://zalo.me/..."
            type="url"
          />
          <Field
            label="Link Messenger"
            name="contactMessengerUrl"
            defaultValue={initial?.contactMessengerUrl}
            placeholder="https://m.me/..."
            type="url"
          />
        </div>
      </div>

      {locationEnabled && (
        <label className="flex items-center gap-3 text-sm text-text-muted">
          <input type="checkbox" name="useLocation" defaultChecked className="h-4 w-4 rounded accent-accent-yellow" />
          Dùng vị trí hiện tại cho sách này
        </label>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="w-full disabled:cursor-wait"
      >
        {submitLabel}
      </Button>
    </form>
  )
}

function CategoryDropdown({
  id,
  value,
  label,
  onChange,
}: {
  id: string
  value: string
  label: string
  onChange: (value: string) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion()
  const options = [
    { label: 'Chọn thể loại', value: '', disabled: true },
    ...CATEGORY_OPTIONS.map((category) => ({ label: category, value: category })),
    { label: OTHER_CATEGORY_LABEL, value: OTHER_CATEGORY_VALUE },
  ]
  const selectedIndex = options.findIndex((option) => option.value === value)
  const enabledIndices = options.flatMap((option, index) => option.disabled ? [] : [index])

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [open])

  const showOptions = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    const roomBelow = rect ? window.innerHeight - rect.bottom : window.innerHeight
    const roomAbove = rect?.top ?? 0
    setOpenUp(roomBelow < Math.min(224, window.innerHeight * 0.4) && roomAbove > roomBelow)
    setActiveIndex(
      selectedIndex >= 0 && !options[selectedIndex].disabled
        ? selectedIndex
        : enabledIndices[0],
    )
    setOpen(true)
  }

  const chooseOption = (option: (typeof options)[number]) => {
    onChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        showOptions()
        return
      }
      const direction = event.key === 'ArrowDown' ? 1 : -1
      const currentPosition = enabledIndices.indexOf(activeIndex)
      const nextPosition = (currentPosition + direction + enabledIndices.length) % enabledIndices.length
      setActiveIndex(enabledIndices[nextPosition])
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      if (!open) showOptions()
      setActiveIndex(event.key === 'Home' ? enabledIndices[0] : enabledIndices[enabledIndices.length - 1])
      return
    }
    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault()
      if (!options[activeIndex].disabled) chooseOption(options[activeIndex])
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name="category" value={value} />
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        aria-required="true"
        onClick={() => (open ? setOpen(false) : showOptions())}
        onKeyDown={handleKeyDown}
        className={clsx(
          liquidControlClass,
          'flex min-h-12 items-center justify-between gap-3 text-left',
          'focus-visible:border-accent-yellow/60 focus-visible:ring-2 focus-visible:ring-accent-yellow/25',
          open && 'border-accent-yellow/40',
        )}
      >
        <span className={value ? 'text-text-primary' : 'text-text-muted'}>{label || 'Chọn thể loại'}</span>
        <ChevronDown
          aria-hidden="true"
          className={clsx(
            'h-4 w-4 shrink-0 text-text-muted transition-transform duration-150',
            open && 'rotate-180 text-accent-yellow',
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={`${id}-options`}
            role="listbox"
            aria-labelledby={id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: openUp ? 4 : -4, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: openUp ? 4 : -4, scale: 0.99 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.14, ease: 'easeOut' }}
            className={clsx(
              'absolute z-50 max-h-[min(14rem,40dvh)] w-full overflow-y-auto overscroll-contain',
              'rounded-xl border border-glass/10 bg-[rgb(var(--color-dark-secondary)/.97)] p-1.5',
              'shadow-[0_16px_36px_rgb(0_0_0_/_0.28)] backdrop-blur-xl',
              openUp ? 'bottom-full mb-2' : 'top-full mt-2',
            )}
          >
            {options.map((option, index) => {
              const selected = option.value === value
              const active = index === activeIndex
              return (
                <div
                  key={option.value}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={option.disabled || undefined}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => { if (!option.disabled) chooseOption(option) }}
                  className={clsx(
                    'flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm',
                    'transition-[background-color,color] duration-150',
                    option.disabled
                      ? 'cursor-default text-text-muted'
                      : 'cursor-pointer',
                    selected
                      ? 'bg-accent-yellow/[0.11] font-medium text-accent-yellow'
                      : !option.disabled && 'text-text-primary',
                    active && !selected && 'bg-accent-yellow/[0.07]',
                  )}
                >
                  <span>{option.label}</span>
                  {selected && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-accent-yellow" />}
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
