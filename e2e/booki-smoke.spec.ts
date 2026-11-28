import { test, expect } from '@playwright/test'

test('landing page loads and exposes primary navigation', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/BOOKI|Booki|Sách/i)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('.landing-home-link[aria-current="page"]')).toHaveCount(2)
  await expect(page.locator('.landing-explore-link[aria-current="page"]')).toHaveCount(0)
})

test('protected borrowing route redirects unauthenticated users safely', async ({ page }) => {
  await page.goto('/app/borrowing')
  await expect(page).not.toHaveURL(/\/app\/borrowing/)
})
