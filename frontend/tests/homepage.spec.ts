import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function settleFrames(page: Page, count = 6) {
  await page.evaluate(count => new Promise<void>(resolve => {
    let remaining = count
    const tick = () => { if (--remaining <= 0) resolve(); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }), count)
}

test('previews are honest, keyboard accessible, and remain on the homepage', async ({ page }) => {
  await page.goto('/')
  const demo = page.getByRole('button', { name: 'Human vs AI' })
  const monitor = page.getByRole('button', { name: 'Monitoring' })
  await demo.focus()
  await page.keyboard.press('Enter')
  await expect(demo).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('The challenge is not available yet.')).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(monitor).toBeFocused()
  await page.keyboard.press('Space')
  await expect(demo).toHaveAttribute('aria-expanded', 'false')
  await expect(monitor).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('Monitoring is not available yet. No live feed is connected.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(monitor).toHaveAttribute('aria-expanded', 'false')
  await expect(monitor).toBeFocused()
  expect(new URL(page.url()).pathname).toBe('/')
})

test('pause freezes the rendered water, persists, and respects live reduced-motion changes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await expect(page.locator('.waterline-environment')).toHaveAttribute('data-renderer', 'webgl')
  const pause = page.getByRole('button', { name: 'Pause background motion' })
  await pause.click()
  await expect(page.locator('.home')).toHaveAttribute('data-motion', 'off')
  await settleFrames(page)
  const clip = { x: 100, y: 400, width: 300, height: 200 }
  const still = await page.screenshot({ clip })
  await settleFrames(page, 12)
  expect((await page.screenshot({ clip })).equals(still)).toBe(true)
  await page.reload()
  await expect(pause).toHaveAttribute('aria-pressed', 'true')
  await pause.click()
  await expect(page.locator('.home')).toHaveAttribute('data-motion', 'on')
  const moving = await page.screenshot({ clip })
  await expect.poll(async () => (await page.screenshot({ clip })).equals(moving)).toBe(false)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.home')).toHaveAttribute('data-motion', 'off')
  await expect(page.getByRole('button', { name: /following your reduced-motion/ })).toHaveAttribute('aria-disabled', 'true')
  await settleFrames(page)
  const reduced = await page.screenshot({ clip })
  await settleFrames(page, 12)
  expect((await page.screenshot({ clip })).equals(reduced)).toBe(true)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('.home')).toHaveAttribute('data-motion', 'on')
})

test('initial reduced-motion setting renders a static, complete scene', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.home')).toHaveAttribute('data-motion', 'off')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Human vs AI' })).toBeInViewport()
  await expect(page.locator('.waterline-environment')).toHaveAttribute('data-renderer', 'webgl')
})

test('touch ripples reach the shader and vertical gestures can scroll', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await context.newPage()
  await page.goto('http://localhost:4173')
  await expect(page.locator('.waterline-environment')).toHaveAttribute('data-renderer', 'webgl')
  await page.touchscreen.tap(100, 500)
  await expect.poll(() => page.locator('canvas').evaluate(canvas => {
    const gl = (canvas as HTMLCanvasElement).getContext('webgl')!
    const program = gl.getParameter(gl.CURRENT_PROGRAM)
    return gl.getUniform(program, gl.getUniformLocation(program, 'u_ripples[0]'))[3]
  })).toBe(1)
  await expect(page.locator('.waterline-environment')).toHaveCSS('touch-action', 'pan-y')
  await page.setViewportSize({ width: 390, height: 500 })
  const session = await context.newCDPSession(page)
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 360, y: 440 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 360, y: 180 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await context.close()
})

test('phone previews and zoom-equivalent reflow remain readable', async ({ page }, testInfo) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 640, height: 450 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.getByRole('button', { name: 'Pause background motion' }).click()
    await page.getByRole('button', { name: 'Monitoring' }).click()
    await expect(page.getByText('Monitoring is not available yet. No live feed is connected.')).toBeVisible()
    const panel = await page.getByRole('region', { name: 'Monitoring', exact: true }).boundingBox()
    const heading = await page.getByRole('heading', { level: 1 }).boundingBox()
    expect(panel!.x).toBeGreaterThanOrEqual(0)
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(viewport.width)
    expect(panel!.y).toBeGreaterThan(heading!.y + heading!.height)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('preview-' + viewport.width + '.png'), fullPage: true })
  }
})

test('unavailable WebGL uses the local poster without blocking previews', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, id: string, ...args: unknown[]) {
        if (id === 'webgl') return null
        return Reflect.apply(original, this, [id, ...args])
      },
    })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.waterline-environment')).toHaveAttribute('data-renderer', 'fallback')
  const poster = await page.locator('.waterline-poster').evaluate(element => getComputedStyle(element).backgroundImage)
  expect(poster).toContain('waterline-portrait.jpg')
  expect((await page.request.get('/art/waterline-portrait.jpg')).status()).toBe(200)
  await page.getByRole('button', { name: 'Human vs AI' }).click()
  await expect(page.getByText('The challenge is not available yet.')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('fallback.png'), fullPage: true })
})

test('context loss shows the poster and restores the live scene', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.waterline-environment')).toHaveAttribute('data-renderer', 'webgl')
  const extension = await page.locator('canvas').evaluateHandle(canvas =>
    (canvas as HTMLCanvasElement).getContext('webgl')!.getExtension('WEBGL_lose_context')!)
  await extension.evaluate(extension => extension.loseContext())
  await expect(page.locator('.waterline-environment')).toHaveAttribute('data-renderer', 'fallback')
  await page.getByRole('button', { name: 'Human vs AI' }).click()
  await expect(page.getByText('The challenge is not available yet.')).toBeVisible()
  await extension.evaluate(extension => extension.restoreContext())
  await expect(page.locator('.waterline-environment')).toHaveAttribute('data-renderer', 'webgl')
  await extension.dispose()
})

test('text stays legible against the rendered sky and foreground water', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Pause background motion' }).click()
  await settleFrames(page)
  const pixels = (await page.screenshot()).toString('base64')
  const ratios = await page.evaluate(async pixels => {
    const image = new Image()
    image.src = 'data:image/png;base64,' + pixels
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    const luminance = (rgb: number[]) => {
      const c = rgb.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
      return c[0] * .2126 + c[1] * .7152 + c[2] * .0722
    }
    return ['.hero-description', '.home-footer p'].map(selector => {
      const element = document.querySelector(selector)!
      const rect = element.getBoundingClientRect()
      const text = getComputedStyle(element).color.match(/[\d.]+/g)!.map(Number)
      const background = Array.from(context.getImageData(Math.floor(rect.left - 8), Math.floor(rect.top + rect.height / 2), 1, 1).data)
      return (luminance(background) + .05) / (luminance(text) + .05)
    })
  }, pixels)
  for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5)
})

test('production homepage makes only local requests and no backend calls', async ({ page }) => {
  const external: string[] = []
  const failed: string[] = []
  page.on('requestfailed', request => failed.push(request.url()))
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.hostname !== 'localhost' || /\/api\//.test(url.pathname)) {
      external.push(url.href)
      return route.abort()
    }
    return route.continue()
  })
  await page.goto('/')
  await expect(page.locator('.waterline-environment')).toHaveAttribute('data-renderer', 'webgl')
  await page.getByRole('button', { name: 'Monitoring' }).click()
  await expect(page.getByText('Monitoring is not available yet. No live feed is connected.')).toBeVisible()
  expect(external).toEqual([])
  expect(failed).toEqual([])
})
