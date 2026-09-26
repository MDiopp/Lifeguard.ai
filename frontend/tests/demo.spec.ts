import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { frameAt, previewResult, previewRounds } from '../src/demo/preview'

async function startRound(page: Page) {
  await page.getByRole('button', { name: 'Start Round' }).click()
  await expect(page.locator('.demo-page')).toHaveAttribute('data-phase', 'countdown')
  for (let index = 0; index < 3; index++) await page.clock.runFor(1000)
  await expect(page.locator('.demo-page')).toHaveAttribute('data-phase', 'active')
}
async function reveal(page: Page) {
  await page.clock.runFor(1200)
  await expect(page.locator('.demo-page')).toHaveAttribute('data-phase', 'ending')
  await page.clock.runFor(1000)
  await expect(page.locator('.demo-page')).toHaveAttribute('data-phase', 'results')
}

test('two rounds include fair active states, direct taps, results and completion', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.clock.install()
  await page.goto('/demo')
  await expect(page.getByText('Round 1 of 2', { exact: true })).toBeVisible()
  await expect(page.getByText('Real pool footage is not connected yet.')).toBeVisible()
  await startRound(page)
  await expect(page.getByRole('button', { name: 'Pause round' })).toBeInViewport({ ratio: 1 })
  await expect(page.locator('.demo-reveal-ring, .demo-results')).toHaveCount(0)
  await expect(page.getByText(/confidence|risk score|coral cap|AI noticed first/i)).toHaveCount(0)
  const stage = page.getByRole('button', { name: /Pool footage/ })
  await stage.click({ position: { x: 8, y: 8 } })
  await expect(page.getByText('No swimmer selected. Tap directly on a swimmer.')).toBeVisible()
  await expect(page.locator('.demo-page')).toHaveAttribute('data-phase', 'active')
  await page.clock.runFor(6000)
  await page.screenshot({ path: testInfo.outputPath('demo-active-ipad.png'), fullPage: true })
  const box = await stage.boundingBox()
  const swimmer = frameAt(previewRounds[0], 6).find(s => s.id === 'b')!
  await stage.click({ position: { x: box!.width * swimmer.x, y: box!.height * swimmer.y } })
  await expect(page.getByText('Selection recorded', { exact: true })).toBeVisible()
  await expect(page.locator('.demo-results')).toHaveCount(0)
  await expect(page.locator('.demo-tap-ring')).toBeVisible()
  await reveal(page)
  await expect(page.getByRole('heading', { name: 'You noticed first.' })).toBeVisible()
  await expect(page.getByText('Correct selection')).toHaveCount(2)
  await page.screenshot({ path: testInfo.outputPath('demo-results-ipad.png'), fullPage: true })
  await page.getByRole('button', { name: 'Continue to Round 2' }).click()
  await expect(page.getByText('Round 2 of 2', { exact: true })).toBeVisible()
  await startRound(page)
  await expect(page.locator('.demo-results, .demo-reveal-ring')).toHaveCount(0)
  await page.clock.runFor(24000)
  await page.clock.runFor(1000)
  await expect(page.getByText('No selection this round')).toBeVisible()
  await page.getByRole('button', { name: 'Finish challenge' }).click()
  await expect(page.getByRole('heading', { name: 'Better, together.' })).toBeVisible()
  await expect(page.getByText(/Round 3/)).toHaveCount(0)
  await expect(page.locator('.demo-summary > div')).toHaveCount(2)
  await page.screenshot({ path: testInfo.outputPath('demo-complete.png'), fullPage: true })
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText('Round 1 of 2', { exact: true })).toBeVisible()
})

test('pause freezes the round clock and keyboard supports direct spatial selection', async ({ page }) => {
  await page.clock.install()
  await page.goto('/demo')
  await startRound(page)
  await page.clock.runFor(2000)
  await page.getByRole('button', { name: 'Pause round' }).click()
  const still = await page.locator('.demo-stage').screenshot()
  await page.clock.runFor(10000)
  expect((await page.locator('.demo-stage').screenshot()).equals(still)).toBe(true)
  await page.getByRole('button', { name: 'Resume round' }).click()
  await page.clock.runFor(4000)
  const stage = page.getByRole('button', { name: /Pool footage/ })
  await stage.focus()
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight')
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await reveal(page)
  await expect(page.getByRole('heading', { name: 'You noticed first.' })).toBeVisible()
  const humanTime = await page.locator('.demo-result-time').first().innerText()
  expect(parseFloat(humanTime)).toBeLessThan(9.2)
})

test('preview scoring does not reward early guesses or wrong swimmers', () => {
  const round = previewRounds[0]
  expect(previewRounds).toHaveLength(2)
  expect(previewResult(round, { x: .6, y: .3, swimmerId: 'b', timestamp: 1 }).humanCorrect).toBe(false)
  expect(previewResult(round, { x: .2, y: .2, swimmerId: 'a', timestamp: 6 }).first).toBe('ai')
  expect(previewResult(round, null).humanCorrect).toBe(false)
  expect(previewResult(round, { x: .6, y: .3, swimmerId: 'b', timestamp: 9.2 }).first).toBe('tie')
})

test('responsive introduction, touch targets and reduced motion remain usable', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 667 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/demo')
    await page.evaluate(() => document.fonts.ready)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Human vs AI')
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Human vs AI' })).toHaveAttribute('aria-current', 'page')
    const button = await page.getByRole('button', { name: 'Start Round' }).boundingBox()
    expect(button!.height).toBeGreaterThanOrEqual(48)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`demo-intro-${viewport.width}.png`), fullPage: true })
  }
  expect(errors).toEqual([])
})

test('touch input records a single selection and reload resets the preview', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.clock.install()
  await page.goto('http://localhost:4173/demo')
  await startRound(page)
  await page.clock.runFor(6000)
  const bounds = await page.locator('.demo-stage').boundingBox()
  const swimmer = frameAt(previewRounds[0], 6).find(s => s.id === 'b')!
  await page.touchscreen.tap(bounds!.x + bounds!.width * swimmer.x, bounds!.y + bounds!.height * swimmer.y)
  await expect(page.locator('.demo-page')).toHaveAttribute('data-phase', 'submitted')
  await expect(page.locator('.demo-tap-ring')).toHaveCSS('animation-name', 'none')
  await page.reload()
  await expect(page.locator('.demo-page')).toHaveAttribute('data-phase', 'intro')
  await context.close()
})
