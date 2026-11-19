# Quy trình phát triển Idol Card Maker: Development → Testing → Hoàn thiện

- **Ngày:** 2026-11-19
- **Trạng thái:** Bản nháp, chờ duyệt
- **Sản phẩm:** xem `docs/plans/2026-11-17-idol-card-maker-design.md` (gọi tắt là *tài liệu sản phẩm*)
- **Ngoài phạm vi:** deployment production (sẽ thiết kế sau)

## 1. Mục đích và lý do

AI viết code, tự review và tự chạy test. Nhat (chủ sản phẩm) chỉ **kiểm tra thủ công sản phẩm chạy thật** rồi phản hồi.

**Nỗi lo chính:** *bản cuối AI làm ra không giống điều Nhat mong muốn.* Quy trình được thiết kế xoay quanh việc phát hiện chỗ lệch sớm và rẻ, nhưng không bắt Nhat đọc code hay theo dõi các bước giữa chừng.

## 2. Mục tiêu, không phải mục tiêu, phản mục tiêu

**Mục tiêu**
- Mỗi tính năng lớn (một "mốc") tới tay Nhat dưới dạng **một link chạy được**, kể cả trên điện thoại.
- Những gì tới tay Nhat đều đã qua test và qua review độc lập.
- Phản hồi đã đưa một lần thì không phải nhắc lại ở các mốc sau.

**Không phải mục tiêu**
- Deployment production, tên miền, analytics.
- CI/CD đầy đủ ngoài việc Vercel tự tạo preview.

**Phản mục tiêu** (xảy ra thì coi như quy trình hỏng, dù code vẫn chạy)
- Nhat phải đọc code hoặc tự sửa lỗi kỹ thuật để kiểm tra được.
- Bàn giao một mốc còn test đỏ, hoặc link không mở được.
- Một lỗi Nhat đã phản hồi lại xuất hiện ở mốc sau.
- AI tự ý làm thứ ngoài phạm vi tài liệu sản phẩm mà không ghi rõ.

## 3. Vai trò

| Ai | Làm gì |
|---|---|
| **AI điều phối** (phiên chính) | Viết kế hoạch mốc và tiêu chí nghiệm thu, giao task, tổng hợp, bàn giao, ghi phản hồi |
| **AI thực thi** (agent mới cho mỗi task) | Viết test trước, code cho tới khi test xanh, commit |
| **AI review** (agent mới, chưa thấy code, chạy **theo nhóm task**) | Đối chiếu nhóm task với tài liệu sản phẩm, kế hoạch và quy tắc dự án; báo lỗi để agent thực thi sửa |
| **Nhat** | Đọc lướt tiêu chí nghiệm thu; bấm thử link preview khoảng 10–15 phút mỗi mốc; phản hồi hoặc duyệt |

## 4. Các hướng đã cân nhắc

| Hướng | Được | Mất | |
|---|---|---|---|
| **1. Mỗi task một agent riêng, agent khác review** | Review độc lập, ít lỗi lọt tới Nhat nhất | Chậm hơn, tốn lượt dùng AI hơn | ✅ **Chọn** |
| 2. Một agent làm tuần tự, tự review cuối mốc | Nhanh, rẻ | Tự chấm bài mình, lỗi chồng lên nhau tới cuối mốc | |
| 3. Dùng lại pipeline ở công ty (Antigravity, DeepSeek, stagewise) | Nhat đã quen | Nhat phải tự cầm lái, ngược với phân vai | Loại |

**Lý do chọn 1:** nỗi lo chính là bản cuối lệch mong muốn, và review độc lập ở từng task là cách rẻ nhất để chặn lỗi trước khi tới tay Nhat. Phần tốn thêm là thời gian của AI, không phải của Nhat.

Cách kiểm tra cũng đã chốt: **kiểm tra theo từng mốc** (không phải một lần khi cả MVP xong), và **mở bằng link preview Vercel** (không phải kéo repo về chạy local).

**Điều chỉnh vì lượt dùng AI có giới hạn** (Nhat xác nhận 2026-11-19):
- **Task cỡ vừa**: mỗi task là một phần tính năng trọn vẹn (ví dụ "layer text + panel thuộc tính của text"), không chia vụn. Mỗi mốc khoảng **4–8 task**.
- **Review theo nhóm**: agent review chạy sau mỗi nhóm **2–3 task liên quan** (hoặc sau 1 task nếu task đó lớn hay rủi ro, như flatten hoặc ghi file in), không chạy sau từng task. Mỗi mốc có khoảng 2–3 lượt review, cộng một lượt review tổng trước khi bàn giao.
- Agent review vẫn là agent mới, chưa thấy code. Tính độc lập được giữ, chỉ thưa hơn.

## 5. Danh sách mốc của MVP

Chia theo tài liệu sản phẩm. Mỗi mốc kết thúc bằng một link chạy được.

| Mốc | Nội dung | Nhat kiểm tra gì (gợi ý, tiêu chí chi tiết viết ở đầu mỗi mốc) |
|---|---|---|
| **M0. Nền móng** | Repo GitHub, Vite + React + TS, Tailwind + shadcn/ui (Geist), 2 route `/` và `/editor` (trang trống), công cụ test, Vercel preview | Link mở được trên máy tính và điện thoại; chuyển được giữa 2 trang |
| **M1. Lõi editor** | Data model `CardDesign` (mm), store + tự lưu, canvas Konva, mặt trước/sau, layer `image` và `text`, chọn/kéo/đổi kích thước/xoay, snap, viền bleed và safe zone, undo/redo, 1–2 preset tạm | Tạo được thẻ cơ bản 2 mặt; F5 không mất bài; kéo thả có "đã tay" không |
| **M2. Element P1** | `label`, `stat`, `badge`, `sticker`, `frame`, `shape`, `border`, `overlay`, `drawing` (chữ ký), filter ảnh, crop, panel Lớp, panel Thuộc tính, font Việt/Hàn | Dựng lại được một thẻ kiểu photocard và một thẻ kiểu stat card bằng tay |
| **M3. Preview 3D** | Flatten, `HoloCard`, 5 finish, spot holo, nghiêng theo chuột/ngón tay/con quay, lật mặt, toàn màn hình | Holo có giống thật không; nghiêng trên điện thoại; spot holo đúng vùng |
| **M4. Export** | PNG chia sẻ (+ khung 1080×1350), PNG in 720×1075 @300 DPI có bleed, file mask, crop marks, cảnh báo trước khi in, xuất/nhập `.idolcard.json` | Mở file xuất ra kiểm tra; (tùy chọn) đem in thử 1 thẻ |
| **M5. Trang giới thiệu và hoàn thiện** | Trang `/` có HoloCard mẫu, bộ preset chính thức, mobile dạng tab, làm đẹp theo Geist | Ấn tượng đầu tiên; dùng thử trọn vòng từ đầu tới cuối trên điện thoại |

**Preset:** Nhat đang khảo sát thị trường. M1–M4 dùng preset tạm; bộ preset chính thức vào ở M5 dựa trên kết quả khảo sát. Nếu tới M5 vẫn chưa có kết quả, AI đề xuất bộ preset theo tài liệu sản phẩm (photocard tối giản, stat card, ID card, polaroid, ticket) để Nhat duyệt.

**Sticker, khung, texture, font của thẻ (M2):** AI lấy từ nguồn license mở (CC0 cho hình, OFL cho font) hoặc tự vẽ SVG đơn giản, và ghi nguồn vào `public/CREDITS.md`. Nhat thay sau được, giống preset. *(AI tự quyết.)*

**Thứ tự** M0 → M5 là cố định, vì mốc sau dựa trên mốc trước. P2/P3 trong tài liệu sản phẩm không nằm trong MVP.

## 6. Vòng làm việc của mỗi mốc

```
1. Lập kế hoạch    AI đọc tài liệu sản phẩm + docs/feedback.md
                   → kế hoạch mốc (task nhỏ) + tiêu chí nghiệm thu 5–10 dòng
                   → gửi Nhat đọc lướt (không chờ duyệt; Nhat có thể chặn nếu thấy lệch)
2. Thực thi        Mỗi task: agent mới · viết test trước · code · test xanh · commit
3. Review          Sau mỗi nhóm 2–3 task: agent review mới · đúng tài liệu? đúng quy tắc?
                   test có ý nghĩa? → còn lỗi thì quay lại bước 2 cho các task đó
4. Kiểm tra mốc    Chạy toàn bộ test + E2E · build thành công · mở PR · chờ link Vercel preview
                   · AI tự mở link xác nhận trang chạy
5. Bàn giao        Tin nhắn bàn giao (mẫu ở mục 9)
6. Nhat kiểm tra   ~10–15 phút → phản hồi hoặc "duyệt"
7. Sửa             AI ghi phản hồi vào docs/feedback.md → sửa (vẫn qua bước 2–4) → bàn giao lại
8. Đóng mốc        Nhat "duyệt" → merge PR vào main → sang mốc tiếp theo
```

**Khi nào AI dừng để hỏi Nhat giữa mốc:** chỉ khi gặp quyết định làm thay đổi thứ Nhat sẽ nhìn thấy mà tài liệu sản phẩm và `feedback.md` không trả lời được. Các chi tiết kỹ thuật AI tự quyết và ghi vào phần "AI tự quyết" khi bàn giao.

## 7. Các lớp kiểm thử

| Lớp | Công cụ | Kiểm cái gì | Ai |
|---|---|---|---|
| Unit | Vitest | Data model, đổi mm sang px, logic store (thêm/xóa/sắp layer, undo), tính DPI, ghi chunk `pHYs`, kích thước file xuất, xuất/nhập JSON, tạo mask | AI, viết trước khi code |
| Component | Vitest + React Testing Library | Panel thuộc tính, panel Lớp, hộp thoại xuất file | AI |
| E2E smoke | Playwright (Chromium) | Mỗi mốc thêm 1–3 luồng chính, ví dụ: mở editor → thêm chữ → reload còn chữ; xuất PNG in → file đúng 720×1075 | AI |
| Ảnh chụp màn hình | Playwright screenshot | Canvas Konva vẽ đúng thẻ mẫu (chống vỡ hình khi sửa code). Không dùng cho hiệu ứng holo vì nó thay đổi theo góc nghiêng | AI |
| Cảm nhận | Mắt và tay của Nhat | Đẹp không, holo có giống thật không, dùng có thuận tay không, chạy được trên điện thoại không | **Nhat** |

**Quy tắc:** không có test thì không có code. Holo/CSS, những phần không unit test được, phải có ít nhất một E2E kiểm tra component render và phản ứng với con trỏ; phần đẹp hay xấu do Nhat đánh giá.

## 8. Git, GitHub và preview

- `main` luôn ở trạng thái đã được Nhat duyệt.
- Mỗi mốc một nhánh `m<N>-<ten>` (ví dụ `m3-holo-preview`), commit theo từng task.
- Mỗi mốc một **pull request**; Vercel tự tạo link preview cho PR.
- Nhat phản hồi trong chat (hoặc comment trên PR nếu tiện).
- Nhat nói "duyệt" → AI merge PR.

**Cần Nhat làm một lần trước hoặc trong M0:**
1. Tạo repo GitHub trống trên **tài khoản cá nhân** (gói Vercel Hobby không hỗ trợ repo của organization) và cấp quyền cho AI đẩy code.
2. Kết nối repo với Vercel (gói Hobby miễn phí, khoảng 5 phút) để mỗi PR tự có link preview.
3. **Tắt lớp bảo vệ preview** (Vercel Authentication / Deployment Protection) nếu nó đang bật, để link mở được mà không cần đăng nhập, cho cả AI kiểm tra và điện thoại của Nhat. Link có chuỗi ngẫu nhiên khó đoán. *(AI tự quyết, Nhat có thể đổi.)*

## 9. Bàn giao và phản hồi

**Mẫu tin nhắn bàn giao mốc:**
```
Mốc M3: Preview 3D, sẵn sàng kiểm tra
Link: <vercel preview url>   (mở cả trên điện thoại)
Tiêu chí nghiệm thu:  ☐ … ☐ …   (5–10 dòng)
AI tự quyết (nên nhìn kỹ): …
Đã biết còn thiếu / để mốc sau: …
Test: 84 unit · 6 E2E · tất cả xanh
```

**`docs/feedback.md`:** sổ ghi phản hồi đã thành quy tắc, AI đọc ở đầu mỗi mốc.
```
- [M3] Holo cầu vồng phải nhạt hơn, không che mặt idol
- [M1] Nút Xuất file đặt góc trên bên phải
```

**Thứ tự ưu tiên khi có mâu thuẫn** (Nhat xác nhận 2026-11-19):
1. **Phản hồi của Nhat về giao diện hoặc hành vi** thắng tài liệu sản phẩm. AI ghi vào `feedback.md` **và cập nhật tài liệu sản phẩm** cho khớp, để agent review đối chiếu với bản mới nhất.
2. **Yêu cầu tính năng mới** (ngoài phạm vi mốc, ví dụ một mục P2) được ghi vào **`docs/backlog.md`** và **không chặn việc duyệt mốc hiện tại**. Chỉ làm trong mốc nếu Nhat nói rõ "làm luôn trong mốc này".
3. Phản hồi mới hơn thắng phản hồi cũ.

**`CLAUDE.md`** ở gốc repo: quy tắc ngắn cho mọi agent. Gồm: luôn đọc tài liệu sản phẩm và `feedback.md`; dùng component shadcn/ui có sẵn trước khi tự viết; tọa độ tính bằng mm; không copy CSS của poke-holo; phạm vi chỉ gồm P1. Mục đích là chặn chuyện agent bỏ qua quy tắc hoặc sinh UI không dùng component có sẵn (Nhat đã gặp ở công ty).

## 10. "Xong" nghĩa là gì

| Mức | Điều kiện |
|---|---|
| **Task xong** | Có test, test xanh, đã commit, và nhóm task chứa nó đã qua review không còn lỗi |
| **Mốc xong** | Mọi task xong + toàn bộ test và E2E xanh + build thành công + link preview chạy + **Nhat duyệt** + đã merge |
| **MVP hoàn thiện** | M0–M5 xong + **vòng hoàn thiện** bên dưới |

**Vòng hoàn thiện (sau M5):**
1. Nhat dùng thử trọn vòng: tạo thẻ → preview → xuất → (tùy chọn) đem in một thẻ thật.
2. Kiểm tra trên trình duyệt: Chrome desktop, Safari iOS, Chrome Android.
3. AI chạy Lighthouse cho 2 trang; sửa vấn đề nặng về hiệu năng và trợ năng.
4. Gom phản hồi còn lại thành một đợt sửa cuối → Nhat duyệt → sẵn sàng cho bước deployment (thiết kế riêng sau).

## 11. Để lại cho người thực thi

- Chia task cụ thể trong từng mốc, cấu trúc thư mục test, cấu hình chi tiết của Vitest và Playwright.
- Nội dung chi tiết của tiêu chí nghiệm thu từng mốc (viết ở bước 1 của mỗi mốc).
- Đường dẫn chính xác của các file quy trình, miễn là đúng như mục 9.
