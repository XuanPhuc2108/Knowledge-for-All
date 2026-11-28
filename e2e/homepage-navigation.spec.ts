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

async function expectExploreActive(page: import('@playwright/test').Page) {
  const viewport = page.viewportSize()
  if (viewport && viewport.width < 768) {
    await page.getByRole('button', { name: 'Mở menu điều hướng' }).click()
    await expect(page.locator('#mobile-navigation-menu .landing-explore-menu-link[aria-current="page"]')).toBeVisible()
    await expect(page.locator('#mobile-navigation-menu .landing-home-menu-link[aria-current="page"]')).toHaveCount(0)
  } else {
    await expect(page.locator('.landing-explore-link[aria-current="page"]:visible')).toHaveCount(1)
    await expect(page.locator('.landing-home-link[aria-current="page"]:visible')).toHaveCount(0)
  }
}

async function expectHomeActive(page: import('@playwright/test').Page) {
  const viewport = page.viewportSize()
  if (viewport && viewport.width < 768) {
    await page.getByRole('button', { name: 'Mở menu điều hướng' }).click()
    await expect(page.locator('#mobile-navigation-menu .landing-home-menu-link[aria-current="page"]')).toBeVisible()
    await expect(page.locator('#mobile-navigation-menu .landing-explore-menu-link[aria-current="page"]')).toHaveCount(0)
  } else {
    await expect(page.locator('.landing-home-link[aria-current="page"]:visible')).toHaveCount(1)
    await expect(page.locator('.landing-explore-link[aria-current="page"]:visible')).toHaveCount(0)
  }
}

test('homepage marks Trang chủ active and Khám phá inactive after direct navigation and refresh', async ({ page }) => {
  await page.goto('/')
  await expectHomeActive(page)

  await page.reload()
  await expectHomeActive(page)
})

test('Explore is active on its route after direct navigation and refresh', async ({ page }) => {
  await page.goto('/explore')
  await expectExploreActive(page)

  await page.reload()
  await expectExploreActive(page)
})

test('Explore still supports book search and sharing filters', async ({ page }) => {
  await page.goto('/explore')
  const search = page.getByRole('searchbox', {
    name: 'Tìm theo tên sách, tác giả, thể loại hoặc mô tả',
  })
  await expect(search).toBeVisible()
  await search.fill('Dế mèn')
  await expect(page).toHaveURL(/[?&]q=/)

  const shareFilter = page.getByRole('button', { name: 'Chia sẻ', exact: true })
  await shareFilter.click()
  await expect(shareFilter).toHaveAttribute('aria-pressed', 'true')
  await expect(page).toHaveURL(/[?&]type=share/)
})

test('authenticated book upload route marks the upload item active', async ({ page }) => {
  await seedLocalUser(page)
  await page.goto('/app/add-book')
  await expect(page.getByRole('heading', { name: 'Đăng sách mới' })).toBeVisible()

  const viewport = page.viewportSize()
  if (viewport && viewport.width < 1024) {
    await page.getByRole('button', { name: 'Mở menu điều hướng' }).click()
    await expect(page.locator('#mobile-navigation-menu a[aria-current="page"][href="/app/add-book"]')).toBeVisible()
  } else {
    await expect(page.locator('.app-sidebar-link[aria-current="page"][href="/app/add-book"]')).toBeVisible()
  }
})

test('homepage keeps the original book-sharing hero at desktop, tablet and mobile widths', async ({ page }) => {
  await page.goto('/')
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
  ]) {
    await page.setViewportSize(viewport)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Share sách của bạn' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tìm sách thôi' })).toBeVisible()
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width)
  }
})
