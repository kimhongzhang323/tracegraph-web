import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockMe } from './api-mocks'

test.use({ storageState: { cookies: [], origins: [] } }) // unauthenticated — public pages

test.beforeEach(async ({ page }) => {
  await mockMe(page, false)
})

const publicPages = ['/', '/sign-in', '/sign-up', '/docs']

for (const path of publicPages) {
  test(`${path} has no critical WCAG 2.1 AA violations`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    // Log violations to aid debugging before asserting
    if (results.violations.length > 0) {
      console.log(
        `A11y violations on ${path}:`,
        results.violations.map((v) => `${v.id}: ${v.description}`),
      )
    }

    expect(results.violations).toEqual([])
  })
}
