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

  return (
    <span className={clsx('relative block overflow-hidden', wrapperClassName)}>
      {!loaded && (
        <span
          className={clsx('absolute inset-0 animate-pulse bg-white/5', skeletonClassName)}
          aria-hidden="true"
        />
      )}
      <img
        {...props}
        src={currentSrc}
        onLoad={(event) => {
          setLoadedSource(currentSrc)
          onLoad?.(event)
        }}
        onError={(event) => {
          if (fallbackSrc && currentSrc === src) {
            setFailedSource(src)
            return
          }
          setLoadedSource(currentSrc)
          onError?.(event)
        }}
        className={clsx(
          className,
          'transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </span>
  )
}
