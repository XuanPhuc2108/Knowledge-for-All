export interface PreparedBookImages {
  imageUrls: string[]
  uploadedPaths: string[]
}

export async function runBookSubmission<T>(
  lock: { current: boolean },
  setSaving: (saving: boolean) => void,
  submit: () => Promise<T>,
): Promise<T | undefined> {
  if (lock.current) return undefined
  lock.current = true
  try {
    setSaving(true)
    return await submit()
  } finally {
    lock.current = false
    setSaving(false)
  }
}

export function scheduleBookImageCleanup(cleanup: () => Promise<void>) {
  void Promise.resolve()
    .then(cleanup)
    .catch((cleanupError: unknown) => {
      console.error(
        'Unable to clean up uploaded book-cover images',
        cleanupError instanceof Error ? cleanupError.message : 'Unexpected cleanup error',
      )
    })
}

export async function completeBookCreation<T>(
  prepareImages: () => Promise<PreparedBookImages>,
  insertBook: (imageUrls: string[]) => Promise<T>,
  cleanupUploadedImages: (paths: string[]) => Promise<void>,
  onSavingRecord?: () => void,
): Promise<T> {
  const images = await prepareImages()
  try {
    onSavingRecord?.()
    return await insertBook(images.imageUrls)
  } catch (cause) {
    if (images.uploadedPaths.length > 0) {
      scheduleBookImageCleanup(() => cleanupUploadedImages(images.uploadedPaths))
    }
    throw cause
  }
}
