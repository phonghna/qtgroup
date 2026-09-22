# Hướng dẫn deploy "QT Group" lên Vercel với domain riêng

Đây là bản demo QT Group (giống hệt trên Claude) nhưng đóng gói thành 1 website thật, tự chạy độc lập — không phụ thuộc vào Claude nữa. Dữ liệu (đơn hàng, tồn kho, tài khoản...) được lưu trong 1 database Postgres thật, dùng chung cho mọi người truy cập.

**Không cần biết lập trình để làm theo hướng dẫn này** — chỉ cần copy-paste lệnh hoặc bấm nút trên web Vercel.

## Bước 1 — Đưa code lên GitHub

1. Vào [github.com/new](https://github.com/new), tạo 1 repository mới (ví dụ đặt tên `qt-group-website`), để **Private** nếu không muốn công khai code.
2. Trên máy bạn (hoặc terminal bất kỳ có sẵn `git`), giải nén thư mục này rồi chạy:
   ```bash
   cd qt-group-website
   git init
   git add .
   git commit -m "QT Group website"
   git branch -M main
   git remote add origin https://github.com/<tên-của-bạn>/qt-group-website.git
   git push -u origin main
   ```

## Bước 2 — Tạo project trên Vercel

1. Vào [vercel.com](https://vercel.com), đăng nhập bằng tài khoản GitHub của bạn.
2. Bấm **Add New… → Project**, chọn repo `qt-group-website` vừa tạo.
3. Vercel tự nhận ra đây là project Next.js — cứ để nguyên các cài đặt mặc định, bấm **Deploy**.
4. Lần deploy đầu tiên sẽ **báo lỗi hoặc trang trắng** vì chưa có database — bình thường, làm tiếp bước 3 rồi deploy lại.

## Bước 3 — Gắn database Postgres thật (miễn phí)

1. Trong project vừa tạo trên Vercel, vào tab **Storage**.
2. Bấm **Create Database → Postgres** (chạy trên nền Neon, gói miễn phí là đủ cho quy mô demo).
3. Đặt tên tuỳ ý, bấm **Continue/Create** — Vercel sẽ tự động gắn biến môi trường `DATABASE_URL` vào project cho bạn, không cần tự nhập gì thêm.
4. Vào tab **Deployments**, bấm vào 3 chấm (`…`) ở bản deploy mới nhất → **Redeploy** để lần deploy tiếp theo nhận được `DATABASE_URL`.
5. Sau khi deploy xong, mở link `https://<tên-project>.vercel.app` — trang phải hiện màn hình đăng nhập QT Group, giống hệt bản Claude.

## Bước 4 — Tạo `AUTH_SECRET` (bắt buộc để đăng nhập hoạt động)

Từ bản này trở đi, site có **đăng nhập thật** (username + mật khẩu, không còn kiểu bấm chọn tài khoản demo nữa) — cần 1 biến môi trường riêng để ký phiên đăng nhập:

1. Trong project trên Vercel, vào tab **Settings → Environment Variables**.
2. Bấm **Add New**, đặt tên biến là `AUTH_SECRET`, giá trị dán đúng chuỗi ngẫu nhiên sau (đã tạo sẵn cho bạn, không cần tự nghĩ):
   ```
   a9d5c792d46c858c2e34d21ab34fb1d391963c056b689c54b405196706473bcd
   ```
   (Muốn tự tạo chuỗi khác cũng được — chạy `openssl rand -hex 32` trong Terminal. Chỉ cần **giữ bí mật giá trị này**, không chia sẻ ra ngoài — ai có được chuỗi này có thể giả mạo phiên đăng nhập.)
3. Áp dụng cho cả 3 môi trường (Production/Preview/Development) rồi **Save**.
4. Vào tab **Deployments** → **Redeploy** bản mới nhất để nhận biến này.

## Bước 5 — Gắn domain riêng của bạn

1. Trong project trên Vercel, vào tab **Settings → Domains**.
2. Gõ domain bạn đã có (ví dụ `erp.qtgroup.com` hoặc `qtgroup.com`) → bấm **Add**.
3. Vercel sẽ hiện ra 1-2 bản ghi DNS cần thêm (thường là 1 bản ghi `A` trỏ về 1 địa chỉ IP, hoặc 1 bản ghi `CNAME` trỏ về `cname.vercel-dns.com`) — vào đúng trang quản lý DNS của nơi bạn mua domain (Namecheap, GoDaddy, Mắt Bão, Tenten...) và thêm đúng bản ghi Vercel chỉ ra.
4. Sau khi thêm DNS, quay lại Vercel chờ vài phút đến vài giờ (tuỳ nhà cung cấp domain) là domain sẽ chuyển sang trạng thái **Valid** và tự động có HTTPS (Vercel tự cấp SSL, không mất phí).

## Đăng nhập lần đầu — tài khoản khởi tạo sẵn

Lần đầu ai đó đăng nhập thành công, hệ thống tự tạo 7 tài khoản dưới đây trong database (mật khẩu đã băm/hash, không lưu dạng chữ thường). Đây là **mật khẩu tạm** — nên đổi ngay sau khi vào được, qua tab **Users & Roles → Edit → New password**:

| Username | Mật khẩu tạm | Tên | Role |
|---|---|---|---|
| `qtgroup` | `quyetthang@123` | QT | Admin |
| `sherence` | `SherenceQuill3391!` | Sherence | Manager |
| `ciara` | `CiaraNova9694!` | Ciara | Manager |
| `ivy` | `IvyMaple9047!` | Ivy | CS |
| `rhea` | `RheaOnyx8280!` | Rhea | CS |
| `eloisa` | `EloisaQuill2717!` | Eloisa | CS |
| `shane` | `ShaneCedar3764!` | Shane | Packing |

Chỉ Admin (`qtgroup`) mới đổi được mật khẩu của **người khác**; tài khoản thường chỉ tự đổi được mật khẩu của chính mình (khi Admin sửa hồ sơ của họ). Tài khoản mới tạo từ tab Users & Roles bắt buộc phải đặt username + mật khẩu ngay lúc tạo.

## Sau khi deploy xong — những điểm khác so với bản chạy trên Claude

- **Đăng nhập thật** — username + mật khẩu, xác thực ở server (mật khẩu băm bcrypt, phiên đăng nhập lưu cookie httpOnly ký số riêng bằng `AUTH_SECRET`). Toàn bộ API dữ liệu (`/api/collections/*`) giờ **yêu cầu đã đăng nhập** — khác với bản demo trên Claude, nơi ai mở link cũng thấy được dữ liệu ngay cả trước khi chọn tài khoản.
- **Tab "Sales Channels" (chỉ Admin thấy)** — quản lý danh sách kênh bán hàng hiển thị trong ô "Sales channel" khi tạo đơn: thêm kênh mới bằng ô nhập + nút "+ Add channel", xoá bớt bằng nút Remove (bấm 2 lần để xác nhận). Xoá một kênh không ảnh hưởng các đơn hàng cũ đã dùng kênh đó — chỉ bớt lựa chọn cho đơn mới. Danh sách đồng bộ real-time cho mọi người, kể cả các role không thấy tab này (Manager/CS/Packing vẫn thấy đủ danh sách trong ô Sales channel khi tạo đơn).
- **Dữ liệu dùng chung thật, nhưng đồng bộ theo kiểu "hỏi lại mỗi 3 giây"**, không phải đẩy tức thì như bên Claude. Nghĩa là khi 1 người tạo/sửa đơn hàng, người khác đang mở trang sẽ thấy thay đổi đó trong vòng ~3 giây, không phải ngay lập tức. Muốn đổi độ trễ này, sửa số `POLL_MS` ở đầu file `public/claude-polyfill.js` rồi deploy lại.
- **Xuất file Excel/CSV vẫn hoạt động bình thường** — giờ dùng cơ chế tải file chuẩn của trình duyệt thay vì qua Claude, không cần chỉnh gì thêm.
- **"Reset demo data"** (nút chỉ Admin thấy) vẫn hoạt động, xoá và tạo lại đúng bộ dữ liệu mẫu ban đầu (orders/inventory/announcements/messages/hồ sơ staff) — **không đụng tới mật khẩu đã đổi**, vì mật khẩu lưu ở collection `credentials` riêng, tách khỏi dữ liệu demo.
- **File `public/index.html` KHÔNG còn hoàn toàn giống bản Claude Artifact nữa** — phần màn hình đăng nhập (và tab Users & Roles) đã sửa riêng cho bản website này để dùng đăng nhập thật. Nếu sau này cập nhật demo bên Claude (Version 16, 17...), **không thể copy đè trực tiếp** `index.html` mới vào `public/index.html` như trước — cần merge tay phần đăng nhập/Users & Roles, hoặc nhờ merge lại đoạn đó. Các phần khác của app (Orders/Inventory/Fulfillment...) vẫn có thể copy đè bình thường vì không đổi.

## Nếu cần đổi database sau này

Toàn bộ logic đọc/ghi database nằm gọn trong file `lib/db.js` (dùng package `@neondatabase/serverless`, chuẩn Postgres) — không đụng gì tới `public/index.html`. Muốn đổi qua Postgres khác (ví dụ Supabase, RDS...), chỉ cần đổi `DATABASE_URL` là xong, vì đó là chuẩn kết nối Postgres thông thường.
