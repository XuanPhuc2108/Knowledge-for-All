import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.SUPABASE_URL?.trim()
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
if (!rawUrl || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local environment before running this migration.')
}

const projectUrl = new URL(rawUrl)
projectUrl.pathname = projectUrl.pathname.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
const supabase = createClient(projectUrl.toString().replace(/\/+$/, ''), serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const bucket = 'book-covers'
const pageSize = 50
let migratedBooks = 0
let migratedImages = 0

function parseImageDataUrl(value) {
  const match = /^data:(image\/(?:webp|jpeg|png));base64,([\s\S]+)$/i.exec(value)
  if (!match) throw new Error('Encountered a book cover data URL with an unsupported image format.')
  const mimeType = match[1].toLowerCase()
  const extension = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }[mimeType]
  const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64')
  if (!bytes.length) throw new Error('Encountered an empty book cover image.')
  return { bytes, extension, mimeType }
}

async function removeUploaded(paths) {
  if (!paths.length) return
  const { error } = await supabase.storage.from(bucket).remove(paths)
  if (error) console.error('Could not clean up an incomplete image migration batch.')
}

for (let offset = 0; ; offset += pageSize) {
  const { data: books, error } = await supabase
    .from('books')
    .select('id, owner_id, image_urls')
    .order('id', { ascending: true })
    .range(offset, offset + pageSize - 1)
  if (error) throw new Error(`Could not read book listings at offset ${offset}: ${error.message}`)
  if (!books?.length) break

  for (const book of books) {
    const currentUrls = Array.isArray(book.image_urls) ? book.image_urls : []
    const nextUrls = [...currentUrls]
    const uploadedPaths = []
    let changed = false
    try {
      for (let index = 0; index < currentUrls.length; index += 1) {
        const currentUrl = currentUrls[index]
        if (typeof currentUrl !== 'string' || !currentUrl.startsWith('data:')) continue
        const { bytes, extension, mimeType } = parseImageDataUrl(currentUrl)
        const path = `${book.owner_id}/${book.id}/${randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, {
          cacheControl: '31536000',
          contentType: mimeType,
          upsert: false,
        })
        if (uploadError) throw new Error(`Could not upload a cover for book ${book.id}: ${uploadError.message}`)
        uploadedPaths.push(path)
        nextUrls[index] = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
        migratedImages += 1
        changed = true
      }

      if (!changed) continue
      const { error: updateError } = await supabase
        .from('books')
        .update({ image_urls: nextUrls })
        .eq('id', book.id)
        .eq('owner_id', book.owner_id)
      if (updateError) throw new Error(`Could not save migrated covers for book ${book.id}: ${updateError.message}`)
      migratedBooks += 1
    } catch (cause) {
      await removeUploaded(uploadedPaths)
      throw cause
    }
  }

  if (books.length < pageSize) break
}

console.info(`Book cover migration finished: ${migratedImages} images updated across ${migratedBooks} books.`)
