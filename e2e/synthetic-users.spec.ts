import { test, expect } from '@playwright/test'

test('Booki Guard keeps the imported 450-user QA fixture distinct and searchable', async ({ page }) => {
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
    localStorage.setItem('booki_local_qa_admin_v1', 'true')
  })

  await page.goto('/app/moderation')
  await expect(page.getByText('DỮ LIỆU KIỂM THỬ — KHÔNG PHẢI THÀNH VIÊN THẬT')).toBeVisible()
  await page.locator('input[type="file"]').setInputFiles('.local-qa/synthetic-users.json')
  await expect(page.getByText('Đang nạp 450 hồ sơ QA riêng biệt.')).toBeVisible()
  await expect(page.getByText('Hiển thị 1-25 / 890')).toBeVisible()

  const search = page.getByRole('searchbox', { name: 'Tìm thành viên' })
  await search.fill('Người kiểm thử')
  await expect(page.getByText('Người kiểm thử', { exact: true }).last()).toBeVisible()
  await expect(page.getByText('Hiển thị 1-1 / 1')).toBeVisible()
  await search.clear()
  await page.getByRole('button', { name: 'Sau' }).click()
  await expect(page.getByText('Trang 2 / 36')).toBeVisible()
})

test('Booki Guard includes 439 clearly marked test profiles in the member list without changing real totals', async ({ page }) => {
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
    localStorage.setItem('booki_local_qa_admin_v1', 'true')
  })

  await page.goto('/app/moderation')
  await expect(page.getByRole('status').filter({ hasText: 'không tính vào thống kê thật' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Thống kê nền tảng' }).getByText('440', { exact: true })).toBeVisible()
  await expect(page.getByText('1 thật + 439 kiểm thử')).toBeVisible()
  await expect(page.getByText('Hiển thị 1-25 / 440')).toBeVisible()
  await expect(page.getByText('Kiểm thử', { exact: true }).first()).toBeVisible()

  const search = page.getByRole('searchbox', { name: 'Tìm thành viên' })
  await search.fill('Gia Han Do')
  await expect(page.getByText('Gia Hân Đỗ')).toBeVisible()
  await expect(page.getByText('Hiển thị 1-1 / 1')).toBeVisible()
  await search.clear()
  await expect(page.getByText('Hiển thị 1-25 / 440')).toBeVisible()
  await page.getByRole('button', { name: 'Sau' }).click()
  await expect(page.getByText('Trang 2 / 18')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Hiển thị 1-25 / 440')).toBeVisible()
})
