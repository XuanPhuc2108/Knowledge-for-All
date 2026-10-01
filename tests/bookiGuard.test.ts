import assert from 'node:assert/strict'
import test from 'node:test'
import { localModerationProvider } from '../src/lib/bookiGuard.ts'

test('a complete ordinary book listing receives a low-risk advisory', async () => {
  const result = await localModerationProvider.moderateText({
    title: 'Cho tôi xin một vé đi tuổi thơ',
    author: 'Nguyễn Nhật Ánh',
    category: 'Văn học',
    description: 'Sách còn tốt, phù hợp để đọc trong những ngày nghỉ cuối tuần.',
  })

  assert.equal(result.riskLevel, 'LOW')
  assert.equal(result.source, 'RULES')
  assert.match(result.reasons[0], /Chưa phát hiện/)
})

test('promotional spam, repeated characters, and several URLs are high risk', async () => {
  const result = await localModerationProvider.moderateText({
    title: 'Mua ngay sách hayyyyyy',
    description: 'Click ngay, kiếm tiền nhanh tại đây https://example.test và https://other.test',
  })

  assert.equal(result.riskLevel, 'HIGH')
  assert.ok(result.reasons.some((reason) => /đường dẫn bên ngoài/.test(reason)))
  assert.ok(result.reasons.some((reason) => /ký tự lặp/.test(reason)))
  assert.ok(result.reasons.some((reason) => /quảng bá/.test(reason)))
})

test('suspicious URLs and repeated wording are explainable medium-risk signals', async () => {
  const result = await localModerationProvider.moderateText({
    title: 'Sách tham khảo',
    description: 'đọc sách hay đọc sách hay đọc sách hay đọc sách hay đọc sách hay đọc sách hay đọc sách hay',
  })

  assert.equal(result.riskLevel, 'MEDIUM')
  assert.ok(result.reasons.some((reason) => /lặp lại từ ngữ/.test(reason)))
})

test('a duplicate title and author is flagged for staff comparison', async () => {
  const result = await localModerationProvider.moderateText({
    title: 'Dế Mèn Phiêu Lưu Ký',
    author: 'Tô Hoài',
    description: 'Sách được giữ gìn cẩn thận và còn đọc tốt.',
    similarTitles: ['Dế Mèn Phiêu Lưu Ký'],
  })

  assert.equal(result.riskLevel, 'MEDIUM')
  assert.ok(result.reasons.some((reason) => /bài đăng khác cùng tiêu đề/.test(reason)))
})

test('potentially inappropriate words are contextual review signals, not removal decisions', async () => {
  const result = await localModerationProvider.moderateText({
    title: 'Sách tham khảo',
    description: 'A shit happens story, but the book is otherwise in good condition.',
  })

  assert.equal(result.riskLevel, 'MEDIUM')
  assert.ok(result.reasons.some((reason) => /xem xét trong ngữ cảnh/.test(reason)))
})

test('report reasons are signals, while private contacts are not copied into explanations', async () => {
  const result = await localModerationProvider.moderateText({
    title: 'Sách tham khảo',
    description: 'Gọi 1234567890 hoặc 2345678901 để nhận thêm thông tin về sách.',
    reportReason: 'inappropriate',
  })

  assert.equal(result.riskLevel, 'MEDIUM')
  assert.ok(result.reasons.some((reason) => /Cộng đồng đã báo cáo/.test(reason)))
  assert.ok(result.reasons.some((reason) => /chuỗi liên hệ/.test(reason)))
  assert.equal(result.reasons.some((reason) => /1234567890|2345678901/.test(reason)), false)
})

test('images are explicitly left for manual review without network classification', async () => {
  const result = await localModerationProvider.moderateImage({ imageUrl: 'https://example.test/book.jpg' })

  assert.equal(result.status, 'manual_review_required')
  assert.equal(result.source, 'RULES')
})
