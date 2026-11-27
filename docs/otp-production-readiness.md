# Booki email OTP production readiness

## Status

**Not production-ready for public email signup.** The application code and local checks are ready, but the existing Supabase project has no custom SMTP provider and the production confirmation template is still the default. No deployment or real email test was performed.

## Supabase

- Existing project: `booki` (`eprtkfsbyvwwyljnpucx`), status `ACTIVE_HEALTHY`.
- Current remote Auth config was read with the Supabase CLI into a temporary directory, then the temporary files were removed. Signup is enabled; email confirmations are required; OTP length is 6; expiry is 3600 seconds.
- Site URL is `https://booki-vn.vercel.app`. The redirect allowlist includes `https://booki-vn.vercel.app/**` and `http://localhost:5173/**`.
- The current Supabase config confirms Google OAuth is enabled. No OAuth provider settings were modified.
- Custom SMTP is **not configured**; the project uses Supabase's default email provider. The prior Management API read confirmed no custom SMTP sender.
- Production confirmation email remains the default (`Confirm your email address`). Updating the subject/template was rejected with: `Email template modification is not available for free tier projects using the default email provider. Please upgrade your plan or configure a custom SMTP provider.`
- No production email was sent. No dedicated, already-authorized test mailbox was available.
- The prepared repository template is `supabase/templates/booki-confirmation.html`, with subject in `supabase/templates/booki-confirmation.subject.txt`. It uses `{{ .Token }}`, identifies Booki, and says the six-digit code expires in one hour. Its inline Arial/sans-serif stack is intentional for broad email-client compatibility. This template is **not active in production**.

## Code and safety

- Email entry uses Supabase `signInWithOtp` with account creation enabled; verification uses `type: 'email'`, and resend requests another email OTP. Six-digit validation, the 60-second application cooldown, duplicate-submit guards, profile initialization, safe redirects, password login/recovery, and Google OAuth request handling are covered by mocked auth-flow tests.
- Registration and sign-in share the email OTP flow. The code step focuses its input, supports one-time-code autocomplete and paste, and provides inline accessible errors plus resend/change-email recovery.
- The local-only fallback no longer stores/verifies password hashes; legacy hashes are removed while retaining local profile data. Password and OTP values are not persisted by the auth flow.
- The production `profiles.email` column remains `NOT NULL`. This release includes no schema migration, and no production schema or user data was changed.

## Current authentication availability

- Google OAuth uses the existing Supabase provider; the prior audit verified it was enabled. No live sign-in was attempted.
- The registration entry point is shared by `/login` and `/register`; it asks for only an email OTP and, when needed, a display name. Existing password login and recovery remain secondary options.
- Google is enabled in the existing Supabase project. The application preserves the existing Supabase Auth callback and targets the configured Booki origin, but no live OAuth flow was tested. Google Cloud consent-screen branding could not be verified because the console requires an authorized sign-in; no branding or OAuth credentials were changed.

## Code files changed

Authentication-related changes are in `.env.example`, `package.json`, `src/components/AuthCard.tsx`, `src/components/OAuthButtons.tsx`, `src/hooks/useAuth.tsx`, `src/hooks/useOtpResendCooldown.ts`, `src/lib/authFlow.ts`, `src/lib/dataAdapter.ts`, `src/lib/localAdapter.ts`, `src/lib/supabase.ts`, `src/lib/userFacingError.ts`, `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/types/auth.ts`, `src/types/user.ts`, `supabase/templates/`, and `tests/authFlow.test.ts`. Other approved changes in this release include the global book-count statistic and its tests.

## Vercel

- Existing project `knowledge-for-all` is connected to `XuanPhuc2108/Knowledge-for-All` on production branch `main`.
- `https://booki-vn.vercel.app` points to a deployment with status `Ready`. The live bundle references only `eprtkfsbyvwwyljnpucx.supabase.co`.
- Production variable names include `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SUPABASE_PUBLISHABLE_KEY`. Values were not read or printed.
- No deployment was started. Do not deploy until SMTP, the production template, and a real authorized email test are complete.

## Validation

- `npm test`: **35 passed, 0 failed**.
- `npm run lint`: **passed**.
- `npm run build`: **passed** (TypeScript and Vite production build).
- No real email delivery, live OAuth sign-in, or production signup was attempted.

## Manual Supabase steps

1. Configure custom SMTP on the existing project using an already-authorized provider and a sender address on its verified domain. Set the sender display name to **Booki**. Do not use credentials from this report.
2. In the existing project's confirmation/signup email template, set the subject to the contents of `supabase/templates/booki-confirmation.subject.txt` and the body to `supabase/templates/booki-confirmation.html`. Verify `{{ .Token }}` is preserved and the six-digit/one-hour instructions match Auth settings.
3. If the current entitlement still blocks template editing, the project owner must enable a supported SMTP/plan option; no restriction was bypassed here.
4. After configuration, send at most one OTP to an already-authorized test mailbox and verify signup, OTP confirmation, profile creation, resend cooldown, and redirect before considering deployment.

## Remaining blockers

- Custom SMTP and a verified sender are not configured.
- The production confirmation template is not updated; the existing plan/provider entitlement blocks editing it.
- No authorized real-email test was available, so public email delivery is unverified.
- Production deployment is intentionally deferred until email delivery is proven.
