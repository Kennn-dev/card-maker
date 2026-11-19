# M1 — Lõi editor: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang `/editor` dựng được một thẻ 2 mặt từ preset tạm: thêm/sửa chữ và ảnh, kéo/đổi kích thước/xoay có snap, có viền bleed và safe zone, undo/redo, tự lưu (F5 không mất, kể cả ảnh).

**Architecture:** `CardDesign` (JSON, đơn vị mm) là nguồn dữ liệu duy nhất, nằm trong một store Zustand có lịch sử undo và lưu xuống localStorage (debounce 1 s). Ảnh lưu ở IndexedDB theo `assetId`. Canvas Konva chỉ đọc store để vẽ và gửi thay đổi về store khi người dùng kéo/biến đổi xong. Logic thuần (model, snap, store, kích thước ảnh) có unit test; phần canvas test bằng Playwright trên Chrome thật.

**Tech Stack:** thêm `konva`, `react-konva`, `zustand`, `idb-keyval`, `sonner` (+ devDep `fake-indexeddb`); các component shadcn/ui mới viết tay (registry bị chặn mạng): `tabs`, `alert-dialog`, `input`, `label`, `sonner`.

**Spec:**
- `docs/plans/2026-11-17-idol-card-maker-design.md` (mục 2 Data model, mục 3 Editor, mục 5.3 Lưu trữ, mục 6 UI)
- `docs/superpowers/specs/2026-11-19-dev-workflow-design.md` (mục 5 mốc M1, mục 7 kiểm thử)
- `docs/backlog.md` (mục `[M1]` error element)

**Nhóm review:** **A** = Task 1–3 (logic thuần); **B** = Task 4–5 (canvas + trang editor); sau đó review tổng nhánh.

## Global Constraints

- Mọi tọa độ, kích thước của layer tính bằng **mm**; chỉ đổi sang px khi vẽ.
- Thẻ: `size: { w: 55, h: 85, bleed: 3, radius: 3 }` (mm). Gốc tọa độ (0,0) = góc trên trái của **thành phẩm** (không tính bleed); layer được phép nằm trong vùng bleed (tọa độ âm hoặc > w/h).
- Safe zone: lùi **3 mm** vào trong mép thành phẩm (AI tự quyết, spec không ghi số).
- Ảnh upload: nén cạnh dài về **1500 px**, lưu IndexedDB; thiết kế lưu localStorage; tự lưu **1 giây** sau thay đổi.
- Undo/redo tối đa **50** bước; phím **Ctrl+Z / Ctrl+Shift+Z** (Cmd trên Mac).
- Đổi preset khi đã chỉnh sửa → hỏi xác nhận.
- Viền bleed màu đỏ, safe zone nét đứt; chỉ hiện trong editor.
- MVP M1 chỉ có layer `image` và `text`; panel Lớp, crop, filter, font Việt/Hàn riêng cho thẻ, các element khác là M2. Panel thuộc tính ở M1 là bản tối thiểu (xem Task 5).
- UI dùng component shadcn/ui (`@/components/ui/*`), icon `lucide-react`, copy tiếng Việt.
- Mọi commit phải qua `npm run check` xanh. E2E dùng `channel: 'chrome'`.
- Không copy CSS của poke-holo. Không làm gì của M2+.

## Review Focus

1. **Ảnh rất lớn hoặc file không phải ảnh** (ảnh điện thoại 4000×3000, file .txt/.heic không đọc được) → ảnh lớn được thu về ≤1500 px; file không đọc được hiện thông báo "Không đọc được ảnh này" và không thêm layer (Task 3 unit + Task 5 E2E).
2. **localStorage hỏng hoặc khác phiên bản** → editor mở với preset mặc định, không trắng trang (Task 2 unit).
3. **Ảnh có trong thiết kế nhưng mất trong IndexedDB** (xóa dữ liệu trang một phần) → vẽ ô giữ chỗ, không lỗi (Task 3 unit + Task 5 E2E).
4. **Gõ trong ô nhập rồi bấm Backspace/Delete/Ctrl+Z** → chỉ sửa chữ trong ô, không xóa layer hay undo cả thiết kế (Task 5 E2E).
5. **Undo khi không còn gì / vượt 50 bước / sau khi đổi preset** → không lỗi; lịch sử không quá 50; undo sau đổi preset trả về thiết kế trước đó (Task 2 unit).

## Tiêu chí nghiệm thu M1 (gửi Nhat đọc lướt trước khi code)

- [ ] Chọn 1 trong 2 preset tạm (Photocard cơ bản, Polaroid cơ bản); đổi preset khi đã sửa thì có hỏi xác nhận.
- [ ] Thêm chữ; sửa nội dung, cỡ chữ, màu ở panel bên phải.
- [ ] Thêm ảnh từ máy (cả ảnh chụp điện thoại dung lượng lớn); ô ảnh trống của preset bấm vào là thay được ảnh.
- [ ] Kéo, đổi kích thước, xoay layer; hút vào tâm thẻ và mép safe zone. Kéo thả có "đã tay" không.
- [ ] Thấy viền bleed (đỏ) và safe zone (nét đứt).
- [ ] Chuyển mặt trước / mặt sau, mỗi mặt có layer riêng.
- [ ] Undo/redo bằng nút và Ctrl+Z / Ctrl+Shift+Z; xóa layer bằng nút hoặc phím Delete.
- [ ] F5 không mất bài, kể cả ảnh.
- [ ] Mở thẳng editor khi mạng lỗi tải trang → thấy thông báo tiếng Việt thay vì màn lỗi kỹ thuật.
- [ ] Trên điện thoại: mở và chạm được, chưa tối ưu (bố cục tab ở M5).

## File Structure

```
src/model/card.ts          # types CardDesign, Side, Layer, TextProps, ImageProps; CARD, SAFE_MM
src/model/factory.ts       # createTextLayer, createImageLayer, createDesign
src/model/snap.ts          # snapBox
src/model/validate.ts      # isCardDesign
src/presets/index.ts       # Preset type, PRESETS, loadPresetDesign
src/presets/photocard-basic.ts · polaroid-basic.ts
src/editor/store.ts        # useEditorStore (zustand, history, persist debounce)
src/storage/assets.ts      # putImage, getImageUrl, pruneAssets
src/storage/image.ts       # fitWithin, compressImage
src/editor/canvas/CardCanvas.tsx · Guides.tsx · TextNode.tsx · ImageNode.tsx · useStageScale.ts
src/editor/panels/PresetPanel.tsx · PropertiesPanel.tsx
src/editor/EditorToolbar.tsx · useEditorShortcuts.ts
src/pages/EditorPage.tsx   # bố cục 3 cột
src/components/RouteError.tsx
src/components/ui/tabs.tsx · alert-dialog.tsx · input.tsx · label.tsx · sonner.tsx
e2e/editor.spec.ts
```

---

### Task 1: Data model, snap, preset tạm

**Files:**
- Create: `src/model/card.ts`, `src/model/factory.ts`, `src/model/snap.ts`, `src/model/validate.ts`, `src/presets/index.ts`, `src/presets/photocard-basic.ts`, `src/presets/polaroid-basic.ts`
- Test: `src/model/model.test.ts`, `src/presets/presets.test.ts`

**Interfaces:**
- Produces (`src/model/card.ts`):
  ```ts
  export const CARD = { w: 55, h: 85, bleed: 3, radius: 3 } as const
  export const SAFE_MM = 3
  export type SideName = 'front' | 'back'
  export type TextProps = { text: string; font: string; size: number /* pt */; color: string; align: 'left' | 'center' | 'right' }
  export type ImageProps = { assetId?: string }   // không có assetId = ô giữ chỗ "Thêm ảnh"
  type Base = { id: string; x: number; y: number; w: number; h: number; rotation: number; locked?: boolean; hidden?: boolean }
  export type TextLayer = Base & { type: 'text'; props: TextProps }
  export type ImageLayer = Base & { type: 'image'; props: ImageProps }
  export type Layer = TextLayer | ImageLayer
  export type Side = { background: { color: string }; layers: Layer[] }
  export type CardDesign = { version: 1; presetId: string; size: typeof CARD; finish: 'glossy'; front: Side; back: Side }
  ```
  (`finish` chỉ có `'glossy'` ở M1; M3 mở rộng union.)
- `createTextLayer(partial?: Partial<TextLayer>): TextLayer` — mặc định `text: 'Nhập chữ'`, `font: 'Geist'`, `size: 14`, `color: '#111111'`, `align: 'center'`, khung `w: 40, h: 10`, căn giữa thẻ. `createImageLayer(partial?)` — mặc định khung `w: 40, h: 50` căn giữa. `id` = `crypto.randomUUID()`.
- `snapBox(box: {x,y,w,h}, thresholdMm = 1.5): {x: number; y: number}` — hút tâm hộp về tâm thẻ (27.5, 42.5) và mép hộp về mép safe zone (x: 3 và 52; y: 3 và 82) khi lệch ≤ ngưỡng; mỗi trục chọn đích gần nhất; không xét rotation.
- `isCardDesign(x: unknown): x is CardDesign` — kiểm tra `version === 1`, `front.layers`/`back.layers` là mảng, mỗi layer có `type` ∈ {text, image} và số hợp lệ cho x/y/w/h/rotation.
- `PRESETS: Preset[]` với `Preset = { id: string; name: string; design: CardDesign }`; id `'photocard-basic'` (tên "Photocard cơ bản": mặt trước ảnh tràn bleed `x:-3,y:-3,w:61,h:91` + chữ tên ở đáy trong safe zone; mặt sau nền `#f5f5f5` + chữ "Idol Card Maker") và `'polaroid-basic'` (tên "Polaroid cơ bản": nền trắng, ảnh `x:5,y:5,w:45,h:55`, chữ caption dưới ảnh; mặt sau nền trắng trống). `loadPresetDesign(id): CardDesign` trả bản sao sâu với id layer mới; id lạ → preset đầu tiên.

- [ ] **Step 1: Write the failing tests**
  ```ts
  // model.test.ts
  it('snaps box center to card center within 1.5mm', () => {
    expect(snapBox({ x: 8.6, y: 18, w: 20, h: 10 })).toEqual({ x: 8.6, y: 18 })        // tâm x=18.6: xa
    expect(snapBox({ x: 18.0, y: 37.0, w: 20, h: 10 })).toEqual({ x: 17.5, y: 37.5 })   // tâm (28,42) → (27.5,42.5)
  })
  it('snaps edges to safe zone', () => {
    expect(snapBox({ x: 4.2, y: 70.9, w: 10, h: 10 })).toEqual({ x: 3, y: 72 })        // trái→3, đáy 80.9→82
  })
  it('createTextLayer defaults', () => {
    const l = createTextLayer()
    expect(l).toMatchObject({ type: 'text', w: 40, h: 10, props: { text: 'Nhập chữ', size: 14, align: 'center' } })
    expect(l.x).toBeCloseTo(7.5); expect(createTextLayer().id).not.toBe(l.id)
  })
  it('isCardDesign rejects garbage and wrong version', () => {
    expect(isCardDesign(null)).toBe(false)
    expect(isCardDesign({ version: 2, front: { layers: [] }, back: { layers: [] } })).toBe(false)
    expect(isCardDesign(loadPresetDesign('photocard-basic'))).toBe(true)
  })
  // presets.test.ts
  it('has the two temporary presets', () => {
    expect(PRESETS.map(p => p.id)).toEqual(['photocard-basic', 'polaroid-basic'])
  })
  it('loadPresetDesign returns fresh copies with new layer ids', () => {
    const a = loadPresetDesign('polaroid-basic'), b = loadPresetDesign('polaroid-basic')
    expect(a).not.toBe(b); expect(a.front.layers[0].id).not.toBe(b.front.layers[0].id)
    a.front.layers[0].x = 99; expect(loadPresetDesign('polaroid-basic').front.layers[0].x).toBe(5)
  })
  it('unknown preset id falls back to first preset', () => {
    expect(loadPresetDesign('nope').presetId).toBe('photocard-basic')
  })
  ```
- [ ] **Step 2:** `npm run test` → FAIL (module chưa có).
- [ ] **Step 3:** Viết các file theo Interfaces. Preset viết bằng TypeScript (không JSON) để có kiểm tra kiểu.
- [ ] **Step 4:** `npm run test` → PASS; `npm run check` xanh.
- [ ] **Step 5: Commit** `feat(model): card design types, snap and temporary presets`

### Task 2: Store editor (lịch sử + tự lưu)

**Files:**
- Create: `src/editor/store.ts`
- Test: `src/editor/store.test.ts`
- Modify: `package.json` (thêm `zustand`)

**Interfaces:**
- Consumes: Task 1 (`CardDesign`, `Layer`, `SideName`, `loadPresetDesign`, `isCardDesign`).
- Produces: `useEditorStore` (hook Zustand) với state và action:
  ```ts
  type EditorState = {
    design: CardDesign; side: SideName; selectedId: string | null; dirty: boolean
    past: CardDesign[]; future: CardDesign[]
    setSide(side: SideName): void
    select(id: string | null): void
    loadPreset(id: string): void                    // đẩy lịch sử, dirty=false
    addLayer(layer: Layer): void                    // vào mặt hiện tại, chọn luôn
    updateLayer(id: string, patch: Partial<Layer> & { props?: Partial<Layer['props']> }, opts?: { coalesce?: string }): void
    removeLayer(id: string): void
    undo(): void; redo(): void
  }
  export const STORAGE_KEY = 'icm:design:v1'
  export function flushSave(): void                 // ghi ngay (dùng cho pagehide và test)
  ```
  - Mỗi action sửa `design` đẩy bản cũ vào `past` (giới hạn **50**, bỏ bản cũ nhất), xóa `future`, đặt `dirty = true` (trừ `loadPreset`). `updateLayer` có `opts.coalesce` trùng với lần gọi ngay trước → không đẩy lịch sử mới (để gõ chữ liên tục chỉ thành 1 bước). `setSide`/`select` không vào lịch sử.
  - Lưu: chỉ `design` được ghi vào `localStorage[STORAGE_KEY]` dạng `{ version: 1, design }`, debounce **1000 ms** sau thay đổi; `flushSave` ghi ngay; đăng ký `pagehide` gọi `flushSave`.
  - Khởi tạo: đọc `STORAGE_KEY`; JSON lỗi hoặc `!isCardDesign` → `loadPresetDesign('photocard-basic')`, không throw.

- [ ] **Step 1: Write the failing tests** (dùng `vi.useFakeTimers()`, reset store giữa các test bằng một hàm `resetForTest()` export riêng cho test, hoặc `useEditorStore.setState(initial)`)
  ```ts
  it('addLayer then undo/redo restores designs', ...)            // độ dài layers 2→3→2→3
  it('caps history at 50', () => { for (51 lần) addLayer; expect(past.length).toBe(50) })
  it('undo with empty history is a no-op', ...)
  it('coalesced updates make one history step', () => {
    updateLayer(id, { props: { text: 'a' } }, { coalesce: 'text:'+id }); updateLayer(..., 'ab', same)
    expect(past.length).toBe(1); undo(); expect(text).toBe(original)
  })
  it('undo after loadPreset returns previous design', ...)
  it('saves to localStorage 1s after change, not before', () => {
    addLayer(...); vi.advanceTimersByTime(999); expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    vi.advanceTimersByTime(1); expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(1)
  })
  it('falls back to default preset when storage is corrupt or wrong version', async () => {
    localStorage.setItem(STORAGE_KEY, '{oops'); /* re-import module với vi.resetModules() */
    expect(state.design.presetId).toBe('photocard-basic')
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 9, design: {} })); /* re-import */
    expect(state.design.presetId).toBe('photocard-basic')
  })
  it('restores a valid saved design on load', ...)
  it('setSide and select do not create history', ...)
  ```
- [ ] **Step 2:** `npm run test -- src/editor/store.test.ts` → FAIL.
- [ ] **Step 3:** Cài `zustand`; viết store (dùng `create` thuần + tự viết debounce lưu; không cần middleware `persist` nếu tự viết gọn hơn).
- [ ] **Step 4:** Test PASS; `npm run check` xanh.
- [ ] **Step 5: Commit** `feat(editor): editor store with undo history and debounced autosave`

### Task 3: Lưu ảnh (IndexedDB + nén)

**Files:**
- Create: `src/storage/assets.ts`, `src/storage/image.ts`
- Test: `src/storage/assets.test.ts`, `src/storage/image.test.ts`
- Modify: `package.json` (`idb-keyval`; devDep `fake-indexeddb`), `src/test/setup.ts` (import `fake-indexeddb/auto`)

**Interfaces:**
- Produces:
  - `fitWithin(w: number, h: number, maxEdge = 1500): { w: number; h: number }` — giữ tỉ lệ, làm tròn số nguyên, không phóng to ảnh nhỏ hơn.
  - `compressImage(file: Blob, maxEdge = 1500): Promise<Blob>` — `createImageBitmap` → canvas theo `fitWithin` → `toBlob('image/webp', 0.92)` (trình duyệt không hỗ trợ webp thì nhận định dạng nó trả về). Không đọc được → throw `new ImageDecodeError()` (class export).
  - `putImage(blob: Blob): Promise<string>` — lưu vào store IndexedDB `icm-assets` (dùng `createStore('icm-assets','assets')` của idb-keyval), trả `assetId = crypto.randomUUID()`.
  - `getImageUrl(assetId: string): Promise<string | undefined>` — object URL (cache theo id); không có → `undefined`.
  - `pruneAssets(keep: Set<string>): Promise<number>` — xóa asset không nằm trong `keep`, trả số đã xóa.
  - `usedAssetIds(design: CardDesign): Set<string>` (đặt trong `assets.ts`).

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('fitWithin shrinks long edge to 1500 keeping ratio', () => {
    expect(fitWithin(4000, 3000)).toEqual({ w: 1500, h: 1125 })
    expect(fitWithin(3000, 4000)).toEqual({ w: 1125, h: 1500 })
    expect(fitWithin(800, 600)).toEqual({ w: 800, h: 600 })
  })
  it('put/get round trip and missing id returns undefined', async () => {
    const id = await putImage(new Blob(['x'], { type: 'image/webp' }))
    expect(await getImageUrl(id)).toMatch(/^blob:/)          // stub URL.createObjectURL trong jsdom
    expect(await getImageUrl('missing')).toBeUndefined()
  })
  it('pruneAssets removes only unused', async () => { /* 2 put, keep 1 → returns 1, kept one still readable */ })
  it('usedAssetIds collects ids from both sides', ...)
  it('compressImage rejects non-images with ImageDecodeError', async () => {
    await expect(compressImage(new Blob(['hello'], { type: 'text/plain' }))).rejects.toBeInstanceOf(ImageDecodeError)
  })
  ```
  (`createImageBitmap` không có trong jsdom: test cuối stub nó bằng một hàm reject; nén thật được kiểm ở E2E Task 5.)
- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** Cài thư viện, viết code theo Interfaces.
- [ ] **Step 4:** Test PASS; `npm run check` xanh.
- [ ] **Step 5: Commit** `feat(storage): image compression and IndexedDB asset store`

### Task 4: Canvas Konva (vẽ, chọn, kéo, biến đổi, snap, guide)

**Files:**
- Create: `src/editor/canvas/CardCanvas.tsx`, `Guides.tsx`, `TextNode.tsx`, `ImageNode.tsx`, `useStageScale.ts`
- Test: `e2e/editor.spec.ts` (phần canvas), unit cho `useStageScale` nếu tách được hàm thuần `pxPerMm(containerW, containerH)`
- Modify: `package.json` (`konva`, `react-konva`), tạm gắn `CardCanvas` vào `EditorPage` để E2E chạy được (Task 5 làm bố cục thật)

**Interfaces:**
- Consumes: `useEditorStore` (Task 2), `snapBox`/`CARD`/`SAFE_MM` (Task 1), `getImageUrl` (Task 3).
- Produces: `<CardCanvas />` (không props; đọc store). Thuộc tính `data-testid="card-canvas"` trên phần tử bọc ngoài; `data-px-per-mm` trên phần tử đó ghi tỉ lệ đang dùng (để E2E tính tọa độ).
  - `pxPerMm(containerW: number, containerH: number): number` — vừa khít vùng thẻ kèm bleed (61×91 mm) trong container, có lề 16 px.
  - Vẽ: nền màu của mặt hiện tại phủ cả bleed; layer theo thứ tự mảng; `hidden` bỏ qua. Text: `Konva.Text` với `fontSize = pt × 25.4/72` mm đổi px, `wrap` trong `w`. Image: có URL → vẽ kiểu **cover** (căn giữa, cắt phần thừa) trong khung; không có `assetId` hoặc URL `undefined` → ô xám chữ "Thêm ảnh".
  - Guides (không bắt sự kiện): viền thành phẩm bo góc 3 mm, viền bleed đỏ (`#ef4444`), safe zone nét đứt.
  - Click layer → `select(id)`; click nền/ngoài → `select(null)`. `Transformer` gắn vào layer đang chọn, `rotationSnaps: [0, 90, 180, 270]`, không cho layer `locked` kéo.
  - Đang kéo (`dragmove`): áp `snapBox` lên vị trí (đổi px↔mm). Kết thúc kéo/biến đổi (`dragend`, `transformend`) → một lần `updateLayer` với x, y, w, h (= kích thước × scale rồi reset scale về 1), rotation, tính bằng mm làm tròn 0.1.

- [ ] **Step 1: Write the failing E2E tests** (`e2e/editor.spec.ts`; `beforeEach` xóa localStorage + IndexedDB rồi mở `/editor`)
  ```ts
  test('renders the default preset on canvas', async ({ page }) => {
    await expect(page.getByTestId('card-canvas').locator('canvas').first()).toBeVisible()
  })
  test('dragging the name text moves it and snaps to center x', async ({ page }) => {
    // tính điểm giữa layer chữ từ preset (photocard-basic) × data-px-per-mm + offset bleed
    // kéo sang phải 0.8 mm từ vị trí đã căn giữa → sau dragend + 1.1s, localStorage design có layer đó x căn giữa (tâm 27.5 ± 0.1)
  })
  test('dragging far moves the layer and is saved', async ({ page }) => { /* kéo 10 mm, x tăng ~10 ± 0.5 */ })
  test('canvas screenshot of default preset', async ({ page }) => {
    await expect(page.getByTestId('card-canvas')).toHaveScreenshot('photocard-basic.png', { maxDiffPixelRatio: 0.01 })
  })  // chỉ chạy project desktop: test.skip(testInfo.project.name !== 'desktop')
  ```
- [ ] **Step 2:** `npm run test:e2e -- e2e/editor.spec.ts` → FAIL.
- [ ] **Step 3:** Cài `konva`, `react-konva`; viết component. Test unit trong jsdom không import Konva: `src/routes.test.tsx` cần `vi.mock('@/editor/canvas/CardCanvas', () => ({ CardCanvas: () => null }))` (hoặc mock tương đương) để test route editor không kéo Konva vào jsdom.
- [ ] **Step 4:** E2E PASS trên `desktop` và `mobile` (screenshot chỉ desktop; tạo baseline lần đầu bằng `--update-snapshots`, commit ảnh baseline); `npm run check` xanh.
- [ ] **Step 5: Commit** `feat(editor): konva card canvas with transform, snap and print guides`

### Task 5: Trang editor (bố cục, preset, thêm/sửa layer, undo, phím tắt, lỗi route)

**Files:**
- Create: `src/editor/panels/PresetPanel.tsx`, `src/editor/panels/PropertiesPanel.tsx`, `src/editor/EditorToolbar.tsx`, `src/editor/useEditorShortcuts.ts`, `src/components/RouteError.tsx`, `src/components/ui/{tabs,alert-dialog,input,label,sonner}.tsx`
- Modify: `src/pages/EditorPage.tsx`, `src/routes.tsx` (errorElement), `src/main.tsx` (`<Toaster />`), `src/routes.test.tsx`, `e2e/editor.spec.ts`, `docs/backlog.md` (gạch mục `[M1]` đã làm)
- Test: `src/routes.test.tsx`, `e2e/editor.spec.ts`

**Interfaces:**
- Consumes: store (Task 2), `PRESETS` (Task 1), `compressImage`/`putImage`/`pruneAssets`/`usedAssetIds`/`ImageDecodeError` (Task 3), `CardCanvas` (Task 4), `createTextLayer`/`createImageLayer` (Task 1).
- Bố cục `EditorPage` (desktop ≥ 1024 px: 3 cột; hẹp hơn: xếp dọc canvas → toolbar → panel, chưa tối ưu):
  - Trái: `PresetPanel` — danh sách nút theo `PRESETS` (tên preset). Bấm khi `dirty` → `AlertDialog` tiêu đề "Đổi preset?", mô tả "Thiết kế hiện tại sẽ bị thay thế. Bạn vẫn có thể hoàn tác.", nút "Đổi preset" / "Hủy". Không `dirty` → đổi ngay.
  - Giữa: `Tabs` "Mặt trước" / "Mặt sau" (gọi `setSide`), `CardCanvas`, `EditorToolbar`: nút "Thêm chữ", "Thêm ảnh" (input file ẩn `accept="image/*"`), "Hoàn tác", "Làm lại" (disabled khi không còn bước), link "Trang chủ".
  - Phải: `PropertiesPanel` cho layer đang chọn; không chọn → chữ "Chọn một lớp để chỉnh". Text: `Input` "Nội dung" (coalesce `text:<id>`), `Input type=number` "Cỡ chữ (pt)" 6–72, `Input type=color` "Màu", nút căn trái/giữa/phải. Image: nút "Thay ảnh". Mọi loại: nút "Xóa lớp".
- Thêm ảnh: `compressImage` → `putImage` → nếu đang chọn ô ảnh trống thì gán `assetId` vào ô đó, ngược lại `addLayer(createImageLayer({ props: { assetId } }))`. `ImageDecodeError` → toast "Không đọc được ảnh này", không thêm gì. Click vào ô "Thêm ảnh" trên canvas khi đang chọn nó → mở hộp chọn file (gắn ở EditorPage qua một callback, không trong Konva).
- `useEditorShortcuts()` — Ctrl/Cmd+Z → undo, Ctrl/Cmd+Shift+Z và Ctrl+Y → redo, Delete/Backspace → xóa layer đang chọn; **bỏ qua** khi focus ở `input`, `textarea`, `select` hoặc `[contenteditable]`.
- Mount editor: `pruneAssets(usedAssetIds(design))` một lần.
- `RouteError` — dùng làm `errorElement` cho cả 3 route: tiêu đề "Không tải được trang", nút "Tải lại" (`location.reload()`) và link "Về trang chủ".

- [ ] **Step 1: Write the failing tests**
  ```ts
  // routes.test.tsx
  it('shows friendly error when editor chunk fails to load', async () => {
    // mock module EditorPage throw khi import (vi.doMock + vi.resetModules) → renderRoute('/editor')
    expect(await screen.findByRole('heading', { name: 'Không tải được trang' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Tải lại' })).toBeInTheDocument()
  })
  ```
  ```ts
  // e2e/editor.spec.ts
  test('add text, edit content, persists after reload', async ({ page }) => {
    await page.getByRole('button', { name: 'Thêm chữ' }).click()
    await page.getByLabel('Nội dung').fill('Jennie')
    await page.waitForTimeout(1100); await page.reload()
    // localStorage design chứa layer text 'Jennie' ở mặt trước
  })
  test('typing in an input does not delete or undo layers', async ({ page }) => {
    await page.getByRole('button', { name: 'Thêm chữ' }).click()
    const input = page.getByLabel('Nội dung'); await input.fill('AB'); await input.press('Backspace'); await input.press('Control+z')
    await expect(input).toHaveValue(/A/)  // ô vẫn còn, layer vẫn được chọn
    await expect(page.getByRole('button', { name: 'Xóa lớp' })).toBeVisible()
  })
  test('Delete key removes selected layer; Ctrl+Z restores it', ...)   // dùng số layer trong localStorage
  test('upload large photo → compressed ≤1500px and survives reload', async ({ page }) => {
    // tạo ảnh 4000×3000 bằng canvas trong page.evaluate → setInputFiles; sau reload canvas vẫn có ảnh:
    // đọc IndexedDB 'icm-assets' trong page → blob → createImageBitmap → max(w,h) ≤ 1500
  })
  test('non-image file shows error toast and adds nothing', async ({ page }) => {
    await page.locator('input[type=file]').setInputFiles({ name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') })
    await expect(page.getByText('Không đọc được ảnh này')).toBeVisible()
  })
  test('missing image asset renders placeholder without errors', async ({ page }) => {
    // upload ảnh → chờ lưu → xóa DB 'icm-assets' → reload → không có lỗi console, canvas hiển thị
  })
  test('switching preset when dirty asks for confirmation', async ({ page }) => {
    await page.getByRole('button', { name: 'Thêm chữ' }).click()
    await page.getByRole('button', { name: 'Polaroid cơ bản' }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.getByRole('button', { name: 'Hủy' }).click()   // vẫn là photocard-basic
  })
  test('front and back keep separate layers', ...)   // thêm chữ ở Mặt sau → mặt trước không đổi số layer
  test('undo/redo buttons', ...)
  ```
- [ ] **Step 2:** Chạy test → FAIL.
- [ ] **Step 3:** Viết các component shadcn bằng tay theo chuẩn shadcn/ui (new-york, Tailwind v4; Tabs/AlertDialog dùng Radix tương ứng; Sonner dùng gói `sonner`), rồi viết panel, toolbar, phím tắt, `RouteError`, bố cục `EditorPage`. Cập nhật `docs/backlog.md`: đánh dấu mục `[M1]` là đã làm.
- [ ] **Step 4:** `npm run check` xanh (unit + E2E desktop và mobile).
- [ ] **Step 5: Commit** `feat(editor): editor page with presets, layer editing, shortcuts and route error`
