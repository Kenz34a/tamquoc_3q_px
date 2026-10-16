# Tam Quốc Truyền Kỳ

Game web thẻ tướng Tam Quốc bằng tiếng Việt, với hình ảnh gốc, trang admin, tài khoản người chơi và máy chủ SQLite. Có thể chơi khách hoặc đăng ký để đồng bộ tiến trình.

**Trang quản trị: `/admin`.** Xem [hướng dẫn tạo admin và vận hành máy chủ](ADMIN.md). Không có mật khẩu mặc định.

## Chạy game

Yêu cầu Node.js 24+ (SQLite tích hợp).

```bash
npm ci
npm run dev
```

Lệnh dev chạy Vite trên cổng 5173 và API nội bộ trên cổng 3001. Chạy bản build cùng máy chủ:

```bash
npm run build
npm start
```

Máy chủ phục vụ `dist/`, `/admin` và API trên cổng 3001. `npm run preview` chỉ xem giao diện tĩnh. Chưa có bản triển khai công khai.

## Những gì có thể chơi

- Thành chính Long Thành có cảnh nền riêng và các công trình tương tác: Chiêu Hiền Các, Chợ quân nhu, Diễn Võ Trường, Chiến dịch. Có thể chọn tướng trưng bày ngay trong thành.
- Sáu mẫu tướng chibi toàn thân nền trong suốt, có chuyển động chờ, lao lên công kích, phản ứng trúng đòn và xoay hướng về đối thủ.
- Sáu danh tướng: Quan Vũ, Triệu Vân, Lữ Bố, Điêu Thuyền, Gia Cát Lượng và Tôn Thượng Hương.
- Đội hình 5 tướng: thay tướng, đổi vị trí; hai tướng hàng trước chặn đòn đánh thường để bảo vệ hàng sau.
- Tám ải chiến dịch mở khóa tuần tự, quân địch mạnh dần. Có chiến thắng, thất bại, rút lui và thưởng sau trận.
- Giao chiến tự động, thanh máu, nộ khí, bạo kích, hồi máu, tuyệt kỹ diện rộng, vệt công kích, vòng nổ và sát thương nổi. Có chế độ tung chiêu thủ công, tạm dừng và tốc độ ×2.
- Ba cặp hợp kích: Quan Vũ + Triệu Vân (tiếp nộ), Lữ Bố + Điêu Thuyền (hồi máu), Gia Cát Lượng + Tôn Thượng Hương (tăng sát thương). Cả hai phải có mặt, còn sống và có ít nhất 66 nộ. Hợp kích tiêu nộ của cả cặp; tự động ưu tiên dùng khi đủ điều kiện hoặc có thể bấm thủ công.
- Chiêu mộ 1 hoặc 10 lần, ưu tiên dùng lệnh trước ngọc; thập liên bảo đảm SSR. Mỗi tướng trùng đổi thành 20 mảnh, 40 mảnh dùng đột phá thêm 3 cấp.
- Nâng cấp tướng bằng bạc, nhận quà mỗi ngày, đổi ngọc lấy tiếp tế và bật/tắt âm thanh hiệu ứng.
- Giao diện thích ứng với điện thoại, hỗ trợ bàn phím và tùy chọn giảm chuyển động của hệ thống.

Chơi khách tự lưu bằng `localStorage`; đăng nhập lưu theo tài khoản trên máy chủ. Vào **Cài đặt → Tài khoản & giftcode** để đăng ký, đăng nhập và nhận mã. Quà ngày làm mới theo ngày tại Việt Nam. Cấu hình tướng, ải và phần thưởng có thể chỉnh từ admin. Dữ liệu máy chủ ở `.data/`, không được commit lên GitHub.

Trận đấu vẫn được tính trong trình duyệt; chưa có PvP, cơ chế xác minh phần thưởng/chống gian lận ở máy chủ hoặc thanh toán. Tài nguyên không có giá trị tiền thật. Thiết kế và hình ảnh riêng, không sử dụng tài sản từ các game thương mại được nhắc làm cảm hứng.

## Kiểm tra

```bash
npm test
```

Bộ kiểm tra gồm 16 bài game và 8 bài quản trị, dùng cơ sở dữ liệu tạm và tài khoản test riêng. Playwright dùng Chromium ở `/usr/bin/chromium`; trên máy khác, đặt biến `CHROMIUM_PATH` hoặc cài trình duyệt bằng `npx playwright install chromium`. Xem chi tiết trong [ADMIN.md](ADMIN.md).

## Cấu trúc

- `src/game.js`: dữ liệu tướng, ải, tiến trình và bộ máy giao chiến thuần JavaScript.
- `src/main.jsx`: giao diện React và các vòng chơi.
- `src/Admin.jsx`, `src/Account.jsx`: quản trị, tài khoản và đồng bộ.
- `server/`, `scripts/`: máy chủ, SQLite, xác thực và công cụ admin.
- `src/CityHub.jsx`: thành chính tương tác và tướng chibi.
- `src/game-feel.css`: giao diện thành chính, tướng toàn thân và hiệu ứng hợp kích.
- `src/style.css`: giao diện, responsive và animation.
- `public/art/`: ảnh nền thế giới, thành chính, sáu chân dung và sáu tướng chibi gốc.
- `tests/`: kiểm tra logic, hợp kích và luồng chơi bằng Playwright.

Font Be Vietnam Pro và Playfair Display được đóng gói cùng ứng dụng qua Fontsource; game không cần gọi dịch vụ ảnh, font hay API bên ngoài khi chơi.
