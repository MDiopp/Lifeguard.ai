import { expect, test } from '@playwright/test'

// Homepage checks deliberately stop at the destination URL: product pages are separate work.
test('entry links expose the requested destinations and support keyboard navigation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A Second Layer of Surveillance')
  const navigation = page.getByRole('navigation', { name: 'Main navigation' })
  for (const [name, path] of [['Monitor', '/monitor'], ['Human vs AI', '/demo'], ['Incidents', '/incidents']]) {
    await expect(navigation.getByRole('link', { name, exact: true })).toHaveAttribute('href', path)
  }
  const primary = page.getByRole('link', { name: 'Start Monitoring' })
  const secondary = page.getByRole('link', { name: 'Try Human vs AI' })
  await expect(primary).toHaveAttribute('href', '/monitor')
  await expect(secondary).toHaveAttribute('href', '/demo')
  await primary.focus()
  await page.keyboard.press('Tab')
  await expect(secondary).toBeFocused()
  await page.route('**/demo', route => route.fulfill({ contentType: 'text/html', body: '<p>Destination reached</p>' }))
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/demo$/)
})

test('motion pauses, persists across reloads, and follows reduced-motion preferences', async ({ page }) => {
  await page.goto('/')
  const pause = page.getByRole('button', { name: 'Pause background motion' })
  await pause.click()
  await expect(page.locator('.home')).toHaveAttribute('data-motion', 'off')
  await expect(page.locator('.home-wave').first()).toHaveCSS('animation-play-state', 'paused')
  const still = await page.locator('.home-waves').screenshot()
  expect((await page.locator('.home-waves').screenshot()).equals(still)).toBe(true)
  await page.reload()
  await expect(pause).toHaveAttribute('aria-pressed', 'true')
  await pause.click()
  await expect(page.locator('.home')).toHaveAttribute('data-motion', 'on')
  await expect(page.locator('.home-wave').first()).toHaveCSS('animation-play-state', 'running')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.home')).toHaveAttribute('data-motion', 'off')
  await expect(page.getByRole('button', { name: /following your reduced-motion/ })).toHaveAttribute('aria-disabled', 'true')
  await expect(page.locator('.home-wave').first()).toHaveCSS('animation-name', 'none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('.home')).toHaveAttribute('data-motion', 'on')
})

test('desktop, tablet, phone, and zoom reflow keep the content readable', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 640 }, { width: 640, height: 450 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    for (const selector of ['.hero-title', '.hero-description', '.home-actions', '.home-nav']) {
      const bounds = await page.locator(selector).boundingBox()
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width)
    }
    const title = await page.locator('.hero-title').boundingBox()
    const copy = await page.locator('.hero-description').boundingBox()
    const actions = await page.locator('.home-actions').boundingBox()
    expect(copy!.y).toBeGreaterThan(title!.y + title!.height)
    expect(actions!.y).toBeGreaterThan(copy!.y + copy!.height)
    if (viewport.width >= 1280) {
      await expect(page.getByRole('link', { name: 'Start Monitoring' })).toBeInViewport()
      await expect(page.getByRole('link', { name: 'Try Human vs AI' })).toBeInViewport()
    }
    await page.screenshot({ path: testInfo.outputPath('home-' + viewport.width + '.png'), fullPage: true })
  }
})

test('homepage works without WebGL and contains no operational dashboard or backend requests', async ({ page }) => {
  const forbiddenRequests: string[] = []
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('websocket', socket => forbiddenRequests.push(socket.url()))
  await page.route('**/*', route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.hostname !== 'localhost' || /\/api\//.test(url.pathname) || ['fetch', 'xhr', 'media'].includes(request.resourceType())) {
      forbiddenRequests.push(url.href)
      return route.abort()
    }
    return route.continue()
  })
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('.home-waves')).toBeVisible()
  await expect(page.locator('video, canvas, iframe, table, .experience-preview')).toHaveCount(0)
  await expect(page.getByText(/all clear|swimmer count|alert count|risk score|live pool feed/i)).toHaveCount(0)
  expect(forbiddenRequests).toEqual([])
  expect(errors).toEqual([])
})
