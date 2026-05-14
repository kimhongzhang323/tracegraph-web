import type { Page } from '@playwright/test'

export const fakeUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'e2e@example.com',
  backendUrl: 'http://localhost:8082',
}

export async function mockMe(page: Page, authenticated = true) {
  await page.route('/api/me', route =>
    route.fulfill({
      status: authenticated ? 200 : 401,
      contentType: 'application/json',
      body: authenticated
        ? JSON.stringify(fakeUser)
        : JSON.stringify({ error: 'Unauthorized' }),
    })
  )
}

export async function mockLogin(page: Page, success = true) {
  await page.route('/api/auth/login', route =>
    route.fulfill({
      status: success ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(
        success ? { user: fakeUser } : { error: 'Invalid credentials' }
      ),
    })
  )
}

export async function mockRegister(page: Page, success = true) {
  await page.route('**/api/auth/register', route =>
    route.fulfill({
      status: success ? 200 : 400,
      contentType: 'application/json',
      body: JSON.stringify(success ? {} : { error: 'Registration failed' }),
    })
  )
}

export async function mockTraces(page: Page) {
  await page.route('**/api/traces**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  )
}
