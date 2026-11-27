import assert from 'node:assert/strict'
import test from 'node:test'
import { createBookiShareUrl, getBookiShareReferral } from '../src/lib/bookSharing.ts'

test('Booki share links use the production host and explicit community attribution', () => {
  const url = new URL(createBookiShareUrl())

  assert.equal(url.origin, 'https://booki-vn.vercel.app')
  assert.equal(url.pathname, '/')
  assert.equal(url.searchParams.get('utm_source'), 'booki')
  assert.equal(url.searchParams.get('utm_medium'), 'share')
  assert.equal(url.searchParams.get('utm_campaign'), 'community')
})

test('public book share links preserve the book route and encode the identifier', () => {
  const url = new URL(createBookiShareUrl('/books/book id'))

  assert.equal(url.origin, 'https://booki-vn.vercel.app')
  assert.equal(url.pathname, '/books/book%20id')
  assert.equal(url.searchParams.get('utm_source'), 'booki')
})

test('only real visits through Booki community share links are labeled as referrals', () => {
  assert.deepEqual(
    getBookiShareReferral('?utm_source=booki&utm_medium=share&utm_campaign=community'),
    { source: 'booki', medium: 'share', campaign: 'community' },
  )
  assert.equal(getBookiShareReferral('?utm_source=facebook&utm_medium=share'), null)
  assert.equal(getBookiShareReferral(''), null)
})
