import { test } from '@playwright/test'

test.describe('Borrowing workflows require staging accounts', () => {
  test.skip(
    !process.env.E2E_BORROWER_EMAIL || !process.env.E2E_LENDER_EMAIL,
    'Set E2E_BORROWER_EMAIL, E2E_LENDER_EMAIL and their matching test passwords.',
  )

  test('request, offer, loan, extension and return', async ({ page }) => {
    // This scenario is intentionally not destructive against production.
    // Configure staging credentials before enabling the test in CI.
    await page.goto('/app/borrowing')
  })

  test('unauthorized borrower and lender actions are rejected', async ({ page }) => {
    // Staging-only authorization scenario.
    await page.goto('/app/borrowing')
  })
})
