import assert from 'node:assert/strict'
import test from 'node:test'
import { completeBookCreation, runBookSubmission } from '../src/lib/bookCreatePipeline.ts'

test('submission always releases the loading lock after an upload or insert failure', async () => {
  const formData = { title: 'Sách còn nguyên' }
  for (const stage of ['upload', 'insert']) {
    const lock = { current: false }
    let saving = false
    await assert.rejects(
      runBookSubmission(lock, (value) => { saving = value }, async () => {
        assert.equal(saving, true)
        assert.equal(formData.title, 'Sách còn nguyên')
        throw new Error(`${stage} failed`)
      }),
      new RegExp(`${stage} failed`),
    )
    assert.equal(lock.current, false)
    assert.equal(saving, false)
    assert.equal(formData.title, 'Sách còn nguyên')
  }
})

test('submission lock prevents duplicate book creation', async () => {
  const lock = { current: false }
  let submissions = 0
  let releaseFirst!: () => void
  const first = runBookSubmission(lock, () => {}, () => {
    submissions += 1
    return new Promise<void>((resolve) => { releaseFirst = resolve })
  })

  assert.equal(await runBookSubmission(lock, () => {}, async () => {
    submissions += 1
  }), undefined)
  assert.equal(submissions, 1)
  releaseFirst()
  await first
})

test('book creation passes the selected original image directly to the existing insert', async () => {
  const imageUrls = ['data:image/webp;base64,original-image']
  let insertedImageUrls: string[] | undefined

  const book = await completeBookCreation(
    async () => ({ imageUrls, uploadedPaths: ['owner/original.webp'] }),
    async (urls) => {
      insertedImageUrls = urls
      return { id: 'book-1' }
    },
    async () => assert.fail('successful insert must not clean up its cover'),
  )

  assert.deepEqual(insertedImageUrls, imageUrls)
  assert.deepEqual(book, { id: 'book-1' })
})

test('book creation passes an applied edited image through the same insert path', async () => {
  const imageUrls = ['data:image/webp;base64,edited-image']
  let insertedImageUrls: string[] | undefined

  await completeBookCreation(
    async () => ({ imageUrls, uploadedPaths: ['owner/edited.webp'] }),
    async (urls) => {
      insertedImageUrls = urls
      return 'created'
    },
    async () => assert.fail('successful insert must not clean up its cover'),
  )

  assert.deepEqual(insertedImageUrls, imageUrls)
})

test('storage failure does not insert a listing', async () => {
  const failure = new Error('storage upload failed')
  let inserted = false
  await assert.rejects(
    completeBookCreation(
      async () => { throw failure },
      async () => {
        inserted = true
        return 'created'
      },
      async () => {},
    ),
    (cause: unknown) => cause === failure,
  )
  assert.equal(inserted, false)
})

test('database failure is returned without waiting for rollback cleanup', async () => {
  const failure = new Error('database insert failed')
  let resolveCleanup!: () => void
  let markCleanupStarted!: () => void
  const cleanupStarted = new Promise<void>((resolve) => { markCleanupStarted = resolve })
  const operation = completeBookCreation(
    async () => ({ imageUrls: ['https://storage.example/book.webp'], uploadedPaths: ['owner/book.webp'] }),
    async () => { throw failure },
    () => {
      markCleanupStarted()
      return new Promise<void>((resolve) => { resolveCleanup = resolve })
    },
  )
  let settled = false
  const result = operation.catch((cause: unknown) => {
    settled = true
    throw cause
  })

  await cleanupStarted
  await Promise.resolve()
  assert.equal(settled, true)
  await assert.rejects(result, (cause: unknown) => cause === failure)
  resolveCleanup()
})

test('database failure remains visible even when rollback cleanup rejects', async () => {
  const failure = new Error('database insert failed')
  const originalError = console.error
  console.error = () => {}
  try {
    await assert.rejects(
      completeBookCreation(
        async () => ({ imageUrls: [], uploadedPaths: ['owner/book.webp'] }),
        async () => { throw failure },
        async () => { throw new Error('cleanup failed') },
      ),
      (cause: unknown) => cause === failure,
    )
    await Promise.resolve()
    await Promise.resolve()
  } finally {
    console.error = originalError
  }
})

test('no-image listing creates do not schedule cover cleanup on failure', async () => {
  let cleanupCalled = false
  await assert.rejects(
    completeBookCreation(
      async () => ({ imageUrls: [], uploadedPaths: [] }),
      async () => { throw new Error('database insert failed') },
      async () => { cleanupCalled = true },
    ),
    /database insert failed/,
  )
  assert.equal(cleanupCalled, false)
})
