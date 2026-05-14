import { test as setup, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { mockLogin, mockMe } from './api-mocks'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const authFile = path.join(__dirname, '.auth/user.json')

setup('authenticate', async ({ page }) => {
  await mockLogin(page)
  await mockMe(page)

  await page.goto('/sign-in')
  await page.getByLabel('Email').fill('e2e@example.com')
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page).not.toHaveURL(/sign-in/, { timeout: 10_000 })
  await page.context().storageState({ path: authFile })
})
