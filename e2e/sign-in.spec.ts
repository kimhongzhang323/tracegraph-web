import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } }) // unauthenticated

test.describe('Sign In', () => {
  test('happy path — valid credentials redirect to /trace', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL!)
    await page.getByLabel('Password').fill(process.env.E2E_USER_PASSWORD!)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).not.toHaveURL(/sign-in/, { timeout: 10_000 })
  })

  test('invalid credentials show an error message', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByLabel('Email').fill('nobody@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByRole('alert').or(page.locator('[data-testid="error"]'))).toBeVisible({
      timeout: 5_000,
    })
  })

  test('forgot password link navigates to /forgot-password', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByRole('link', { name: /forgot/i }).click()
    await expect(page).toHaveURL(/forgot-password/)
  })
})
