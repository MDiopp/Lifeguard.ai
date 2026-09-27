import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/demo/selection', route => route.fulfill({ json: { rounds: [{ video_id: 'easy_01', difficulty: 'easy' }, { video_id: 'hard_01', difficulty: 'hard' }] } }))
  await page.route('**/api/demo/rounds/easy_01/start', route => route.fulfill({ json: { round_id: 'round-easy', video_id: 'easy_01', difficulty: 'easy', video_url: '/api/demo/videos/easy_01', ai_answer_time: 12.5 } }))
  await page.route('**/api/demo/rounds/hard_01/start', route => route.fulfill({ json: { round_id: 'round-hard', video_id: 'hard_01', difficulty: 'hard', video_url: '/api/demo/videos/hard_01', ai_answer_time: null } }))
  await page.route('**/api/demo/videos/easy_01', route => route.fulfill({ path: resolve('../demo_videos/easy/easy_01.mp4'), contentType: 'video/mp4' }))
  await page.route('**/api/demo/videos/hard_01', route => route.fulfill({ path: resolve('../demo_videos/hard/hard_01.mp4'), contentType: 'video/mp4' }))
  await page.route('**/api/demo/rounds/round-easy/human-answer', async route => {
    const body = route.request().postDataJSON() as { answer: string; started_at: number }
    expect(body.answer).toBe('girl in the pink suit')
    expect(body.started_at).toBe(8.42)
    await route.fulfill({ json: { ...body, correct: true } })
  })
  await page.route('**/api/demo/rounds/round-easy/result', route => route.fulfill({ json: { round_id: 'round-easy', video_id: 'easy_01', ai: { answered: true, time: 12.5, correct: true, answer: 'Possible distress detected' }, human: { time: 8.42, correct: true, answer: 'girl in the pink suit' }, first: 'human' } }))
  await page.route('**/api/demo/rounds/round-hard/human-answer', route => route.fulfill({ json: { answer: 'girl middle left', started_at: 15, correct: true } }))
  await page.route('**/api/demo/rounds/round-hard/result', route => route.fulfill({ json: { round_id: 'round-hard', video_id: 'hard_01', ai: { answered: false, time: null, correct: false, answer: null }, human: { time: 15, correct: true, answer: 'girl middle left' }, first: 'human' } }))
})

test('typed description records the first-character time and compares the result', async ({ page }) => {
  await page.clock.install()
  await page.goto('/demo')
  await page.getByRole('button', { name: 'Start Round' }).click()
  await expect(page.locator('.demo-page')).toHaveAttribute('data-phase', 'countdown')
  await page.clock.runFor(3000)
  await expect(page.locator('.demo-page')).toHaveAttribute('data-phase', 'active')
  await page.locator('.demo-stage video').evaluate(video => {
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 8.42 })
    video.dispatchEvent(new Event('timeupdate'))
  })
  await page.getByLabel('Your answer').fill('girl in the pink suit')
  await page.getByRole('button', { name: 'Submit answer' }).click()
  await expect(page.getByText('Answer recorded. Keep watching while the round finishes.')).toBeVisible()
  await page.locator('.demo-stage video').evaluate(video => {
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 12.5 })
    video.dispatchEvent(new Event('timeupdate'))
  })
  await page.clock.runFor(700)
  await expect(page.locator('.demo-page')).toHaveAttribute('data-phase', 'results')
  await expect(page.getByRole('heading', { name: 'You noticed first.' })).toBeVisible()
  await expect(page.locator('.demo-result-time').first()).toContainText('8.42')
  await expect(page.locator('.demo-result-time').last()).toContainText('12.50')
  await expect(page.getByText('Correct answer')).toHaveCount(1)
  await expect(page.getByText('Correct detection')).toBeVisible()
  await expect(page.getByText('Black girl in pink suit')).toHaveCount(0)
})

test('video ending waits for the human answer', async ({ page }) => {
  await page.clock.install()
  await page.goto('/demo')
  await page.getByRole('button', { name: 'Start Round' }).click()
  await page.clock.runFor(3000)

  await page.locator('.demo-stage video').dispatchEvent('ended')

  await expect(page.locator('.demo-page')).toHaveAttribute('data-phase', 'active')
  await expect(page.getByText('The clip has ended. Submit your answer to complete the round.')).toBeVisible()
  await expect(page.locator('.demo-results')).toHaveCount(0)
})

test('introduction remains responsive and uses the established navigation', async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/demo')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Human vs AI')
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Human vs AI' })).toHaveAttribute('aria-current', 'page')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('asks the backend to exclude both clips from the previous demo', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lifeguard-ai:last-demo-videos', JSON.stringify(['easy_01', 'hard_01']))
  })
  await page.unroute('**/api/demo/selection')
  let exclusions: string[] = []
  await page.route('**/api/demo/selection', async route => {
    exclusions = (route.request().postDataJSON() as { exclude_video_ids: string[] }).exclude_video_ids
    await route.fulfill({ json: { rounds: [{ video_id: 'easy_02', difficulty: 'easy' }, { video_id: 'hard_01', difficulty: 'hard' }] } })
  })

  await page.goto('/demo')

  await expect(page.getByRole('button', { name: 'Start Round' })).toBeEnabled()
  expect(exclusions).toEqual(['easy_01', 'hard_01'])
})

test('a no-answer AI round waits for the video end and cannot beat a correct human', async ({ page }) => {
  await page.unroute('**/api/demo/selection')
  await page.route('**/api/demo/selection', route => route.fulfill({ json: { rounds: [{ video_id: 'hard_01', difficulty: 'hard' }, { video_id: 'hard_01', difficulty: 'hard' }] } }))
  await page.clock.install()
  await page.goto('/demo')
  await page.getByRole('button', { name: 'Start Round' }).click()
  await page.clock.runFor(3000)
  await page.locator('.demo-stage video').evaluate(video => {
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 15 })
    video.dispatchEvent(new Event('timeupdate'))
  })
  await page.getByLabel('Your answer').fill('girl middle left')
  await page.getByRole('button', { name: 'Submit answer' }).click()
  await expect(page.locator('.demo-results')).toHaveCount(0)

  await page.locator('.demo-stage video').dispatchEvent('ended')
  await expect(page.locator('.demo-page')).toHaveAttribute('data-phase', 'ending')
  await page.clock.runFor(700)

  await expect(page.locator('.demo-page')).toHaveAttribute('data-phase', 'results')
  await expect(page.getByRole('heading', { name: 'You noticed first.' })).toBeVisible()
  await expect(page.getByText('No answer', { exact: true })).toBeVisible()
  await expect(page.getByText('No detection submitted')).toBeVisible()
})
