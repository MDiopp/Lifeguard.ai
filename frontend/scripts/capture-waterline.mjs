import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'

// Regenerate the local first-paint / context-loss posters after changing the scene.
// Run with the development server at localhost:5173. No remote assets are used.
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const [name, viewport] of [
    ['desktop', { width: 1200, height: 800 }],
    ['portrait', { width: 480, height: 960 }],
    ['compact', { width: 390, height: 680 }],
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto('http://localhost:5173/')
    await page.locator('[data-renderer="webgl"]').waitFor()
    await page.addStyleTag({ content: '.site-header, .home-main, .home-footer, .skip-link { visibility: hidden !important; }' })
    const path = fileURLToPath(new URL('../public/art/waterline-' + name + '.jpg', import.meta.url))
    await page.screenshot({ path, type: 'jpeg', quality: 90 })
    console.log('Captured ' + name + ' poster')
    await context.close()
  }
} finally {
  await browser.close()
}
