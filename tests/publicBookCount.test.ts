import assert from 'node:assert/strict'
import test from 'node:test'
import { localAdapter } from '../src/lib/localAdapter.ts'
import { fetchPublicBookCount } from '../src/lib/publicBookCount.ts'

test('reads an exact aggregate from the public catalog without fetching book rows', async () => {
  const calls: unknown[] = []
  const source = {
    from(table: string) {
      calls.push(['from', table])
      return {
        select(columns: string, options: { count: string; head: boolean }) {
          calls.push(['select', columns, options])
          return Promise.resolve({ count: 37, error: null })
        },
      }
    },
  }

  assert.equal(await fetchPublicBookCount(source), 37)
  assert.deepEqual(calls, [
    ['from', 'public_books'],
    ['select', 'id', { count: 'exact', head: true }],
  ])
})

test('re-queries the count so catalog changes are reflected', async () => {
  let count = 25
  let queryCount = 0
  const source = {
    from() {
      return {
        select() {
          queryCount += 1
          return Promise.resolve({ count, error: null })
        },
      }
    },
  }

  assert.equal(await fetchPublicBookCount(source), 25)
  count = 26
  assert.equal(await fetchPublicBookCount(source), 26)
  count = 25
  assert.equal(await fetchPublicBookCount(source), 25)
  assert.equal(queryCount, 3)
})

test('local adapter counts all stored listings, including unavailable listings beyond the first page', async () => {
  const books = Array.from({ length: 31 }, (_, index) => ({
    id: `book-${index}`,
    ownerId: `owner-${index % 4}`,
    status: index % 3 === 0 ? 'loaned' : 'available',
  }))
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => key === 'sgn_books' ? JSON.stringify(books) : null,
    },
  })

  try {
    assert.equal(await localAdapter.getPublicBookCount(), 31)
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})

test('surfaces database errors and missing exact counts', async () => {
  const databaseErrorSource = {
    from() {
      return {
        select() {
          return Promise.resolve({ count: null, error: { message: 'permission denied' } })
        },
      }
    },
  }
  const missingCountSource = {
    from() {
      return {
        select() {
          return Promise.resolve({ count: null, error: null })
        },
      }
    },
  }

  await assert.rejects(fetchPublicBookCount(databaseErrorSource), /permission denied/)
  await assert.rejects(fetchPublicBookCount(missingCountSource), /exact public book count/)
})
