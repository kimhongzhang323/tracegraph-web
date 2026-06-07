import { test, expect } from '@playwright/test'
import { mockLogin, mockMe } from './api-mocks'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Sign In', () => {
  test('happy path — valid credentials redirect to /trace', async ({ page }) => {
    // Mock /api/me as authenticated so ProtectedRoute allows /trace after redirect
    await mockMe(page, true)
    await mockLogin(page, true)
    await page.goto('/sign-in')
    await page.getByLabel('Email').fill('e2e@example.com')
    await page.getByLabel('Password').fill('password')
    await page.locator('form').getByRole('button', { name: /sign in/i }).click()
    await expect(page).not.toHaveURL(/sign-in/, { timeout: 10_000 })
  })

  test('invalid credentials show an error message', async ({ page }) => {
    await mockMe(page, false)
    await mockLogin(page, false)
    await page.goto('/sign-in')
    await page.getByLabel('Email').fill('nobody@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.locator('form').getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByRole('alert').or(page.locator('[data-testid="error"]'))).toBeVisible({
      timeout: 5_000,
    })
  })

  test('forgot password link navigates to /forgot-password', async ({ page }) => {
    await mockMe(page, false)
    await page.goto('/sign-in')
    await page.getByRole('link', { name: /forgot/i }).click()
    await expect(page).toHaveURL(/forgot-password/)
  })
})
