import { test, expect } from '@playwright/test'

async function seedLocalUser(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const id = '11111111-1111-4111-8111-111111111111'
    const user = {
      id,
      fullName: 'Người kiểm thử',
      email: 'qa@local.invalid',
      createdAt: '2026-11-28T00:00:00.000Z',
      updatedAt: '2026-11-28T00:00:00.000Z',
    }
    localStorage.setItem('sgn_session', id)
    localStorage.setItem('sgn_users', JSON.stringify([user]))
  })
}

for (const position of ['top', 'middle', 'bottom'] as const) {
  test(`image editor opens and restores scroll from ${position}`, async ({ page }) => {
    await seedLocalUser(page)
    await page.goto('/app/add-book')
    await expect(page.getByRole('heading', { name: 'Đăng sách mới' })).toBeVisible()

    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    const target = position === 'top' ? 0 : position === 'middle'
      ? Math.floor((height - await page.evaluate(() => window.innerHeight)) / 2)
      : Math.max(0, height - await page.evaluate(() => window.innerHeight))
    await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), target)
    await page.waitForTimeout(150)

    await page.locator('input[type="file"]').setInputFiles('public/hero/library-main.webp')
    await expect(page.getByRole('button', { name: 'Chỉnh sửa ảnh bìa' })).toBeVisible()
    await page.getByRole('button', { name: 'Chỉnh sửa ảnh bìa' }).click()

    await expect(page.getByRole('dialog', { name: 'Chỉnh ảnh bìa sách' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tự căn ảnh' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Hủy' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Áp dụng ảnh' })).toBeVisible()

    await page.getByRole('button', { name: 'Đóng trình chỉnh ảnh' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(0)
  })
}

test('image editor remains usable in a short mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 })
  await seedLocalUser(page)
  await page.goto('/app/add-book')
  await page.locator('input[type="file"]').setInputFiles('public/hero/library-main.webp')
  await page.getByRole('button', { name: 'Chỉnh sửa ảnh bìa' }).click()

  const dialog = page.getByRole('dialog', { name: 'Chỉnh ảnh bìa sách' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('footer')).toBeVisible()
  await dialog.getByRole('button', { name: 'Tự căn ảnh' }).click()
  await expect(dialog.getByRole('button', { name: 'Áp dụng ảnh' })).toBeEnabled()
})

test('image editor applies quick and fine rotation before upload', async ({ page }) => {
  await seedLocalUser(page)
  await page.goto('/app/add-book')
  await page.locator('input[type="file"]').setInputFiles('public/hero/library-main.webp')
  await page.getByRole('button', { name: 'Chỉnh sửa ảnh bìa' }).click()

  const dialog = page.getByRole('dialog', { name: 'Chỉnh ảnh bìa sách' })
  const angle = dialog.getByRole('slider', { name: 'Góc xoay ảnh' })
  await dialog.getByRole('button', { name: 'Xoay 180°' }).click()
  await expect(angle).toHaveValue('180')
  await dialog.getByRole('button', { name: 'Đặt góc về 0°' }).click()
  await angle.focus()
  await angle.press('ArrowRight')
  await angle.press('ArrowRight')
  await angle.press('ArrowRight')
  await expect(angle).toHaveValue('3')
  await dialog.getByRole('button', { name: 'Áp dụng ảnh' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Chỉnh sửa ảnh bìa' })).toBeVisible()
})
