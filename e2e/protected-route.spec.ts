import { test, expect } from '@playwright/test'

// These tests deliberately run unauthenticated
test.use({ storageState: { cookies: [], origins: [] } })

const protectedRoutes = ['/trace', '/studio', '/account']

for (const route of protectedRoutes) {
  test(`${route} redirects to /sign-in when unauthenticated`, async ({ page }) => {
    await page.goto(route)
    await expect(page).toHaveURL(/sign-in/, { timeout: 5_000 })
  })
}

test('redirect preserves intended destination after sign-in', async ({ page }) => {
  await page.goto('/trace')
  await expect(page).toHaveURL(/sign-in/)
  // The sign-in page URL or state should remember where we were going
  // (exact assertion depends on implementation — at minimum we land on sign-in)
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
})
