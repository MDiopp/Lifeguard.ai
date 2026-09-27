import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/monitor/start', route => route.fulfill({ json: { started: true } }))
  await page.route('**/api/monitor/stop', route => route.fulfill({ json: { stopped: true } }))
  await page.route('**/api/monitor/status', route => route.fulfill({ json: { running: true, ready: true, people: 2, highest_risk: .82, error: null } }))
  await page.route('**/api/monitor/stream**', route => route.fulfill({ path: resolve('public/art/waterline-compact.jpg'), contentType: 'image/jpeg' }))
})

test('live monitor presents the camera stream and movement risk without preview controls', async ({ page }) => {
  await page.goto('/monitor')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Monitoring Station')
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Monitor', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('.monitor-page')).toHaveAttribute('data-state', 'critical')
  await expect(page.getByRole('heading', { name: 'High movement' })).toBeVisible()
  await expect(page.getByText('82%')).toBeVisible()
  await expect(page.getByText('People visible').locator('..')).toContainText('2')
  await expect(page.getByAltText('Live camera with person boxes and movement risk bars')).toBeVisible()
  await expect(page.getByLabel('Preview state')).toHaveCount(0)
})

test('camera can be stopped and restarted', async ({ page }) => {
  await page.goto('/monitor')
  await page.getByRole('button', { name: 'Stop Camera' }).click()
  await expect(page.getByText('Camera stopped and released.')).toBeVisible()
  await expect(page.getByText('Camera stopped', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Start Camera' }).click()
  await expect(page.getByAltText('Live camera with person boxes and movement risk bars')).toBeVisible()
})
