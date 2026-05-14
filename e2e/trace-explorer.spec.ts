import { test, expect } from '@playwright/test'
import { mockMe, mockTraces } from './api-mocks'

// Uses storageState from auth.setup.ts (authenticated)
test.describe('Trace Explorer (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await mockMe(page, true)
    await mockTraces(page)
  })

  test('loads without redirecting to sign-in', async ({ page }) => {
    await page.goto('/trace')
    await expect(page).not.toHaveURL(/sign-in/, { timeout: 5_000 })
    await expect(page).toHaveURL(/trace/)
  })

  test('renders trace list or empty state', async ({ page }) => {
    await page.goto('/trace')
    await expect(
      page.locator('[data-testid="trace-list"], [data-testid="empty-state"]')
        .or(page.getByText(/no traces|loading|demo data|live/i).first()),
    ).toBeVisible({ timeout: 8_000 })
  })

  test('has no uncaught console errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/trace')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
