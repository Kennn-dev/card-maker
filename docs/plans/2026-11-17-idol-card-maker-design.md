# Idol Card Maker — Design

- **Ngày:** 2026-11-17
- **Trạng thái:** Đã duyệt
- **Tác giả:** Nhat Hoang (cùng Claude, qua brainstorming)

## 0. Tóm tắt

Website giúp fan tự thiết kế **thẻ idol (photocard / stat card)**: bắt đầu từ preset, tùy chỉnh **2 mặt**, xem **preview 3D có hiệu ứng như thẻ thật** (nghiêng, glare, holo, lật mặt), rồi xuất **PNG để chia sẻ** và **file in 300 DPI có bleed** để làm merch.

**Điểm khác biệt:** chuyên cho photocard idol, preview finish 3D sát với bản in thật, miễn phí, không cần tài khoản.

### Quyết định đã chốt

| # | Câu hỏi | Quyết định |
|---|---|---|
| 1 | Đầu ra chính | Chia sẻ online là chính, kèm nút xuất file in |
| 2 | Mức customize | Lai: preset có slot, kéo thả được, thêm được layer; chỉnh **2 mặt** |
| 3 | Cách chia sẻ | Tải file về rồi tự đăng (không có link chia sẻ, không backend) |
| 4 | File xuất ở MVP | PNG 2 mặt + file in 300 DPI có bleed; 3D chỉ để xem trên web (không GIF/video) |
| 5 | Cách vẽ thẻ | **Canvas (Konva) để edit/xuất + CSS 3D để preview** |
| 6 | Tài khoản | Không có. Nháp lưu trên trình duyệt, kèm xuất/nhập .json |
| 7 | Giao diện | Tối giản theo phong cách Geist + shadcn/ui (mục 6) |
| 8 | Thiết bị | Ưu tiên desktop; mobile dùng được ở mức cơ bản |

### Ngoài phạm vi MVP (YAGNI)

Tài khoản, backend, link chia sẻ, GIF/video, trang admin tạo preset, chọn nhiều layer, nhóm layer, upload font riêng, giao diện cầu kỳ.

---

## 1. Kiến trúc và tech stack

**Nguyên tắc:** có một nguồn dữ liệu duy nhất là `CardDesign` (JSON). Cùng một renderer Konva vẽ cho editor, cho ảnh phẳng dùng ở preview và cho file xuất, nên những gì user thấy luôn khớp với file in.

```
  Preset JSON ─▶ CardDesign (state) ◀── user chỉnh
                        │
              Konva renderer (dùng chung)
        ┌───────────────┼──────────────────┐
        ▼               ▼                  ▼
  Editor canvas   Flatten (debounce)     Export
                  → art.png + mask.png   → PNG share / file in / mask
                        ▼
                HoloCard (CSS 3D)
```

| Phần | Chọn |
|---|---|
| Khung | Vite + React + TypeScript |
| Canvas | `react-konva` |
| State | Zustand (+ `persist`) |
| Lưu ảnh | IndexedDB qua `idb-keyval` |
| Preview 3D | `HoloCard` tự viết (CSS custom properties) |
| Routing | `react-router-dom` |
| UI app | **shadcn/ui** + Tailwind CSS, theo phong cách **Geist** (xem mục 6) |
| PDF (P2) | `jsPDF` |
| Deploy | Site tĩnh: Vercel / Netlify / GitHub Pages |

### Routing

| Route | Trang |
|---|---|
| `/` | Giới thiệu: mô tả, nút "Bắt đầu thiết kế", **thẻ mẫu HoloCard tương tác được** |
| `/editor` | Editor chính, tải lazy bằng `React.lazy` (Konva nặng) |

### Cấu trúc thư mục

```
src/
  presets/   model/   editor/   preview/   export/   storage/   pages/
public/
  fonts/  stickers/  frames/  textures/
```

---

## 2. Data model

**Mọi tọa độ và kích thước tính bằng mm**, chỉ quy đổi sang px khi vẽ.

```ts
type Finish = 'matte' | 'glossy' | 'holo' | 'glitter' | 'gold-foil'

type CardDesign = {
  version: 1
  presetId: string
  size: { w: 55; h: 85; bleed: 3; radius: 3 }   // mm
  finish: Finish                                // mặc định 'glossy'
  front: Side
  back: Side
}

type Side = { background: Background; layers: Layer[] }   // thứ tự mảng = thứ tự chồng lớp

type Background = {
  color?: string
  gradient?: Gradient
  pattern?: 'dots' | 'grid' | 'gingham' | 'sparkle' | 'y2k'   // P2
  imageAssetId?: string
}

type LayerType =
  | 'image' | 'text' | 'label' | 'stat' | 'badge' | 'sticker' | 'frame'
  | 'shape' | 'border' | 'overlay' | 'drawing'      // P1
  | 'chart' | 'infoTable' | 'serial'                // P2
  | 'qr' | 'barcode'                                // P3

type Layer = {
  id: string
  type: LayerType
  x: number; y: number; w: number; h: number; rotation: number
  locked?: boolean      // khóa vị trí, vẫn sửa được nội dung
  hidden?: boolean
  spotHolo?: boolean    // chỉ phủ finish lên layer này
  props: LayerProps
}
```

### Props chính theo loại layer

| Loại | Props |
|---|---|
| `image` | `assetId`, `crop {x,y,scale}`, `mask: rect\|rounded\|circle`, `filters {preset?: bw\|warm\|cool\|film, brightness?, contrast?, blur?}` |
| `text` | `text`, `font`, `size`, `color`, `align`, `stroke?` |
| `label` | text props + `bg`, `padding`, `radius` (kiểu chip/pill) |
| `stat` | `label`, `value`, `style: number\|bar\|stars`, `max?` |
| `badge` | `kind: rarity\|icon`, `text?` (SSR/UR/SR, ★★★) |
| `sticker` / `frame` | `src`, `tint?` |
| `shape` | `kind: rect\|rounded\|circle\|star\|heart\|polygon\|line`, `fill\|gradient`, `stroke`, `opacity` |
| `border` | `style: solid\|double\|dashed\|gradient`, `width`, `color`, `inset`, `radius` |
| `overlay` | `gradient` / `color`, `opacity` (làm tối dần, vignette) |
| `drawing` | `points[]`, `color`, `width` (chữ ký tay) |
| `chart` (P2) | radar: `axes[] {label, value}`, `max`, `color` |
| `infoTable` (P2) | `rows[] {key, value}` |
| `serial` (P2) | `format` ("No. {n}/{total}") |

### Preset

```ts
type Preset = {
  id: string; name: string
  category: 'photocard' | 'stat-card' | 'id-card' | 'polaroid' | 'ticket'
  thumbnail: string
  design: CardDesign
}
```

Preset là file JSON nằm sẵn trong code. Khi chọn preset, app sao chép `design` vào state.

| Preset | Element chính |
|---|---|
| Photocard tối giản | ảnh, tên, chữ ký |
| Stat / Game card | ảnh, tên, stat, rarity, radar (P2) |
| ID card | ảnh, info table, barcode, serial |
| Polaroid / Film | khung polaroid, caption |
| Ticket stub | vé răng cưa, ngày, serial |

### Font

Một bộ nhỏ, tự host, hỗ trợ **tiếng Việt và tiếng Hàn** (ví dụ Be Vietnam Pro, Noto Sans KR và vài font trang trí).

---

## 3. Editor (`/editor`)

### Bố cục desktop

- **Trái:** tab *Preset* (lưới thumbnail) / tab *Lớp* (danh sách layer, kéo để đổi thứ tự, ẩn, khóa)
- **Giữa:** tab Mặt trước / Mặt sau, canvas có **viền bleed (đỏ)** và **safe zone (nét đứt)** (chỉ hiện trong editor), toolbar "+ Thêm" (Ảnh · Chữ · Hình · Viền · Sticker · Huy hiệu · Chữ ký · Chỉ số), undo/redo, nút Xuất file
- **Phải:** mini preview 3D (tự cập nhật), chọn finish, panel thuộc tính của layer đang chọn

### Thao tác

- Chọn, kéo, đổi kích thước, xoay bằng Konva Transformer. Layer `locked` không di chuyển được.
- Snap vào tâm thẻ và mép safe zone.
- Ảnh: upload hoặc kéo thả, tự nén cạnh dài về khoảng 1500 px, lưu vào IndexedDB. **Double-click để crop** (kéo và zoom bên trong mask).
- Chữ và chỉ số được sửa trong panel thuộc tính.
- Mọi layer có: công tắc spot holo, nhân bản, xóa, đưa lên/xuống lớp.
- Undo/redo bằng ảnh chụp state (khoảng 50 bước), phím Ctrl+Z / Ctrl+Shift+Z.
- Tự lưu 1 giây sau mỗi thay đổi; đổi preset thì hỏi xác nhận.
- Mobile: 3 cột chuyển thành tab (Canvas / Lớp / Thuộc tính).

### Độ ưu tiên element

| P1 (MVP) | P2 | P3 |
|---|---|---|
| image (+ filter), text, label, stat (number/bar/stars), badge rarity, sticker pack (20–30 SVG), frame, shape, border, overlay, drawing (chữ ký) | pattern nền, radar chart, member color chip, serial, info table | QR, barcode |

---

## 4. Preview 3D và finish

### Flatten

Mỗi mặt được vẽ trên Konva stage ẩn (rộng khoảng 600 px), **cắt đúng kích thước thành phẩm, bo góc, bỏ guide**. Kết quả là `art.png`, cộng `mask.png` nếu có layer `spotHolo`. Debounce 300 ms, cache theo hash của design.

### `HoloCard`

```tsx
<HoloCard front={{ art, mask }} back={{ art, mask }} finish="holo" interactive size="md" />
```

```
.holo-card (perspective)
 └ .rotator  rotateX(var(--rx)) rotateY(var(--ry)) · preserve-3d
    ├ .face.front  img + .shine + .glare
    └ .face.back   rotateY(180deg)
```

Biến CSS: `--pointer-x/y`, `--pointer-from-center`, `--rx/--ry` (±15°), `--bg-x/y`. Cập nhật bằng rAF với nội suy lò xo, không dùng thư viện.

| Finish | CSS | Khi in |
|---|---|---|
| matte | glare rất nhẹ + nhiễu vân giấy | màng mờ |
| glossy (mặc định) | glare mạnh theo con trỏ | màng bóng |
| holo | gradient cầu vồng lặp + `color-dodge`, chạy theo góc nghiêng | iridescent |
| glitter | texture lấp lánh (~20 KB) + `color-dodge` | glitter laminate |
| gold-foil | gradient kim loại + `soft-light` | ép nhũ |

Spot holo: `.shine { mask-image: url(mask.png) }`.

### Tương tác

- Desktop: rê chuột để nghiêng, rời chuột thì về giữa, click để lật.
- Mobile: kéo để nghiêng; nút "Nghiêng theo điện thoại" (trên iOS phải xin quyền qua `DeviceOrientationEvent.requestPermission`).
- Chế độ toàn màn hình để so sánh các finish.
- Chỉ animate khi đang tương tác; tôn trọng `prefers-reduced-motion`.

### Bản quyền

Repo tham khảo (poke-holo, simeydotme) theo hiểu biết là **GPL-3.0**, cần kiểm tra lại. **Chỉ học kỹ thuật, tự viết CSS**, không copy code.

---

## 5. Export và lưu trữ

### Hộp thoại Xuất file

**① Chia sẻ (PNG)**
- Mặt trước / mặt sau / cả 2 mặt cạnh nhau; cắt đúng kích thước thành phẩm, góc bo trong suốt.
- Tùy chọn khung mạng xã hội 1080×1350 kèm credit site (bật/tắt, mặc định bật).
- P2: ảnh có holo "đóng băng" ở một góc nghiêng.

**② File in**
- Mỗi mặt: PNG **61×91 mm (đã gồm bleed 3 mm) @ 300 DPI = 720×1075 px**, góc vuông.
- Ghi chunk `pHYs` để file báo đúng 300 DPI.
- **File mask spot / foil** (đen trắng) để tiệm in làm spot UV hoặc ép nhũ.
- Tùy chọn crop marks.
- P2: tờ A4 xếp 3×3 thẻ có đường cắt, PDF 2 trang (`jsPDF`).
- Ghi chú cho user: file xuất là RGB, màu khi in CMYK có thể lệch.

**③ File dự án**: `*.idolcard.json` gồm design và ảnh base64. Khi import thì kiểm tra `version`.

### Kiểm tra trước khi xuất file in (chỉ cảnh báo, không chặn)

- DPI thực tế của ảnh (số px ảnh / kích thước layer tính bằng mm) dưới 200
- Chữ hoặc chi tiết nằm ngoài safe zone
- Slot ảnh còn trống hoặc vẫn là ảnh mẫu

### Lưu trữ

| Dữ liệu | Nơi lưu |
|---|---|
| `CardDesign` hiện tại | localStorage (Zustand `persist`), tự lưu sau 1 giây |
| Ảnh upload | IndexedDB, key `assetId`; ảnh không còn dùng được dọn khi lưu |
| Preset / sticker / font / texture | `/public` |

MVP chỉ giữ 1 bản nháp; danh sách "Bản nháp gần đây" để P2.

---

## 6. UI style (chốt 2026-11-18)

**Phong cách:** giống website Vercel, tức design system **Geist**: tối giản, nhiều khoảng trắng, đen trắng trung tính, viền mảnh 1px, bo góc nhỏ, gần như không đổ bóng, có dark mode.

| Hạng mục | Chọn |
|---|---|
| Component | **shadcn/ui** (copy vào `src/components/ui`, chỉnh trực tiếp) |
| Styling | Tailwind CSS (shadcn/ui cần) |
| Font giao diện | Geist Sans / Geist Mono, tự host |
| Icon | `lucide-react` (đi kèm shadcn/ui) |
| Theme | Màu nền xám trung tính, light và dark mode qua CSS variables của shadcn |

**Ánh xạ component sang tính năng:**

| Tính năng | Component shadcn/ui |
|---|---|
| Tab Preset/Lớp, Mặt trước/Mặt sau, tab Xuất file | `Tabs` |
| Menu "+ Thêm" | `DropdownMenu` |
| Panel thuộc tính | `Input`, `Slider`, `Select`, `Switch` (spot holo), `Popover` (chọn màu) |
| Chọn finish | `ToggleGroup` |
| Hộp thoại Xuất file, xác nhận đổi preset | `Dialog`, `AlertDialog` |
| Cảnh báo trước khi in | `Alert` |
| Thông báo lưu/xuất xong | `Sonner` (toast) |
| Gợi ý nút | `Tooltip` |
| Mobile: panel Lớp/Thuộc tính | `Sheet` / `Drawer` |

**Nguyên tắc:** giao diện app trung tính để **thẻ là thứ duy nhất có màu sắc nổi bật** trên màn hình.

**Lưu ý:** font giao diện (Geist) tách riêng với font dùng trên thẻ (mục 2). Cần kiểm tra Geist hiển thị tiếng Việt có dấu đủ tốt không; nếu không thì dùng Be Vietnam Pro làm font giao diện.

---

## 7. Việc còn mở

- Khảo sát thêm thị trường (Nhat) để chốt bộ preset và các phần customize đầu tiên.
- Kiểm tra lại license của poke-holo.
- Chọn danh sách font và sticker cụ thể.

## Tham khảo

- https://poke-holo.simey.me/: preview holo bằng CSS
- Kích thước photocard: 55×85 mm (phổ biến), 54×86 mm (một số bên)
- Finish phổ biến ở các shop in: matte, iridescent, glitter, spot holo, emboss
