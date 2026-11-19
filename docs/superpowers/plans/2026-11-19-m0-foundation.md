# M0 — Nền móng: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng khung app Idol Card Maker chạy được (2 trang `/` và `/editor`, UI shadcn/ui + Geist), có đủ công cụ test, và một link Vercel preview mở được trên máy tính và điện thoại.

**Architecture:** SPA dùng Vite + React + TypeScript. Router khai báo một mảng `routes` dùng chung cho app thật (`createBrowserRouter`) và cho test (`createMemoryRouter`). Trang editor được tải lazy. Mỗi trang M0 chỉ là placeholder; nội dung thật làm ở M1–M5.

**Tech Stack:** Vite, React, TypeScript (strict), Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui, react-router-dom, Vitest + React Testing Library (jsdom), Playwright, Vercel.

**Spec:**
- `docs/superpowers/specs/2026-11-19-dev-workflow-design.md` (quy trình, mốc M0)
- `docs/plans/2026-11-17-idol-card-maker-design.md` (sản phẩm; mục 1 Routing, mục 6 UI style)

**Nhóm review** (spec quy trình, mục 4): **Nhóm A** = Task 1–2 (khung + UI); **Nhóm B** = Task 3–4 (routing + E2E); sau đó một lượt review tổng cả nhánh trước Task 5.

## Global Constraints

- Phiên bản: dùng bản ổn định mới nhất của mỗi thư viện tại thời điểm cài; không dùng bản beta/canary.
- TypeScript `strict: true`; alias `@/` → `src/`.
- Route: `/` (Giới thiệu), `/editor` (Editor, **tải lazy bằng `React.lazy`**).
- UI: chỉ dùng component shadcn/ui (copy vào `src/components/ui`); icon `lucide-react`; font giao diện Geist Sans/Geist Mono **tự host**.
- Nếu Geist hiển thị tiếng Việt có dấu không tốt thì dùng Be Vietnam Pro làm font giao diện (spec sản phẩm mục 6).
- Copy cố định: nút trên trang giới thiệu là **"Bắt đầu thiết kế"**.
- Asset bên thứ ba ghi nguồn vào `public/CREDITS.md` (font: license OFL).
- Không copy CSS của poke-holo.
- Nhánh làm việc: `m0-foundation`; nhánh chính: `main`; mỗi task commit riêng; cuối mốc mở 1 PR.
- Không làm gì ngoài M0 (không có canvas, Konva, Zustand…).

## Review Focus

1. **Mở thẳng hoặc F5 tại `/editor` trên Vercel** phải hiện editor, không trả về 404 → cần `vercel.json` rewrite (Task 4) và kiểm tra trên link thật (Task 5).
2. **URL không tồn tại** (ví dụ `/abc`) phải hiện trang "Không tìm thấy trang" có link về trang chủ, không được trắng trang (Task 3).
3. **Điện thoại màn hẹp (~390 px):** trang giới thiệu không có thanh cuộn ngang và nút CTA nhìn thấy được (Task 4, E2E mobile).
4. **Mạng chậm khi vào editor:** trong lúc chunk editor đang tải phải hiện "Đang tải editor…", không trắng trang (Task 3).
5. **Nút Back của trình duyệt** từ `/editor` phải quay về `/` (Task 4).

## Tiêu chí nghiệm thu M0 (Nhat kiểm tra)

- [ ] Link preview mở được trên máy tính **và** điện thoại, không bị bắt đăng nhập.
- [ ] Trang `/` có tên site, mô tả ngắn, nút "Bắt đầu thiết kế".
- [ ] Bấm nút → sang `/editor`; nút Back của trình duyệt quay lại được.
- [ ] Gõ thẳng `/editor` vào thanh địa chỉ hoặc F5 tại đó vẫn mở được.
- [ ] Chữ tiếng Việt có dấu hiển thị đẹp bằng font giao diện.
- [ ] Phong cách tối giản kiểu Vercel (Geist), chưa cần đẹp.

## File Structure

```
package.json · vite.config.ts · tsconfig*.json · components.json · playwright.config.ts · vercel.json
CLAUDE.md
docs/feedback.md · docs/backlog.md
public/fonts/*.woff2 · public/CREDITS.md
src/
  main.tsx              # createBrowserRouter(routes) + RouterProvider
  routes.tsx            # export const routes: RouteObject[]
  index.css             # tailwind, theme vars shadcn, @font-face Geist
  lib/utils.ts          # cn() (shadcn)
  components/ui/button.tsx
  pages/LandingPage.tsx · EditorPage.tsx · NotFoundPage.tsx
  test/setup.ts         # jest-dom matchers
  test/renderRoute.tsx  # helper render(createMemoryRouter(routes, {initialEntries}))
e2e/navigation.spec.ts
```

---

### Task 1: Khung Vite + React + TS và Vitest

**Files:**
- Create: project từ template `react-ts` của Vite (tại gốc repo, giữ nguyên `docs/`), `src/test/setup.ts`, `src/App.test.tsx` (tạm, xóa ở Task 3)
- Modify: `vite.config.ts`, `tsconfig.app.json`, `package.json`

**Interfaces:**
- Produces: alias `@/`; script `npm run dev`, `npm run build`, `npm run test` (vitest run), `npm run typecheck` (`tsc -b --noEmit` hoặc tương đương), `npm run check` (= typecheck + test + build).

- [ ] **Step 1:** Đổi nhánh mặc định thành `main` nếu chưa phải; tạo nhánh `m0-foundation`.
- [ ] **Step 2:** Scaffold Vite `react-ts` vào thư mục hiện tại; cài Vitest, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`. Cấu hình Vitest trong `vite.config.ts`: `environment: 'jsdom'`, `setupFiles: ['src/test/setup.ts']`, `include: ['src/**/*.test.{ts,tsx}']`. Thêm alias `@/`.
- [ ] **Step 3: Write the failing test** `src/App.test.tsx`
  ```tsx
  it('renders app root', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
  ```
- [ ] **Step 4:** `npm run test` → FAIL (App mặc định của template không có `h1` đúng nghĩa, hoặc setup chưa đủ). Nếu template đã có `h1` và test PASS ngay, đổi test thành `getByRole('heading', { name: 'Idol Card Maker' })` để thấy FAIL.
- [ ] **Step 5:** Sửa `App.tsx` thành `<h1>Idol Card Maker</h1>`; xóa CSS/asset mẫu của template.
- [ ] **Step 6:** `npm run check` → typecheck, test, build đều xanh.
- [ ] **Step 7: Commit** `chore: scaffold vite react-ts with vitest`

### Task 2: Tailwind v4 + shadcn/ui + font Geist

**Files:**
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/button.tsx`, `src/lib/utils.test.ts`, `public/fonts/Geist*.woff2`, `public/CREDITS.md`
- Modify: `src/index.css`, `vite.config.ts`, `src/main.tsx`

**Interfaces:**
- Consumes: alias `@/` (Task 1).
- Produces: `cn(...inputs: ClassValue[]): string` tại `@/lib/utils`; `Button` tại `@/components/ui/button` (variants mặc định của shadcn); class Tailwind `font-sans` = Geist.

- [ ] **Step 1:** Cài Tailwind v4 qua `@tailwindcss/vite`; chạy shadcn init (style mặc định, base color **neutral**, CSS variables bật); thêm component `button`.
- [ ] **Step 2: Write the failing test** `src/lib/utils.test.ts`
  ```ts
  it('cn merges and dedupes tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-sm', false && 'hidden', 'font-medium')).toBe('text-sm font-medium')
  })
  ```
- [ ] **Step 3:** `npm run test` → FAIL nếu `cn` chưa có. Nếu shadcn init đã tạo `cn` thì test PASS ngay; ghi chú điều đó trong commit, không cần ép FAIL.
- [ ] **Step 4:** Tự host Geist Sans + Geist Mono (woff2, file variable nếu có) từ bản phát hành chính thức của Vercel (license OFL) vào `public/fonts/`; khai báo `@font-face` (`font-display: swap`) trong `index.css`; đặt `--font-sans: 'Geist', 'Be Vietnam Pro', system-ui, sans-serif` và `--font-mono` tương ứng trong theme Tailwind. Ghi nguồn + license vào `public/CREDITS.md`.
- [ ] **Step 5:** Mở `npm run dev`, render tạm chuỗi "Bắt đầu thiết kế — Ảnh, chữ, hiệu ứng holo" bằng `Button` rồi chụp màn hình để tự kiểm tra dấu tiếng Việt. Nếu dấu hiển thị lỗi hoặc rơi về font khác, đổi font giao diện chính sang Be Vietnam Pro (tự host, OFL), ghi lý do vào commit và vào phần "AI tự quyết" khi bàn giao.
- [ ] **Step 6:** `npm run check` → xanh.
- [ ] **Step 7: Commit** `feat: add tailwind, shadcn/ui and self-hosted Geist font`

### Task 3: Routing 2 trang + trang 404 + lazy editor

**Files:**
- Create: `src/routes.tsx`, `src/pages/LandingPage.tsx`, `src/pages/EditorPage.tsx`, `src/pages/NotFoundPage.tsx`, `src/test/renderRoute.tsx`, `src/routes.test.tsx`
- Modify: `src/main.tsx`
- Delete: `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `Button` (Task 2).
- Produces:
  - `export const routes: RouteObject[]` (`src/routes.tsx`): `/` → `LandingPage`; `/editor` → `lazy(() => import('./pages/EditorPage'))` bọc `Suspense` với fallback "Đang tải editor…"; `*` → `NotFoundPage`.
  - `renderRoute(path: string)` (`src/test/renderRoute.tsx`): render `RouterProvider` với `createMemoryRouter(routes, { initialEntries: [path] })`, trả kết quả của `render` + `user` (userEvent).
  - Copy: Landing `h1` "Idol Card Maker", một đoạn mô tả, `Button asChild` + `Link` "Bắt đầu thiết kế" → `/editor`. Editor `h1` "Editor" + link "Trang chủ" → `/`. NotFound `h1` "Không tìm thấy trang" + link "Về trang chủ" → `/`.

- [ ] **Step 1: Write the failing tests** `src/routes.test.tsx`
  ```tsx
  it('landing shows title and CTA', () => {
    renderRoute('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Idol Card Maker' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Bắt đầu thiết kế' })).toHaveAttribute('href', '/editor')
  })
  it('CTA navigates to lazy editor, showing loading fallback first', async () => {
    const { user } = renderRoute('/')
    await user.click(screen.getByRole('link', { name: 'Bắt đầu thiết kế' }))
    expect(screen.getByText('Đang tải editor…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Editor' })).toBeVisible()
  })
  it('unknown path shows not-found page with home link', () => {
    renderRoute('/abc')
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/')
  })
  ```
- [ ] **Step 2:** `npm run test` → FAIL (`routes` chưa có).
- [ ] **Step 3:** Viết `routes.tsx`, 3 page, `renderRoute`; `main.tsx` dùng `createBrowserRouter(routes)`. Layout tối giản: nội dung căn giữa, `max-w` hợp lý, padding ngang để màn 390 px không tràn. Xóa `App.tsx` và test tạm của nó.
- [ ] **Step 4:** `npm run test` → PASS. Nếu fallback biến mất quá nhanh khiến test 2 không ổn định, cho test chờ fallback bằng `findByText` trước khi chờ heading; không thêm delay giả vào code.
- [ ] **Step 5:** `npm run check` → xanh; output build có chunk riêng cho `EditorPage` (xác nhận lazy load có tác dụng).
- [ ] **Step 6: Commit** `feat: add landing, lazy editor and not-found routes`

### Task 4: Playwright E2E, rewrite cho Vercel, file quy trình

**Files:**
- Create: `playwright.config.ts`, `e2e/navigation.spec.ts`, `vercel.json`, `CLAUDE.md`, `docs/feedback.md`, `docs/backlog.md`
- Modify: `package.json` (script `test:e2e`; `check` thêm e2e), `vite.config.ts` (Vitest exclude `e2e/`)

**Interfaces:**
- Consumes: copy và route của Task 3.
- Produces: `npm run test:e2e`; 2 project Playwright: `desktop` (Desktop Chrome) và `mobile` (`devices['Pixel 7']`, Chromium); `webServer` = `npm run build && npm run preview` trên một port cố định, `baseURL` trỏ tới port đó.

- [ ] **Step 1: Write the failing tests** `e2e/navigation.spec.ts` (chạy trên cả 2 project)
  ```ts
  test('CTA → editor → back to landing', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Bắt đầu thiết kế' }).click()
    await expect(page).toHaveURL(/\/editor$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Editor' })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1, name: 'Idol Card Maker' })).toBeVisible()
  })
  test('direct load of /editor works', async ({ page }) => {
    await page.goto('/editor')
    await expect(page.getByRole('heading', { level: 1, name: 'Editor' })).toBeVisible()
  })
  test('landing has no horizontal scroll and CTA is in viewport', async ({ page }) => {
    await page.goto('/')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
    await expect(page.getByRole('link', { name: 'Bắt đầu thiết kế' })).toBeInViewport()
  })
  ```
- [ ] **Step 2:** Cài `@playwright/test` và Chromium; `npm run test:e2e` → FAIL cho tới khi config và `webServer` đúng.
- [ ] **Step 3:** Viết `playwright.config.ts` theo Interfaces. Nếu có test fail thật (không phải do config), sửa code của Task 3 (ví dụ layout gây tràn ngang).
- [ ] **Step 4:** `npm run test:e2e` → PASS trên cả `desktop` và `mobile`.
- [ ] **Step 5:** `vercel.json`: rewrite mọi path về `/index.html` (`{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`). Vercel vẫn phục vụ file tĩnh có thật trước khi áp rewrite.
- [ ] **Step 6:** `CLAUDE.md` (ngắn, tiếng Việt), theo spec quy trình mục 9:
  - Luôn đọc tài liệu sản phẩm, spec quy trình và `docs/feedback.md` trước khi làm.
  - Thứ tự ưu tiên khi mâu thuẫn: phản hồi của Nhat > tài liệu sản phẩm; phản hồi mới thắng phản hồi cũ; tính năng mới ghi vào `docs/backlog.md`, không làm trừ khi Nhat bảo "làm luôn trong mốc này".
  - Dùng component shadcn/ui có sẵn trước khi tự viết; tọa độ thẻ tính bằng mm; không copy CSS của poke-holo; MVP chỉ gồm P1.
  - Mọi thay đổi phải qua `npm run check` xanh trước khi commit.

  `docs/feedback.md` và `docs/backlog.md`: chỉ có tiêu đề và một dòng mô tả định dạng (theo mục 9 của spec quy trình).
- [ ] **Step 7:** `npm run check` (giờ đã gồm E2E) → xanh.
- [ ] **Step 8: Commit** `test: add playwright e2e; chore: vercel rewrites and workflow files`

### Task 5: GitHub, Vercel preview và bàn giao (cần Nhat)

Task này không có code mới; đầu ra là link preview đã được kiểm tra.

**Interfaces:**
- Consumes: nhánh `m0-foundation` đã có `npm run check` xanh.
- Produces: repo GitHub cá nhân của Nhat (nhánh `main` chứa docs, nhánh `m0-foundation`), 1 PR, 1 link Vercel preview công khai.

- [ ] **Step 1:** Xin Nhat **tên repo GitHub** (tài khoản cá nhân) và quyền đẩy code; thêm remote, đẩy `main` rồi đẩy `m0-foundation`.
- [ ] **Step 2:** Hướng dẫn Nhat (khoảng 5 phút): Vercel → Import repo (framework Vite, giữ mặc định) → Settings → Deployment Protection → **tắt Vercel Authentication** cho preview.
- [ ] **Step 3:** Mở PR `m0-foundation` → `main` với mô tả theo mẫu bàn giao (spec quy trình mục 9) và tiêu chí nghiệm thu M0 ở đầu plan này.
- [ ] **Step 4: Verify link preview**
  - `curl -s -o /dev/null -w "%{http_code}" <preview>/` → `200`
  - `curl -s -o /dev/null -w "%{http_code}" <preview>/editor` → `200` (nếu ra `401` thì Deployment Protection vẫn đang bật; nếu ra `404` thì rewrite chưa có tác dụng)
  - Mở link bằng trình duyệt: thấy `h1` "Idol Card Maker"; bấm CTA thì sang Editor.
- [ ] **Step 5:** Gửi Nhat tin nhắn bàn giao: link, tiêu chí nghiệm thu, phần "AI tự quyết" (font Geist hay Be Vietnam Pro, base color neutral…), kết quả test.
- [ ] **Step 6:** Nhat "duyệt" thì merge PR vào `main`. Nếu Nhat phản hồi, ghi vào `docs/feedback.md`, sửa (qua lại Task 1–4 tương ứng), rồi bàn giao lại.
