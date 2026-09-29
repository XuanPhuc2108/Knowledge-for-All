import clsx from 'clsx'
import { useState, type ImgHTMLAttributes } from 'react'

interface ImageWithSkeletonProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string
  fallbackSrc?: string
  wrapperClassName?: string
  skeletonClassName?: string
}

export function ImageWithSkeleton({
  src,
  fallbackSrc,
  wrapperClassName,
  skeletonClassName,
  className,
  onLoad,
  onError,
  ...props
}: ImageWithSkeletonProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const [loadedSource, setLoadedSource] = useState<string | null>(null)
  const currentSrc = failedSource === src && fallbackSrc ? fallbackSrc : src
  const loaded = loadedSource === currentSrc
  const failed = failedSource === currentSrc
  const loading = props.loading ?? 'lazy'

  return (
    <span className={clsx('relative block overflow-hidden', wrapperClassName)}>
      {!loaded && !failed && (
        <span
          className={clsx('absolute inset-0 animate-pulse bg-[rgb(var(--color-interactive-surface)/.75)]', skeletonClassName)}
          aria-hidden="true"
        />
      )}
      {failed && (
        <span
          className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--color-interactive-surface)/.75)] px-3 text-center text-xs text-text-muted"
          role="status"
        >
          Không thể tải ảnh
        </span>
      )}
      <img
        {...props}
        src={currentSrc}
        loading={loading}
        decoding={props.decoding ?? 'async'}
        onLoad={(event) => {
          setLoadedSource(currentSrc)
          onLoad?.(event)
        }}
        onError={(event) => {
          if (fallbackSrc && currentSrc === src) {
            setFailedSource(src)
            return
          }
          setFailedSource(currentSrc)
          onError?.(event)
        }}
        className={clsx(
          className,
          'transition-opacity duration-200',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </span>
  )
}
