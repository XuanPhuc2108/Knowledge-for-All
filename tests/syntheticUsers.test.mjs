import assert from 'node:assert/strict'
import test from 'node:test'
import { generateSyntheticUsers } from '../scripts/synthetic-users.mjs'

const fixedNow = new Date('2026-11-28T13:00:00.000Z')

test('synthetic QA profiles are reproducible, unique, ordinary-role test records', () => {
  const first = generateSyntheticUsers({ count: 450, seed: 42, now: fixedNow })
  const second = generateSyntheticUsers({ count: 450, seed: 42, now: fixedNow })
  const sameHour = generateSyntheticUsers({
    count: 450,
    seed: 42,
    now: new Date(fixedNow.getTime() + 27 * 60 * 1000),
  })
  assert.deepEqual(first, second)
  assert.deepEqual(first, sameHour)
  assert.equal(first.length, 450)
  assert.equal(new Set(first.map((user) => user.userId)).size, 450)
  assert.equal(new Set(first.map((user) => user.fullName)).size, 450)
  assert.ok(first.every((user) => user.synthetic && user.role === 'user'))
  assert.ok(first.every((user) => user.email.endsWith('@example.test')))
})

test('synthetic registration dates use yesterday and today in Ho Chi Minh time', () => {
  const users = generateSyntheticUsers({ count: 450, seed: 7, now: fixedNow })
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(fixedNow)
  const yesterdayDate = new Date(fixedNow.getTime() - 24 * 60 * 60 * 1000)
  const yesterday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(yesterdayDate)
  const days = new Set(users.map((user) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(user.joinedAt)),
  ))
  assert.deepEqual([...days].sort(), [yesterday, today].sort())
  assert.ok(users.every((user) => new Date(user.joinedAt) <= fixedNow))
  assert.ok(new Set(users.map((user) => user.joinedAt)).size > 400)
})

test('synthetic generator rejects invalid quantities and seeds', () => {
  assert.throws(() => generateSyntheticUsers({ count: 0 }), /1 đến 5000/)
  assert.throws(() => generateSyntheticUsers({ count: 2.5 }), /1 đến 5000/)
  assert.throws(() => generateSyntheticUsers({ count: 2, seed: Number.NaN }), /Seed/)
})
