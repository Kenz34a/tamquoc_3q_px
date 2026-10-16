# Tam Quốc Truyền Kỳ

Game web thẻ tướng Tam Quốc bằng tiếng Việt, với hình ảnh gốc được tạo riêng cho dự án. Chơi đơn trên trình duyệt, không cần tài khoản hoặc máy chủ game.

## Chạy game

Yêu cầu Node.js 20.19+ hoặc 22.12+ (môi trường hiện tại dùng Node.js 24).

```bash
npm ci
npm run dev
```

Vite chạy trên cổng 5173. Build để triển khai lên dịch vụ lưu trữ web tĩnh:

```bash
npm run build
npm run preview
```

Thư mục triển khai là `dist/`. Chưa có bản triển khai công khai.

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

Tiến trình tự lưu bằng `localStorage` trên trình duyệt hiện tại. Quà ngày làm mới theo ngày tại Việt Nam. Trong Cài đặt có thể xóa tiến trình sau khi xác nhận. Khi trình duyệt chặn bộ nhớ, game vẫn chạy và hiển thị cảnh báo không lưu được.

Đây là bản chơi đơn cục bộ; chưa có PvP, đăng nhập, đồng bộ tài khoản hay thanh toán. Tài nguyên trong game không có giá trị tiền thật. Thiết kế và hình ảnh riêng, không sử dụng tài sản từ các game thương mại được nhắc làm cảm hứng.

## Kiểm tra

```bash
npm test
```

Bộ kiểm tra gồm 16 bài: luật giao chiến, hợp kích, hồi máu, điều kiện tung chiêu, cân bằng ải, chiêu mộ, dữ liệu lưu, nâng cấp, đội hình, thưởng chiến dịch và tương tác thành chính trên điện thoại. Playwright dùng Chromium có sẵn ở `/usr/bin/chromium`; trên máy khác, đặt biến `CHROMIUM_PATH` trỏ đến trình duyệt hoặc cài trình duyệt bằng `npx playwright install chromium`.

## Cấu trúc

- `src/game.js`: dữ liệu tướng, ải, tiến trình và bộ máy giao chiến thuần JavaScript.
- `src/main.jsx`: giao diện React và các vòng chơi.
- `src/CityHub.jsx`: thành chính tương tác và tướng chibi.
- `src/game-feel.css`: giao diện thành chính, tướng toàn thân và hiệu ứng hợp kích.
- `src/style.css`: giao diện, responsive và animation.
- `public/art/`: ảnh nền thế giới, thành chính, sáu chân dung và sáu tướng chibi gốc.
- `tests/`: kiểm tra logic, hợp kích và luồng chơi bằng Playwright.

Font Be Vietnam Pro và Playfair Display được đóng gói cùng ứng dụng qua Fontsource; game không cần gọi dịch vụ ảnh, font hay API bên ngoài khi chơi.
