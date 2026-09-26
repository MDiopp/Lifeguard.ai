import { expect, test } from '@playwright/test'

for (const viewport of [
  { width: 1440, height: 900 }, { width: 1280, height: 800 },
  { width: 1024, height: 768 }, { width: 768, height: 1024 },
  { width: 390, height: 844 }, { width: 320, height: 667 },
]) {
  test(`Waterline first viewport ${viewport.width}`, async ({ page }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.locator('.waterline-environment')).toHaveAttribute('data-renderer', 'webgl')
    await page.getByRole('button', { name: 'Pause background motion' }).click()
    const title = await page.getByRole('heading', { level: 1 }).boundingBox()
    const actions = await page.locator('.experiences').boundingBox()
    const scene = await page.locator('.waterline-environment').boundingBox()
    expect(title!.y + title!.height).toBeLessThan(actions!.y)
    expect(actions!.y + actions!.height).toBeLessThanOrEqual(viewport.height)
    expect(scene!.y).toBe(0)
    expect(scene!.width).toBe(viewport.width)
    const buttonHeights = await page.locator('.experience-button').evaluateAll(buttons =>
      buttons.map(button => button.getBoundingClientRect().height))
    expect(buttonHeights[0]).toBe(buttonHeights[1])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.mouse.move(0, 0)
    await page.screenshot({ path: testInfo.outputPath(`waterline-${viewport.width}.png`), fullPage: true })
    expect(errors).toEqual([])
  })
}
