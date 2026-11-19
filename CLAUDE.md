# Quy tắc cho mọi agent (Idol Card Maker)

## Đọc trước khi làm
Luôn đọc: tài liệu sản phẩm `docs/plans/2026-11-17-idol-card-maker-design.md`, spec quy trình `docs/superpowers/specs/2026-11-19-dev-workflow-design.md`, và `docs/feedback.md`.

## Thứ tự ưu tiên khi mâu thuẫn
1. Phản hồi của Nhat > tài liệu sản phẩm (ghi vào `docs/feedback.md` và cập nhật tài liệu sản phẩm cho khớp).
2. Phản hồi mới thắng phản hồi cũ.
3. Tính năng mới ngoài phạm vi mốc: ghi vào `docs/backlog.md`, không làm trừ khi Nhat bảo "làm luôn trong mốc này".

## Quy tắc code
- Dùng component shadcn/ui có sẵn trước khi tự viết.
- Tọa độ thẻ tính bằng mm.
- Không copy CSS của poke-holo.
- MVP chỉ gồm P1.

## Kiểm tra
- Mọi thay đổi phải qua `npm run check` xanh (typecheck, unit test, build, E2E) trước khi commit.
- E2E (Playwright) dùng Google Chrome cài sẵn trên máy (`channel: 'chrome'`), không tải trình duyệt riêng.
- Yêu cầu Node `^22.22.2 || >=24.15.0` (khai báo trong `engines` của package.json).
