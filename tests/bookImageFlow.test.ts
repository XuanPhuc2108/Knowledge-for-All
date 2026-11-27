import assert from 'node:assert/strict'
import test from 'node:test'
import { dataUrlToBlob } from '../src/lib/imageCompression.ts'
import { classifyUserFacingErrorMessage, userFacingError } from '../src/lib/userFacingError.ts'
import { bookDescriptionUpdate, normalizeBookDescription } from '../src/lib/bookDescription.ts'
import { validateBookForm } from '../src/lib/validation.ts'

const validBook = {
  title: 'Sách tham khảo',
  category: 'Văn học',
  condition: 'good',
  exchangeType: 'share',
  contactPhone: '',
  contactEmail: '',
  contactZaloUrl: '',
  contactMessengerUrl: '',
}

test('book descriptions are optional and non-empty descriptions remain valid', () => {
  for (const description of ['Sách còn mới.', 'Đọc rất ổn.', 'Test app']) {
    assert.equal(validateBookForm({ ...validBook, description }).description, undefined)
  }
  assert.equal(validateBookForm(validBook).description, undefined)
  assert.equal(validateBookForm({ ...validBook, description: '' }).description, undefined)
  assert.equal(validateBookForm({ ...validBook, description: '  \n ' }).description, undefined)
})

test('clearing an optional description stores a compatible empty string', () => {
  assert.equal(normalizeBookDescription(undefined), '')
  assert.equal(normalizeBookDescription(null), '')
  assert.equal(normalizeBookDescription(' \n '), '')
  assert.equal(normalizeBookDescription('  Sách còn mới.  '), '  Sách còn mới.  ')
})

test('book edits omit an untouched description but persist an explicit clear', () => {
  assert.deepEqual(bookDescriptionUpdate(undefined), {})
  assert.deepEqual(bookDescriptionUpdate(''), { description: '' })
  assert.deepEqual(bookDescriptionUpdate('  \n '), { description: '' })
})

test('other required book fields still fail validation when description is omitted', () => {
  const errors = validateBookForm({
    ...validBook,
    title: ' ',
    category: '',
    condition: '',
    exchangeType: '',
  })

  assert.ok(errors.title)
  assert.ok(errors.category)
  assert.ok(errors.condition)
  assert.ok(errors.exchangeType)
  assert.equal(errors.description, undefined)
})

test('compressed data URLs are decoded with their actual supported MIME type', () => {
  const blob = dataUrlToBlob('data:image/webp;base64,aGVsbG8=')
  assert.equal(blob.type, 'image/webp')
  assert.equal(blob.size, 5)
})

test('invalid or unsupported image data URLs are rejected instead of defaulting to JPEG', () => {
  assert.throws(() => dataUrlToBlob('data:image/avif;base64,aGVsbG8='), /Ảnh đã chọn không hợp lệ/)
  assert.throws(() => dataUrlToBlob('data:image/webp;base64,%%%'), /Ảnh đã chọn không hợp lệ/)
})

test('only genuine network failures receive the unstable-connection message', () => {
  assert.match(
    classifyUserFacingErrorMessage('TypeError: Failed to fetch') ?? '',
    /Kết nối đang không ổn định/,
  )
  assert.match(
    classifyUserFacingErrorMessage('Request timed out') ?? '',
    /Kết nối đang không ổn định/,
  )
  assert.equal(
    userFacingError(new Error('Bucket not found'), 'Chưa thể đăng sách.'),
    'Kho lưu trữ ảnh chưa được cấu hình. Kiểm tra bucket book-covers trong Supabase nha.',
  )
  assert.equal(
    classifyUserFacingErrorMessage('new row violates row-level security policy', {
      context: 'storage',
      bucket: 'book-covers',
    }),
    'Chưa có quyền tải ảnh lên kho lưu trữ. Kiểm tra Storage Policy trong Supabase nha.',
  )
  assert.equal(
    classifyUserFacingErrorMessage('Request entity too large', {
      context: 'storage',
      statusCode: '413',
    }),
    'Ảnh sau khi tối ưu vẫn vượt quá giới hạn 5 MB. Hãy chọn ảnh khác nha.',
  )
  assert.equal(
    classifyUserFacingErrorMessage('duplicate key violates unique constraint', {
      context: 'database',
    }),
    'Chưa thể lưu bài đăng. Dữ liệu hoặc cấu hình máy chủ đang có vấn đề.',
  )
  assert.equal(
    classifyUserFacingErrorMessage('Unexpected storage error', { context: 'storage' }),
    'Không thể tải ảnh lên kho lưu trữ. Kiểm tra cấu hình Storage rồi thử lại nha.',
  )
})
