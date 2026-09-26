import { expect, test } from '@playwright/test'

for (const viewport of [
  { width: 1440, height: 900 }, { width: 1280, height: 800 },
  { width: 1024, height: 768 }, { width: 768, height: 1024 },
  { width: 390, height: 844 }, { width: 320, height: 667 },
]) {
  test(`Aquatic homepage composition ${viewport.width}`, async ({ page }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.locator('.home-waves')).toBeVisible()
    await page.getByRole('button', { name: 'Pause background motion' }).click()
    await page.evaluate(() => window.scrollTo(0, 0))
    const title = await page.getByRole('heading', { level: 1 }).boundingBox()
    const actions = await page.locator('.home-actions').boundingBox()
    const scene = await page.locator('.home-waves').boundingBox()
    const home = await page.locator('.home').boundingBox()
    expect(title!.y + title!.height).toBeLessThan(actions!.y)
    expect(actions!.y + actions!.height).toBeLessThanOrEqual(viewport.height)
    expect(scene!.y).toBeGreaterThan(title!.y + title!.height)
    expect(scene!.width).toBeGreaterThanOrEqual(viewport.width)
    expect(scene!.y + scene!.height).toBeGreaterThanOrEqual(home!.y + home!.height)
    const buttonHeights = await page.locator('.home-cta').evaluateAll(buttons =>
      buttons.map(button => button.getBoundingClientRect().height))
    expect(buttonHeights[0]).toBe(buttonHeights[1])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.mouse.move(0, 0)
    await page.screenshot({ path: testInfo.outputPath(`waterline-${viewport.width}.png`), fullPage: true })
    expect(errors).toEqual([])
  })
}
