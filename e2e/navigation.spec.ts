import { expect, test } from '@playwright/test'

test('CTA → editor → back to landing', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Bắt đầu thiết kế' }).click()
  await expect(page).toHaveURL(/\/editor$/)
  await expect(page.getByRole('button', { name: 'Hoàn tác' })).toBeVisible()
  await expect(page.getByTestId('card-canvas')).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Idol Card Maker' })).toBeVisible()
})

test('direct load of /editor works', async ({ page }) => {
  await page.goto('/editor')
  await expect(page.getByRole('button', { name: 'Hoàn tác' })).toBeVisible()
  await expect(page.getByTestId('card-canvas')).toBeVisible()
})

test('landing has no horizontal scroll and CTA is in viewport', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Idol Card Maker' })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
  await expect(page.getByRole('link', { name: 'Bắt đầu thiết kế' })).toBeInViewport()
})
