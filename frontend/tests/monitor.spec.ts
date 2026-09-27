import { expect, test } from '@playwright/test'
import type { WebSocketRoute } from '@playwright/test'
import { resolve } from 'node:path'

let alertSocket: WebSocketRoute | undefined

test.beforeEach(async ({ page }) => {
  alertSocket = undefined
  await page.routeWebSocket(/\/api\/monitor\/alerts/, socket => {
    alertSocket = socket
    socket.onMessage(message => {
      const payload = JSON.parse(String(message)) as { type: string }
      if (payload.type === 'emergency') socket.send(JSON.stringify({ type: 'sent', recipients: 1 }))
    })
  })
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

test('sends an emergency notification and displays incoming phone alerts until stopped', async ({ page }) => {
  await page.goto('/monitor')

  const sendButton = page.getByRole('button', { name: 'Emergency Notification' })
  await expect(sendButton).toBeEnabled()
  await sendButton.click()
  await expect(page.getByText('Emergency notification sent to 1 connected device.')).toBeVisible()

  alertSocket?.send(JSON.stringify({
    type: 'emergency',
    message: 'Critical Alert🚨: Your child is unsupervised near your pool 🚨',
  }))
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Critical Alert🚨: Your child is unsupervised near your pool 🚨' })).toBeVisible()

  await page.getByRole('button', { name: 'Stop Alert' }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
})
