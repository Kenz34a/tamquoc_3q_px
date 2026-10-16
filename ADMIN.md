# Quản trị và máy chủ game

Yêu cầu **Node.js 24+** (dùng SQLite tích hợp). Chạy `npm ci` rồi `npm run dev` để khởi động Vite trên cổng 5173 và API trên cổng nội bộ 3001.

Trang game ở `/`; trang quản trị ở **`/admin`**. Có thể mở admin từ **Cài đặt → Trang quản trị** trong game.

## Tạo tài khoản admin

```bash
npm run admin:create -- ten_admin
```

Nhập mật khẩu hai lần trong terminal; ký tự được che. Mật khẩu cần 12–128 ký tự. **Không có tài khoản/mật khẩu mặc định.** Có thể tạo thêm admin bằng cùng lệnh với tên khác.

Đặt lại mật khẩu khi quên (cần quyền truy cập máy chủ):

```bash
npm run admin:password -- ten_admin
```

Đổi mật khẩu trong admin hoặc bằng lệnh trên đều vô hiệu hóa các phiên cũ. Không ghi mật khẩu vào lệnh, chat hoặc file nguồn.

## Chạy bản build

```bash
npm run build
npm start
```

Máy chủ phục vụ cả `dist/`, `/admin` và API trên cổng 3001. Có thể cấu hình `PORT`, `HOST`, `API_PORT`, `GAME_DATA_DIR`, `COOKIE_SECURE` qua `.env`; xem `.env.example`. Khi public qua HTTPS, đặt `COOKIE_SECURE=true`. Chưa có bản triển khai công khai.

`npm run preview` chỉ xem giao diện tĩnh; tài khoản và admin cần API của lệnh dev hoặc start.

## Chức năng quản trị

- **Tổng quan:** số tài khoản người chơi, số bị khóa, giftcode đang bật, phiên bản cấu hình và thao tác gần đây; lấy từ dữ liệu thật trên máy chủ.
- **Người chơi:** tìm kiếm, phân trang, chỉnh bạc/ngọc/lệnh/thể lực, số ải đã vượt, khóa/mở tài khoản và đặt lại tiến trình sau xác nhận.
- **Danh tướng:** chỉnh tên, danh hiệu, phe, phẩm chất, vai trò, tuyệt kỹ, lời thoại, lực chiến và chỉ số sinh lực/công kích theo cấp cho 6 tướng hiện có. Chỉ số mới được dùng trong trận đấu.
- **Chiến dịch:** chỉnh tên, mô tả, địa điểm, đối thủ, cấp địch, độ khó và phần thưởng của 8 ải hiện có.
- **Giftcode:** tạo mã, phần thưởng, giới hạn tổng lượt nhận, hạn nhận và bật/tắt. Mỗi tài khoản nhận một lần; ghi lượt nhận và cộng tài nguyên nằm trong cùng giao dịch SQLite.
- **Cấu hình:** quà ngày, thể lực mỗi trận, giá ngọc chiêu mộ, thông báo trong game, chế độ bảo trì và đổi mật khẩu admin.
- **Nhật ký:** lịch sử đăng nhập admin, sửa cấu hình, chỉnh/khóa/reset người chơi, tạo/tắt mã và nhận quà. Không ghi mật khẩu hoặc token phiên.

Cấu hình mới áp dụng khi người chơi mở hoặc tải lại game. Bảo trì hiển thị màn bảo trì và chặn API tiến trình người chơi; trang admin vẫn truy cập được. Số lượng tướng/ải và hình ảnh hiện được cố định; admin chỉnh các bản ghi hiện có.

## Tài khoản và lưu tiến trình

Trong **Cài đặt → Tài khoản & giftcode**, người chơi có thể đăng ký, đăng nhập, nhận mã và đăng xuất. Đăng ký mới giữ hành trình đang chơi; đăng nhập lấy tiến trình của tài khoản. Tiến trình tự lưu lên máy chủ sau thao tác, đồng thời có bản cục bộ trong trình duyệt.

Game kiểm tra cập nhật tài khoản khi ở ngoài trận. Nếu admin hoặc phiên khác sửa dữ liệu, số phiên bản giúp chặn ghi đè dữ liệu mới bằng bản cũ. Khóa tài khoản vô hiệu hóa phiên đăng nhập. Chơi khách vẫn lưu bằng `localStorage`; admin chỉ quản lý người chơi đã đăng ký trên cùng máy chủ.

Dữ liệu nằm ở **`.data/game.sqlite`**, cùng file WAL/SHM khi SQLite đang chạy. Thư mục được bỏ qua bởi Git. Giữ thư mục này khi khởi động lại/triển khai; sao lưu bằng công cụ backup SQLite hoặc dừng máy chủ trước khi sao chép toàn bộ thư mục. Chỉ triển khai `dist/` lên web tĩnh sẽ không có API quản trị hoặc đồng bộ.

Phiên dùng cookie HttpOnly, SameSite và có thời hạn 8 giờ. API kiểm tra quyền admin, CSRF, nguồn yêu cầu, giới hạn dữ liệu và phiên bản lưu. Mật khẩu băm bằng scrypt với salt riêng; không lưu dạng rõ. Có giới hạn thử đăng nhập. Không có mật khẩu admin nhúng trong giao diện.

Trận đấu hiện vẫn tính trong trình duyệt; đồng bộ tài khoản chưa phải hệ thống xác minh phần thưởng/chống gian lận trên máy chủ. Chưa có PvP hoặc thanh toán tiền thật.

## Kiểm tra

```bash
npm test
```

Playwright dùng cơ sở dữ liệu tạm và mật khẩu test tạo ngẫu nhiên, không đụng cơ sở dữ liệu chơi thật. Kiểm tra game chạy trước; kiểm tra admin chạy sau để cấu hình thử nghiệm không ảnh hưởng kết quả trận đấu. Dùng các cổng riêng 5174 và 3002.

Bộ kiểm tra gồm 16 bài game và 8 bài admin: phân quyền/CSRF/cookie, chỉnh tài nguyên, phiên bản lưu, khóa tài khoản, đăng ký/đồng bộ/giftcode, cấu hình áp dụng vào game, bảo trì, mobile, đổi mật khẩu và dữ liệu còn sau mở lại SQLite.

## Mã nguồn

- `src/Admin.jsx`, `src/admin.css`: trang quản trị.
- `src/Account.jsx`, `src/api.js`: tài khoản và đồng bộ.
- `server/`: HTTP API, xác thực, SQLite, validation và phục vụ bản build.
- `scripts/`: chạy dev, tạo/đổi mật khẩu admin.
