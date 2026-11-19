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

/** Chờ autosave ghi xong (trạng thái "Đã lưu" và đã có bản lưu), rồi đọc layer mặt trước. */
async function waitForSave(page: Page): Promise<string> {
  let raw: string | null = null
  await expect
    .poll(
      async () => {
        const [status, value] = await page.evaluate(
          (key) => [document.querySelector('[role=status]')?.textContent ?? '', localStorage.getItem(key)] as const,
          STORAGE_KEY,
        )
        raw = value
        return status === 'Đã lưu' && value !== null
      },
      { message: 'design phải được lưu vào localStorage' },
    )
    .toBe(true)
  return raw!
}

async function savedFrontLayers(page: Page): Promise<SavedLayer[]> {
  const raw = await waitForSave(page)
  return (JSON.parse(raw) as { design: { front: { layers: SavedLayer[] } } }).design.front.layers
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

// ---------------------------------------------------------------------------
// Task 5: trang editor (bố cục, preset, thêm/sửa layer, undo, phím tắt)

type SavedTextLayer = SavedLayer & { props: { text?: string; assetId?: string } }
type SavedDesign = {
  presetId: string
  front: { layers: SavedTextLayer[] }
  back: { layers: SavedTextLayer[] }
}

async function readDesign(page: Page): Promise<SavedDesign | null> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
  return raw ? (JSON.parse(raw) as { design: SavedDesign }).design : null
}

async function layerCount(page: Page, side: 'front' | 'back'): Promise<number | null> {
  return (await readDesign(page))?.[side].layers.length ?? null
}

async function addText(page: Page) {
  await openDrawer(page, 'Chữ')
  await page.getByRole('button', { name: 'Thêm chữ' }).click()
  await expect(page.getByLabel('Nội dung')).toBeFocused()
}

/** Ảnh JPEG w×h (nửa trái đỏ) tạo trong trình duyệt, trả về buffer cho setInputFiles. */
async function makePhoto(page: Page, w: number, h: number): Promise<Buffer> {
  const b64 = await page.evaluate(
    async ([w, h]) => {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#ff0000'
      ctx.fillRect(0, 0, w, h)
      const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.8))
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let s = ''
      for (let i = 0; i < bytes.length; i += 0x8000) {
        s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      }
      return btoa(s)
    },
    [w, h] as const,
  )
  return Buffer.from(b64, 'base64')
}

async function uploadPhoto(page: Page, w = 800, h = 600) {
  const buffer = await makePhoto(page, w, h)
  await page.locator('input[type=file]').setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer })
}

/** Hai màu (r,g,b) gần nhau (ảnh nén JPEG/WebP lệch vài đơn vị). */
function near(a: number[], b: number[], tol = 6): boolean {
  return a.length === 3 && a.every((v, i) => Math.abs(v - b[i]) <= tol)
}

/** Mở ngăn kéo/sheet theo tên mục trên rail hoặc tab bar (không đóng nếu đang mở). */
async function openDrawer(page: Page, name: 'Mẫu' | 'Chữ' | 'Ảnh') {
  const button = page.getByRole('button', { name, exact: true })
  if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click()
}

/** Màu điểm ảnh (r,g,b) trên canvas Konva tại tọa độ trang. */
async function pixelAt(page: Page, p: { x: number; y: number }): Promise<number[]> {
  return page.getByTestId('card-canvas').locator('canvas').first().evaluate((el, p) => {
    const c = el as HTMLCanvasElement
    const r = c.getBoundingClientRect()
    const x = Math.round((p.x - r.left) * (c.width / r.width))
    const y = Math.round((p.y - r.top) * (c.height / r.height))
    return Array.from(c.getContext('2d')!.getImageData(x, y, 1, 1).data.slice(0, 3))
  }, p)
}

test('add text, edit content, persists after reload', async ({ page }) => {
  await addText(page)
  await page.getByLabel('Nội dung').fill('Jennie')
  await expect(page.getByText('Đang lưu…')).toBeVisible()
  await expect(page.getByText('Đã lưu')).toBeVisible()
  await expect.poll(async () => (await readDesign(page))?.front.layers.some((l) => l.props.text === 'Jennie')).toBe(true)
  await page.reload()
  await expect(page.getByTestId('card-canvas').locator('canvas').first()).toBeVisible()
  const design = await readDesign(page)
  expect(design!.front.layers.map((l) => l.props.text)).toContain('Jennie')
  expect(design!.back.layers.map((l) => l.props.text)).not.toContain('Jennie')
})

test('typing in an input does not delete or undo layers', async ({ page }) => {
  await addText(page)
  const input = page.getByLabel('Nội dung')
  await input.fill('AB')
  await input.press('Backspace')
  await input.press('Control+z')
  // Ctrl+Z trong ô là undo gốc của trình duyệt (khôi phục 'AB'), không phải undo của editor
  // (editor sẽ trả về 'Nhập chữ' hoặc xóa layer). Ô vẫn còn, layer vẫn được chọn.
  await expect(input).toHaveValue('AB')
  await expect(page.getByRole('button', { name: 'Xóa lớp' })).toBeVisible()
  await expect.poll(() => layerCount(page, 'front')).toBe(3)
})

test('Delete key removes selected layer; Ctrl+Z restores it', async ({ page }) => {
  const { at } = await cardToPage(page)
  await page.mouse.click(at(nameCenter.x, nameCenter.y).x, at(nameCenter.x, nameCenter.y).y)
  await expect(page.getByRole('button', { name: 'Xóa lớp' })).toBeVisible()
  await page.keyboard.press('Delete')
  await expect(page.getByRole('button', { name: 'Xóa lớp' })).toBeHidden()
  await expect.poll(() => layerCount(page, 'front')).toBe(1)
  await page.keyboard.press('Control+z')
  await expect.poll(() => layerCount(page, 'front')).toBe(2)
  await page.keyboard.press('Control+Shift+z')
  await expect.poll(() => layerCount(page, 'front')).toBe(1)
})

test('"Xóa lớp" button removes the selected layer', async ({ page }) => {
  await addText(page)
  await page.getByRole('button', { name: 'Xóa lớp' }).click()
  await expect.poll(() => layerCount(page, 'front')).toBe(2)
})

test('editing font size and alignment updates the layer', async ({ page }) => {
  await addText(page)
  await page.getByLabel('Cỡ chữ (pt)').fill('30')
  await page.getByRole('button', { name: 'Căn trái' }).click()
  await expect
    .poll(async () => {
      const added = (await readDesign(page))?.front.layers[2] as unknown as
        | { props: { size: number; align: string } }
        | undefined
      return [added?.props.size, added?.props.align]
    })
    .toEqual([30, 'left'])
})

test('upload large photo → compressed ≤1500px and survives reload', async ({ page }) => {
  await uploadPhoto(page, 4000, 3000)
  await expect
    .poll(async () => (await readDesign(page))?.front.layers.filter((l) => l.props.assetId).length ?? 0, {
      timeout: 10_000,
    })
    .toBe(1)
  await page.reload()
  await expect(page.getByTestId('card-canvas').locator('canvas').first()).toBeVisible()
  const sizes = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('icm-assets')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const blobs = await new Promise<Blob[]>((resolve, reject) => {
      const req = db.transaction('assets').objectStore('assets').getAll()
      req.onsuccess = () => resolve(req.result as Blob[])
      req.onerror = () => reject(req.error)
    })
    db.close()
    return Promise.all(
      blobs.map(async (b) => {
        const bmp = await createImageBitmap(b)
        return [bmp.width, bmp.height]
      }),
    )
  })
  expect(sizes).toHaveLength(1)
  expect(Math.max(...sizes[0])).toBeLessThanOrEqual(1500)
  expect(Math.max(...sizes[0])).toBeGreaterThan(1000)
  // ảnh đỏ hiện ở giữa thẻ sau khi tải lại
  const { at } = await cardToPage(page)
  await expect.poll(async () => near(await pixelAt(page, at(CARD.w / 2, CARD.h / 2)), [255, 0, 0])).toBe(true)
})

test('photo goes into the selected empty image slot', async ({ page }) => {
  const { at } = await cardToPage(page)
  // ô ảnh toàn thẻ của preset: bấm vào góc trên (không trúng chữ tên)
  await page.mouse.click(at(10, 10).x, at(10, 10).y)
  await expect(page.getByRole('button', { name: 'Thay ảnh' })).toBeVisible()
  await uploadPhoto(page)
  await expect
    .poll(async () => {
      const layers = (await readDesign(page))?.front.layers ?? []
      return [layers.length, layers[0]?.type, Boolean(layers[0]?.props.assetId)]
    })
    .toEqual([2, 'image', true])
})

test('clicking a selected empty image slot opens the file chooser', async ({ page }) => {
  const { at } = await cardToPage(page)
  await page.mouse.click(at(10, 10).x, at(10, 10).y)
  await expect(page.getByRole('button', { name: 'Thay ảnh' })).toBeVisible()
  const chooser = page.waitForEvent('filechooser')
  await page.mouse.click(at(10, 10).x, at(10, 10).y)
  await chooser
})

test('non-image file shows error toast and adds nothing', async ({ page }) => {
  await page.locator('input[type=file]').setInputFiles({ name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') })
  await expect(page.getByText('Không đọc được ảnh này')).toBeVisible()
  expect(await layerCount(page, 'front')).toBeNull() // chưa có thay đổi nào → chưa ghi gì
})

test('missing image asset renders placeholder without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await uploadPhoto(page)
  await expect
    .poll(async () => (await readDesign(page))?.front.layers.filter((l) => l.props.assetId).length ?? 0)
    .toBe(1)
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('icm-assets')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('assets', 'readwrite')
      tx.objectStore('assets').clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  })
  await page.reload()
  await expect(page.getByTestId('card-canvas').locator('canvas').first()).toBeVisible()
  const { at } = await cardToPage(page)
  // ô giữ chỗ xám #E5E5E5 thay cho ảnh đã mất
  await expect
    .poll(async () => near(await pixelAt(page, at(CARD.w / 2, CARD.h / 2)), [229, 229, 229], 2))
    .toBe(true)
  expect(errors).toEqual([])
})

test('switching preset when dirty asks for confirmation', async ({ page }) => {
  await addText(page)
  await openDrawer(page, 'Mẫu')
  await page.getByRole('button', { name: 'Polaroid cơ bản' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Đổi mẫu?' })).toBeVisible()
  await page.getByRole('button', { name: 'Hủy' }).click()
  await expect(page.getByRole('alertdialog')).toBeHidden()
  await expect.poll(async () => (await readDesign(page))?.presetId).toBe('photocard-basic')

  await page.getByRole('button', { name: 'Polaroid cơ bản' }).click()
  await page.getByRole('button', { name: 'Đổi mẫu' }).click()
  await expect.poll(async () => (await readDesign(page))?.presetId).toBe('polaroid-basic')
  // vẫn hoàn tác được
  await page.getByRole('button', { name: 'Hoàn tác' }).click()
  await expect.poll(async () => (await readDesign(page))?.presetId).toBe('photocard-basic')
})

test('after reload, an edited design still asks before switching preset', async ({ page }, testInfo) => {
  await addText(page)
  await page.getByLabel('Nội dung').fill('Jennie')
  await expect.poll(async () => (await readDesign(page))?.front.layers.some((l) => l.props.text === 'Jennie')).toBe(true)
  await page.reload()
  await expect(page.getByTestId('card-canvas').locator('canvas').first()).toBeVisible()
  if (testInfo.project.name === 'desktop') {
    // đã chỉnh → không mở sẵn ngăn "Mẫu"
    await expect(page.getByRole('button', { name: 'Mẫu', exact: true })).toHaveAttribute('aria-pressed', 'false')
  }
  await openDrawer(page, 'Mẫu')
  await page.getByRole('button', { name: 'Polaroid cơ bản' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: 'Hủy' }).click()
  await expect.poll(async () => (await readDesign(page))?.presetId).toBe('photocard-basic')
  expect((await readDesign(page))!.front.layers.some((l) => l.props.text === 'Jennie')).toBe(true)
})

test('switching preset when not dirty applies immediately', async ({ page }) => {
  await openDrawer(page, 'Mẫu')
  await page.getByRole('button', { name: 'Polaroid cơ bản' }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect.poll(async () => (await readDesign(page))?.presetId).toBe('polaroid-basic')
})

test('front and back keep separate layers', async ({ page }) => {
  await page.getByRole('tab', { name: 'Mặt sau' }).click()
  await expect(page.getByRole('tab', { name: 'Mặt sau' })).toHaveAttribute('aria-selected', 'true')
  await addText(page)
  await expect.poll(() => layerCount(page, 'back')).toBe(2)
  expect(await layerCount(page, 'front')).toBe(2)
})

test('undo/redo buttons', async ({ page }) => {
  const undo = page.getByRole('button', { name: 'Hoàn tác' })
  const redo = page.getByRole('button', { name: 'Làm lại' })
  await expect(undo).toBeDisabled()
  await expect(redo).toBeDisabled()
  await addText(page)
  await expect.poll(() => layerCount(page, 'front')).toBe(3)
  await undo.click()
  await expect.poll(() => layerCount(page, 'front')).toBe(2)
  await expect(undo).toBeDisabled()
  await redo.click()
  await expect.poll(() => layerCount(page, 'front')).toBe(3)
  await expect(redo).toBeDisabled()
})

test('logo links back to landing', async ({ page }) => {
  await page.getByRole('link', { name: 'Idol Card Maker' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('desktop rail toggles drawers, "Mẫu" open by default', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'chỉ desktop')
  const preset = page.getByRole('button', { name: 'Mẫu', exact: true })
  await expect(preset).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Photocard cơ bản' })).toBeVisible()
  await preset.click()
  await expect(preset).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: 'Photocard cơ bản' })).toBeHidden()
  await page.getByRole('button', { name: 'Ảnh', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Tải ảnh lên' })).toBeVisible()
})

test('mobile shows bottom tab bar with Mẫu/Chữ/Ảnh', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'chỉ mobile')
  const nav = page.getByRole('navigation', { name: 'Công cụ' })
  for (const name of ['Mẫu', 'Chữ', 'Ảnh']) {
    await expect(nav.getByRole('button', { name, exact: true })).toBeVisible()
  }
  const navBox = (await nav.boundingBox())!
  expect(navBox.y + navBox.height).toBeGreaterThan(844 - 2) // dính đáy màn hình
  await nav.getByRole('button', { name: 'Ảnh', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tải ảnh lên' })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
})
