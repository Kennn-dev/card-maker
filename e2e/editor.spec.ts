import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'icm:design:v1'
const CARD = { w: 55, h: 85, bleed: 3 }
// Layer chữ tên của preset photocard-basic (src/presets/photocard-basic.ts)
const NAME_TEXT = { x: 7.5, y: 70, w: 40, h: 10 }

type SavedLayer = { id: string; type: string; x: number; y: number; w: number; h: number }

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    localStorage.clear()
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('icm-assets')
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  })
  await page.goto('/editor')
  await expect(page.getByTestId('card-canvas').locator('canvas').first()).toBeVisible()
})

/** Đổi tọa độ mm trên thẻ (gốc = góc trên trái thành phẩm) sang tọa độ trang. */
async function cardToPage(page: Page) {
  const wrapper = page.getByTestId('card-canvas')
  const box = await wrapper.boundingBox()
  if (!box) throw new Error('card-canvas không có bounding box')
  const s = Number(await wrapper.getAttribute('data-px-per-mm'))
  expect(s).toBeGreaterThan(0)
  const originX = box.x + (box.width - (CARD.w + 2 * CARD.bleed) * s) / 2 + CARD.bleed * s
  const originY = box.y + (box.height - (CARD.h + 2 * CARD.bleed) * s) / 2 + CARD.bleed * s
  return { s, at: (xMm: number, yMm: number) => ({ x: originX + xMm * s, y: originY + yMm * s }) }
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 10 })
  await page.mouse.up()
}

async function savedFrontLayers(page: Page): Promise<SavedLayer[]> {
  await page.waitForTimeout(1100)
  const raw = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
  expect(raw, 'design phải được lưu vào localStorage').not.toBeNull()
  return (JSON.parse(raw!) as { design: { front: { layers: SavedLayer[] } } }).design.front.layers
}

const nameCenter = { x: NAME_TEXT.x + NAME_TEXT.w / 2, y: NAME_TEXT.y + NAME_TEXT.h / 2 }

test('renders the default preset on canvas', async ({ page }) => {
  await expect(page.getByTestId('card-canvas').locator('canvas').first()).toBeVisible()
  expect(Number(await page.getByTestId('card-canvas').getAttribute('data-px-per-mm'))).toBeGreaterThan(0)
})

test('dragging the name text moves it and snaps to center x', async ({ page }) => {
  const { at } = await cardToPage(page)
  // lệch phải 0.8 mm (trong ngưỡng snap 1.5 mm) và xuống 4 mm (ngoài mọi ngưỡng) để chắc chắn đã kéo
  await drag(page, at(nameCenter.x, nameCenter.y), at(nameCenter.x + 0.8, nameCenter.y + 4))
  const text = (await savedFrontLayers(page)).find((l) => l.type === 'text')!
  expect(Math.abs(text.x + text.w / 2 - CARD.w / 2)).toBeLessThanOrEqual(0.1)
  expect(Math.abs(text.y - (NAME_TEXT.y + 4))).toBeLessThanOrEqual(0.5)
})

test('dragging far moves the layer and is saved', async ({ page }) => {
  const { at } = await cardToPage(page)
  await drag(page, at(nameCenter.x, nameCenter.y), at(nameCenter.x + 10, nameCenter.y))
  const text = (await savedFrontLayers(page)).find((l) => l.type === 'text')!
  expect(Math.abs(text.x - (NAME_TEXT.x + 10))).toBeLessThanOrEqual(0.5)
  expect(Math.abs(text.y - NAME_TEXT.y)).toBeLessThanOrEqual(0.5)
})

test('canvas screenshot of default preset', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'ảnh chụp chỉ so trên desktop')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.getByTestId('card-canvas')).toHaveScreenshot('photocard-basic.png', {
    maxDiffPixelRatio: 0.01,
  })
})
