import assert from 'node:assert/strict'
import test from 'node:test'
import {
  adjustImageChannel,
  createInitialImageEditState,
  getCenteredAspectCrop,
  getConservativeContentCrop,
  getCropFromDrag,
  getCropPixelBounds,
  getRotatedImageDimensions,
  getVisibleImageCrop,
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

test('auto-align centers a 3:4 crop without exceeding the source image', () => {
  const wide = getCenteredAspectCrop(1200, 800)
  assert.deepEqual(wide, { x: 0.25, y: 0, width: 0.5, height: 1 })

  const tall = getCenteredAspectCrop(800, 1200)
  assert.equal(tall.x, 0)
  assert.equal(tall.width, 1)
  assert.ok(Math.abs((800 / (1200 * tall.height)) - 3 / 4) < 0.0001)
  assert.ok(tall.y >= 0 && tall.y + tall.height <= 1)

  const square = getCenteredAspectCrop(1000, 1000)
  assert.equal(square.y, 0)
  assert.equal(square.height, 1)
  assert.ok(Math.abs(square.width * 1000 / 1000 - 3 / 4) < 0.0001)
})

test('auto-align rejects invalid source or target dimensions', () => {
  assert.throws(() => getCenteredAspectCrop(0, 1000), /Ảnh không hợp lệ/)
  assert.throws(() => getCenteredAspectCrop(1000, 1000, Number.NaN), /Ảnh không hợp lệ/)
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
    rotation: 0,
    zoom: 1,
    fitMode: 'smart',
    brightness: 100,
    contrast: 100,
    strokes: [],
    brushSize: 44,
    blurStrength: 12,
  })
})

test('right-angle rotations preserve exact image bounds and arbitrary angles remain crop-safe', () => {
  assert.deepEqual(getRotatedImageDimensions(600, 800, 90), { width: 800, height: 600 })
  assert.deepEqual(getRotatedImageDimensions(600, 800, 180), { width: 600, height: 800 })

  for (const rotation of [-5, 3, 90, 180]) {
    const dimensions = getRotatedImageDimensions(600, 800, rotation)
    const crop = getVisibleImageCrop(
      getCenteredAspectCrop(dimensions.width, dimensions.height),
      600,
      800,
      rotation,
      1.15,
    )
    assert.ok(crop.width > 0 && crop.height > 0)
    assert.ok(crop.x >= 0 && crop.y >= 0)
    assert.ok(crop.x + crop.width <= 1)
    assert.ok(crop.y + crop.height <= 1)
  }
})

test('smart crop trims clear uniform borders but falls back when the background is ambiguous', () => {
  const width = 100
  const height = 140
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 238
    pixels[index + 1] = 236
    pixels[index + 2] = 228
    pixels[index + 3] = 255
  }
  for (let y = 20; y < 120; y += 1) {
    for (let x = 30; x < 70; x += 1) {
      const offset = (y * width + x) * 4
      pixels[offset] = 65
      pixels[offset + 1] = 42
      pixels[offset + 2] = 28
    }
  }
  const crop = getConservativeContentCrop(pixels, width, height)
  assert.ok(crop)
  assert.ok(Math.abs((crop.width * width) / (crop.height * height) - 3 / 4) < 0.01)
  assert.ok(crop.x * width <= 30)
  assert.ok((crop.x + crop.width) * width >= 70)
  assert.ok(crop.y * height <= 20)
  assert.ok((crop.y + crop.height) * height >= 120)

  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      pixels[(y * width + x) * 4] = 0
    }
  }
  assert.equal(getConservativeContentCrop(pixels, width, height), null)
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
