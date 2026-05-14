import { test, expect } from '@playwright/test'
import { mockMe, mockRegister } from './api-mocks'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Sign Up', () => {
  test.beforeEach(async ({ page }) => {
    await mockMe(page, false)
  })

  test('empty form shows validation errors', async ({ page }) => {
    await page.goto('/sign-up')
    await page.getByRole('button', { name: /sign up|create account|register/i }).click()
    const hasError =
      (await page.locator('[data-testid="error"], [role="alert"]').count()) > 0 ||
      (await page.locator('input:invalid').count()) > 0
    expect(hasError).toBe(true)
  })

  test('submitting valid email shows check-your-email state', async ({ page }) => {
    await mockRegister(page, true)
    await page.goto('/sign-up')
    await page.getByLabel('Email').fill(`e2e+${Date.now()}@example.com`)
    const passwordField = page.getByLabel('Password').first()
    if (await passwordField.isVisible()) {
      await passwordField.fill('TestPassword123!')
    }
    await page.getByRole('button', { name: /sign up|create account|register/i }).click()
    await expect(
      page.getByText(/check your email|verify|sent|confirmation/i).first(),
    ).toBeVisible({ timeout: 8_000 })
  })
})
