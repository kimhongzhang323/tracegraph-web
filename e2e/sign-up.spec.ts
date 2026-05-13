import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } }) // unauthenticated

test.describe('Sign Up', () => {
  test('empty form shows validation errors', async ({ page }) => {
    await page.goto('/sign-up')
    await page.getByRole('button', { name: /sign up|create account|register/i }).click()
    // Either browser validation or a visible error message should appear
    const hasError =
      (await page.locator('[data-testid="error"], [role="alert"]').count()) > 0 ||
      (await page.locator('input:invalid').count()) > 0
    expect(hasError).toBe(true)
  })

  test('submitting valid email shows check-your-email state', async ({ page }) => {
    const uniqueEmail = `e2e+${Date.now()}@example.com`
    await page.goto('/sign-up')
    await page.getByLabel('Email').fill(uniqueEmail)
    // Fill password fields if present
    const passwordField = page.getByLabel('Password').first()
    if (await passwordField.isVisible()) {
      await passwordField.fill('TestPassword123!')
    }
    await page.getByRole('button', { name: /sign up|create account|register/i }).click()
    // Should reach either a verification prompt or a success message
    await expect(
      page.getByText(/check your email|verify|sent|confirmation/i),
    ).toBeVisible({ timeout: 8_000 })
  })
})
