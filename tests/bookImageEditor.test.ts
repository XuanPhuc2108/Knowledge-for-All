import assert from 'node:assert/strict'
import test from 'node:test'
import {
  adjustImageChannel,
  createInitialImageEditState,
  getCropFromDrag,
  getCropPixelBounds,
  MAX_IMAGE_EDIT_HISTORY,
  pushImageEditHistory,
  redoImageEdit,
  undoImageEdit,
  validateEditedImageBlob,
  type CropRect,
  type ImageEditHistory,
  type ImageEditState,
} from '../src/lib/bookImageEditor.ts'

const fullCrop: CropRect = { x: 0, y: 0, width: 1, height: 1 }

test('free and fixed-ratio crops stay within the visible source crop', () => {
  const square = getCropFromDrag(fullCrop, { x: 0.1, y: 0.1 }, { x: 0.7, y: 0.7 }, 4 / 3, 1)
  assert.ok(square)
  assert.ok(Math.abs((square.width * 4 / 3) / square.height - 1) < 0.01)

  const bookRatio = getCropFromDrag(fullCrop, { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.8 }, 4 / 3, 4 / 3)
  assert.ok(bookRatio)
  assert.ok(Math.abs((bookRatio.width * 4 / 3) / bookRatio.height - 4 / 3) < 0.01)

  const fromBottomRight = getCropFromDrag(fullCrop, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.2 }, 1, null)
  assert.ok(fromBottomRight)
  assert.ok(fromBottomRight.x >= 0 && fromBottomRight.y >= 0)
  assert.ok(fromBottomRight.x + fromBottomRight.width <= 1)
  assert.ok(fromBottomRight.y + fromBottomRight.height <= 1)
})

test('crop pixel bounds produce the expected output dimensions', () => {
  assert.deepEqual(
    getCropPixelBounds({ x: 0.25, y: 0.1, width: 0.5, height: 0.6 }, 1200, 1000),
    { left: 300, top: 100, width: 600, height: 600 },
  )
})

test('brightness and contrast retain neutral pixels and clamp output values', () => {
  assert.equal(adjustImageChannel(120, 100, 100), 120)
  assert.ok(adjustImageChannel(120, 130, 100) > 120)
  assert.ok(adjustImageChannel(200, 100, 150) > adjustImageChannel(120, 100, 150))
  assert.equal(adjustImageChannel(255, 150, 150), 255)
  assert.equal(adjustImageChannel(0, 50, 150), 0)
})

test('edit history supports undo, redo, and discards redo after a new edit', () => {
  const original = createInitialImageEditState()
  const bright: ImageEditState = { ...original, brightness: 120 }
  const contrast: ImageEditState = { ...bright, contrast: 130 }
  let history: ImageEditHistory = { past: [], future: [] }
  history = pushImageEditHistory(history, original)
  history = pushImageEditHistory(history, bright)

  const undone = undoImageEdit(history, contrast)
  assert.ok(undone)
  assert.equal(undone.state.brightness, 120)
  assert.equal(undone.state.contrast, 100)

  const redone = redoImageEdit(undone.history, undone.state)
  assert.ok(redone)
  assert.equal(redone.state.contrast, 130)

  const branched = pushImageEditHistory(undone.history, undone.state)
  assert.equal(branched.future.length, 0)
  assert.equal(redoImageEdit(branched, original), null)
})

test('edit history has a fixed memory bound and reset state is neutral', () => {
  let state = createInitialImageEditState()
  let history: ImageEditHistory = { past: [], future: [] }
  for (let value = 101; value <= 125; value += 1) {
    const next = { ...state, brightness: value }
    history = pushImageEditHistory(history, state)
    state = next
  }
  assert.equal(history.past.length, MAX_IMAGE_EDIT_HISTORY)
  assert.equal(state.brightness, 125)
  assert.deepEqual(createInitialImageEditState(), {
    crop: fullCrop,
    brightness: 100,
    contrast: 100,
    strokes: [],
    brushSize: 44,
    blurStrength: 12,
  })

  test('edited image exports must contain supported non-empty image data', () => {
    const image = new Blob(['encoded pixels'], { type: 'image/webp' })
    assert.equal(validateEditedImageBlob(image), image)
    assert.throws(
      () => validateEditedImageBlob(new Blob([], { type: 'image/webp' })),
      /Không thể xuất ảnh đã chỉnh sửa/,
    )
    assert.throws(
      () => validateEditedImageBlob(new Blob(['pixels'], { type: 'text/plain' })),
      /Không thể xuất ảnh đã chỉnh sửa/,
    )
  })
})
