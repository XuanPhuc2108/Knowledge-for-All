import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildMinimalProfilePayload,
  buildAuthRedirectUrl,
  completeEmailOtpVerification,
  getOtpResendCooldownRemaining,
  getOAuthDisplayName,
  getSafeAuthRedirectPath,
  isEmailConfirmationRequired,
  isValidEmailOtp,
  loginWithEmail,
  normalizeEmailAddress,
  OTP_RESEND_COOLDOWN_SECONDS,
  sendEmailOtp,
  sendPasswordResetEmail,
  startOAuthSignIn,
  verifyEmailOtp,
} from '../src/lib/authFlow.ts'
import { localAdapter } from '../src/lib/localAdapter.ts'
import { userFacingError } from '../src/lib/userFacingError.ts'

const confirmedUser = { email_confirmed_at: '2026-11-27T00:00:00.000Z' }
const profile = {
  id: 'user-id',
  fullName: 'Booki Reader',
  email: 'reader@example.com',
  showContactPhone: false,
  showContactEmail: false,
  showArea: false,
  locationEnabled: false,
  createdAt: '2026-11-27T00:00:00.000Z',
  updatedAt: '2026-11-27T00:00:00.000Z',
}

test('email OTPs must contain exactly six digits', () => {
  assert.equal(isValidEmailOtp('123456'), true)
  assert.equal(isValidEmailOtp(' 123456 '), true)
  assert.equal(isValidEmailOtp('12345'), false)
  assert.equal(isValidEmailOtp('1234567'), false)
  assert.equal(isValidEmailOtp('12a456'), false)
})

test('email addresses are normalized and invalid or overlong values are rejected', () => {
  assert.equal(normalizeEmailAddress(' Reader@Example.com '), 'reader@example.com')
  assert.equal(normalizeEmailAddress('reader..name@example.com'), null)
  assert.equal(normalizeEmailAddress('reader @example.com'), null)
  assert.equal(normalizeEmailAddress(`${'a'.repeat(250)}@example.com`), null)
})

test('email OTP sends with account creation enabled and verifies the email OTP type', async () => {
  const calls: unknown[] = []
  const auth = {
    signInWithOtp: async (input: unknown) => {
      calls.push(input)
      return { error: null }
    },
    verifyOtp: async (input: unknown) => {
      calls.push(input)
      return {
        data: { user: { email: 'reader@example.com', email_confirmed_at: '2026-11-27T00:00:00.000Z' } },
        error: null,
      }
    },
  }

  await sendEmailOtp(auth, ' Reader@Example.com ')
  await verifyEmailOtp(auth, ' Reader@Example.com ', '123456')
  assert.deepEqual(calls, [
    { email: 'reader@example.com', options: { shouldCreateUser: true } },
    { email: 'reader@example.com', token: '123456', type: 'email' },
  ])
})

test('email OTP verification rejects an unconfirmed or mismatched email', async () => {
  await assert.rejects(
    verifyEmailOtp({
      verifyOtp: async () => ({
        data: { user: { email: 'someone-else@example.com', email_confirmed_at: 'verified' } },
        error: null,
      }),
    }, 'reader@example.com', '123456'),
    /chưa xác nhận được email/i,
  )
})

test('minimal profile initialization requires email and preserves the Supabase user ID', () => {
  assert.deepEqual(buildMinimalProfilePayload({ id: 'google-user', email: 'reader@example.com' }, '  New Reader  '), {
    id: 'google-user',
    full_name: 'New Reader',
    email: 'reader@example.com',
    location_enabled: false,
  })
  assert.throws(
    () => buildMinimalProfilePayload({ id: 'google-user', email: null }, 'New Reader'),
    /Tài khoản chưa cung cấp email/,
  )
  assert.equal(getOAuthDisplayName({ name: '  Google Reader  ' }), 'Google Reader')
  assert.equal(getOAuthDisplayName({ full_name: '', given_name: 'A', family_name: 'Reader' }), 'A Reader')
  assert.equal(getOAuthDisplayName({ name: ' ' }), undefined)
})

test('an invalid or expired OTP remains a verification error, not a profile error', async () => {
  const failure = new Error('Token has expired or is invalid')
  let initializeProfileCalled = false

  await assert.rejects(
    completeEmailOtpVerification({
      verifyOtp: async () => ({ data: { user: null }, error: failure }),
    }, 'reader@example.com', '123456', async () => {
      initializeProfileCalled = true
      return profile
    }),
    (error: Error) => {
      assert.equal(error.message, failure.message)
      assert.equal(userFacingError(error, 'fallback'), 'Mã OTP đã hết hạn hoặc không chính xác. Hãy gửi mã mới.')
      return true
    },
  )
  assert.equal(initializeProfileCalled, false)
})

test('unconfirmed OTP responses do not initialize or authenticate the profile', async () => {
  let initializeProfileCalled = false

  await assert.rejects(
    completeEmailOtpVerification({
      verifyOtp: async () => ({
        data: { user: { email: 'reader@example.com', email_confirmed_at: null } },
        error: null,
      }),
    }, 'reader@example.com', '123456', async () => {
      initializeProfileCalled = true
      return profile
    }),
    /chưa xác nhận được email/i,
  )
  assert.equal(initializeProfileCalled, false)
})

test('valid email OTP initializes and returns the signed-in profile', async () => {
  let profileInitialized = false
  const result = await completeEmailOtpVerification({
    verifyOtp: async () => ({
      data: { user: { email: 'reader@example.com', ...confirmedUser } },
      error: null,
    }),
  }, 'reader@example.com', '123456', async () => {
    profileInitialized = true
    return profile
  })

  assert.equal(profileInitialized, true)
  assert.deepEqual(result, profile)
})

test('profile initialization errors are distinct from invalid OTP errors', async () => {
  await assert.rejects(
    completeEmailOtpVerification({
      verifyOtp: async () => ({
        data: { user: { email: 'reader@example.com', ...confirmedUser } },
        error: null,
      }),
    }, 'reader@example.com', '123456', async () => {
      throw new Error('profiles table unavailable')
    }),
    (error: Error) => {
      assert.match(error.name, /AuthProfileSetupError/)
      assert.match(error.message, /Email đã xác nhận/)
      assert.ok(error.cause instanceof Error)
      return true
    },
  )
})

test('confirmed users can log in and load their profiles', async () => {
  let initialized = false
  const result = await loginWithEmail({
    signInWithPassword: async (credentials: unknown) => {
      assert.deepEqual(credentials, { email: 'reader@example.com', password: 'secure-password' })
      return { data: { user: { ...confirmedUser, app_metadata: { provider: 'email' } } }, error: null }
    },
    signOut: async () => ({ error: null }),
  }, { email: 'Reader@Example.com', password: 'secure-password' }, async () => {
    initialized = true
    return profile
  })

  assert.equal(initialized, true)
  assert.deepEqual(result, profile)
})

test('unconfirmed users cannot complete login even if Auth returns a session', async () => {
  let signedOut = false
  let initialized = false
  await assert.rejects(
    loginWithEmail({
      signInWithPassword: async () => ({
        data: { user: { email_confirmed_at: null, app_metadata: { provider: 'email' } } },
        error: null,
      }),
      signOut: async () => {
        signedOut = true
        return { error: null }
      },
    }, { email: 'reader@example.com', password: 'secure-password' }, async () => {
      initialized = true
      return profile
    }),
    /Xác nhận email bằng mã OTP/,
  )
  assert.equal(signedOut, true)
  assert.equal(initialized, false)
})

test('a valid password login can continue to name setup when a profile is missing', async () => {
  const result = await loginWithEmail({
    signInWithPassword: async () => ({
      data: { user: { ...confirmedUser, app_metadata: { provider: 'email' } } },
      error: null,
    }),
    signOut: async () => ({ error: null }),
  }, { email: 'reader@example.com', password: 'secure-password' }, async () => null)

  assert.equal(result, null)
})

test('password recovery keeps the dedicated reset callback URL', async () => {
  let request: unknown
  await sendPasswordResetEmail({
    resetPasswordForEmail: async (email: string, options: unknown) => {
      request = { email, options }
      return { error: null }
    },
  }, ' Reader@Example.com ', 'https://booki-vn.vercel.app/reset-password')

  assert.deepEqual(request, {
    email: 'reader@example.com',
    options: { redirectTo: 'https://booki-vn.vercel.app/reset-password' },
  })
})

test('Google OAuth keeps its provider and safe redirect target', async () => {
  const calls: unknown[] = []
  const auth = {
    signInWithOAuth: async (options: unknown) => {
      calls.push(options)
      return { data: { provider: 'mock' }, error: null }
    },
  }
  await startOAuthSignIn(auth, 'google', 'https://booki-vn.vercel.app/app')

  assert.deepEqual(calls, [
    { provider: 'google', options: { redirectTo: 'https://booki-vn.vercel.app/app' } },
  ])
})

test('OTP resend cooldown blocks retries until the full interval has elapsed', () => {
  const sentAt = 1_000_000
  assert.equal(getOtpResendCooldownRemaining(sentAt, sentAt), OTP_RESEND_COOLDOWN_SECONDS)
  assert.equal(getOtpResendCooldownRemaining(sentAt, sentAt + 1_000), OTP_RESEND_COOLDOWN_SECONDS - 1)
  assert.equal(getOtpResendCooldownRemaining(sentAt, sentAt + 59_999), 1)
  assert.equal(getOtpResendCooldownRemaining(sentAt, sentAt + 60_000), 0)
})

test('auth redirects preserve safe app paths and reject external destinations', () => {
  assert.equal(getSafeAuthRedirectPath('/app/books?sort=recent#top'), '/app/books?sort=recent#top')
  assert.equal(getSafeAuthRedirectPath('https://attacker.example', '/app'), '/app')
  assert.equal(getSafeAuthRedirectPath('//attacker.example', '/app'), '/app')
  assert.equal(getSafeAuthRedirectPath('/login', '/app'), '/app')
})

test('auth callback URLs use the configured origin and safe app paths', () => {
  assert.equal(buildAuthRedirectUrl('https://booki-vn.vercel.app', '/'), 'https://booki-vn.vercel.app')
  assert.equal(
    buildAuthRedirectUrl('https://booki-vn.vercel.app', '/app/add-book'),
    'https://booki-vn.vercel.app/app/add-book',
  )
  assert.equal(
    buildAuthRedirectUrl('https://booki-vn.vercel.app', 'https://attacker.example'),
    'https://booki-vn.vercel.app',
  )
})

test('email confirmation detection is case-insensitive', () => {
  assert.equal(isEmailConfirmationRequired('Email not confirmed'), true)
  assert.equal(isEmailConfirmationRequired('Xác nhận email bằng mã OTP trước khi đăng nhập.'), true)
  assert.equal(isEmailConfirmationRequired('Invalid login credentials'), false)
})

test('common auth setup failures are translated into actionable Vietnamese messages', () => {
  assert.match(userFacingError(new Error('Unsupported provider'), 'fallback'), /chưa được bật trong Supabase/)
  assert.match(userFacingError(new Error('redirect_uri_mismatch'), 'fallback'), /Supabase.*Redirect URLs/)
  const duplicateRegistrationMessage = userFacingError(new Error('User already registered'), 'fallback')
  assert.match(duplicateRegistrationMessage, /Nếu bạn đã có tài khoản/)
  assert.doesNotMatch(duplicateRegistrationMessage, /Email này đã có tài khoản/)
})

test('local fallback strips legacy password hashes and does not authenticate passwords locally', async () => {
  const values = new Map<string, string>([
    ['sgn_users', JSON.stringify([{ ...profile, passwordHash: 'legacy-hash' }])],
    ['sgn_session', profile.id],
  ])
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })

  try {
    const currentUser = await localAdapter.getCurrentUser()
    assert.equal(currentUser?.id, profile.id)
    assert.equal('passwordHash' in JSON.parse(values.get('sgn_users')!)[0], false)
    await assert.rejects(
      localAdapter.login({ email: profile.email, password: 'anything' }),
      /cần Supabase Auth/,
    )
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
