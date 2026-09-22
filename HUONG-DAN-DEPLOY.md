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

## Bước 4 — Gắn domain riêng của bạn

1. Trong project trên Vercel, vào tab **Settings → Domains**.
2. Gõ domain bạn đã có (ví dụ `erp.qtgroup.com` hoặc `qtgroup.com`) → bấm **Add**.
3. Vercel sẽ hiện ra 1-2 bản ghi DNS cần thêm (thường là 1 bản ghi `A` trỏ về 1 địa chỉ IP, hoặc 1 bản ghi `CNAME` trỏ về `cname.vercel-dns.com`) — vào đúng trang quản lý DNS của nơi bạn mua domain (Namecheap, GoDaddy, Mắt Bão, Tenten...) và thêm đúng bản ghi Vercel chỉ ra.
4. Sau khi thêm DNS, quay lại Vercel chờ vài phút đến vài giờ (tuỳ nhà cung cấp domain) là domain sẽ chuyển sang trạng thái **Valid** và tự động có HTTPS (Vercel tự cấp SSL, không mất phí).

## Sau khi deploy xong — những điểm khác so với bản chạy trên Claude

- **Dữ liệu dùng chung thật, nhưng đồng bộ theo kiểu "hỏi lại mỗi 3 giây"**, không phải đẩy tức thì như bên Claude. Nghĩa là khi 1 người tạo/sửa đơn hàng, người khác đang mở trang sẽ thấy thay đổi đó trong vòng ~3 giây, không phải ngay lập tức. Muốn đổi độ trễ này, sửa số `POLL_MS` ở đầu file `public/claude-polyfill.js` rồi deploy lại.
- **Xuất file Excel/CSV vẫn hoạt động bình thường** — giờ dùng cơ chế tải file chuẩn của trình duyệt thay vì qua Claude, không cần chỉnh gì thêm.
- **Vẫn CHƯA có đăng nhập thật** (không mật khẩu, ai bấm chọn tài khoản nào cũng vào được — y hệt bản demo trên Claude) — đây vẫn chỉ là bản demo nội bộ, không nên dùng cho dữ liệu thật/khách hàng thật cho đến khi có xác thực thật (đăng nhập bằng email/mật khẩu hoặc SSO công ty).
- **"Reset demo data"** (nút chỉ Admin thấy) vẫn hoạt động, xoá và tạo lại đúng bộ dữ liệu mẫu ban đầu — dùng để làm mới demo giữa các lượt thử.
- File `public/index.html` chính là code gốc từ bản Claude Artifact, **không sửa gì cả** — chỉ thêm 1 dòng nạp file `claude-polyfill.js` ở phía trên. Nếu sau này bạn cập nhật demo bên Claude (ví dụ Version 16, 17...), chỉ cần copy đè file `index.html` mới nhất vào `public/index.html` của project này (nhớ giữ lại dòng `<script src="/claude-polyfill.js"></script>` đã thêm), commit, push lên GitHub là Vercel tự deploy lại.

## Nếu cần đổi database sau này

Toàn bộ logic đọc/ghi database nằm gọn trong file `lib/db.js` (dùng package `@neondatabase/serverless`, chuẩn Postgres) — không đụng gì tới `public/index.html`. Muốn đổi qua Postgres khác (ví dụ Supabase, RDS...), chỉ cần đổi `DATABASE_URL` là xong, vì đó là chuẩn kết nối Postgres thông thường.
