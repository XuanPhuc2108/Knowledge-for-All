# Booki — Tri thức không biên giới

Nền tảng chia sẻ và trao đổi sách quanh bạn — website responsive, hiện đại, không dùng dữ liệu giả.

## Chạy local

```bash
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:5173`.

## Cấu hình Supabase (tùy chọn)

1. Tạo project trên [Supabase](https://supabase.com)
2. Chạy script `supabase-schema.sql` trong SQL Editor
3. Chạy `supabase-migration-book-contact.sql` trên project Supabase hiện có để bổ sung cột liên hệ.
4. Chạy `supabase-migration-book-contact-social.sql` nếu muốn thêm link Zalo/Messenger cho bài đăng hiện có.
5. Chạy `supabase-migration-profile-settings-marketplace.sql` trên project hiện có để bổ sung hồ sơ/quyền riêng tư, trạng thái sách, yêu thích, báo cáo và RPC xóa tài khoản. Không chạy migration thay đổi schema trước khi sao lưu và review quyền RLS.
6. Chạy `supabase-migration-booki-roles-moderation.sql` để thêm vai trò tin cậy và trạng thái xử lý báo cáo. Migration này cần bảng `books` và `book_reports` hiện có.
7. Chạy `supabase-migration-booki-product-completion.sql` sau các migration ở trên. Migration này thiết lập đề nghị mượn/đổi, chat theo đề nghị, đánh giá chỉ sau tương tác hoàn tất, quyền moderator/admin, nhật ký quản trị, cùng các view giới hạn dữ liệu công khai. Sao lưu và review kỹ trước khi chạy trên dữ liệu production.
8. Chạy `supabase-migration-booki-public-profile-join.sql` để gộp hồ sơ công khai đã được cho phép vào view sách; giúp bỏ một lượt truy vấn hồ sơ riêng cho từng trang danh sách/chi tiết. Migration này vẫn làm tròn tọa độ và chỉ lấy trường hiển thị công khai.
9. Đăng nhập tài khoản chủ sở hữu đã xác nhận email, sau đó chạy `supabase-setup-booki-owner.sql` trong SQL Editor. Script tra cứu email trong `auth.users` phía database và dừng nếu tài khoản chưa được xác nhận hoặc đã có owner khác.
10. Lấy **Project URL** và **anon/publishable key** từ **Project Settings → API Keys** trong Dashboard. Copy `.env.example` thành `.env.local` và điền:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PUBLIC_APP_URL=https://booki-vn.vercel.app
```

Dùng chính xác Project URL trong Dashboard (không thêm `/rest/v1/`).

Nếu **không** cấu hình Supabase, app dùng **local mode** (localStorage) để xem dữ liệu trên thiết bị; đăng ký mới bị tắt vì chế độ này không thể xác minh email thật. Tài khoản local đã có vẫn đăng nhập được trên thiết bị đó. Đây không phải cơ chế xác thực an toàn để triển khai công khai.

### OAuth Google và Facebook

Trong Supabase Dashboard, bật Google và Facebook ở **Authentication → Sign In / Providers** và nhập OAuth Client ID/Secret của từng nhà cung cấp. Trong **Authentication → URL Configuration**, đặt Site URL về `https://booki-vn.vercel.app` và thêm `https://booki-vn.vercel.app/**` cùng `http://localhost:5173/**` vào Redirect URLs. `VITE_PUBLIC_APP_URL` là địa chỉ app nhận người dùng sau OAuth/xác nhận email; nó không thay thế `VITE_SUPABASE_URL` dùng để gọi API.

Ở Google Cloud Console và Facebook Login, cấu hình callback URI do Supabase cung cấp trong **Authentication → Sign In / Providers** (dạng `https://<project-ref>.supabase.co/auth/v1/callback`). Trang chọn tài khoản (“Chọn tài khoản”) là giao diện chuẩn của Google OAuth. Dòng “Tiếp tục tới …supabase.co” là tên miền callback Auth mà Google xác minh, không phải URL đích sau đăng nhập. Muốn đổi tên miền callback hiển thị, cần cấu hình **Custom Domain** cho Supabase Auth, sau đó cập nhật callback URI trong Google/Facebook và biến `VITE_SUPABASE_URL`; chỉ đổi `redirectTo` sang domain Vercel sẽ không làm thay đổi tên miền xác minh này. Với Facebook, bật Facebook Login và nhập cùng App ID/Secret vào Supabase.

### Khởi tạo quyền chủ sở hữu

Sau khi chạy cả `supabase-migration-booki-roles-moderation.sql` và `supabase-migration-booki-product-completion.sql`, đăng ký/đăng nhập tài khoản đã xác nhận bằng email chủ sở hữu rồi chạy đoạn SQL sau trong Supabase SQL Editor. Việc cấp quyền chỉ diễn ra phía database; email không được dùng làm điều kiện phân quyền trong frontend. Bảng role chỉ cho phép một chủ sở hữu và không cấp quyền tự nâng cấp cho tài khoản thường.

```sql
do $$
declare
  owner_user_id uuid;
begin
  select id
    into owner_user_id
  from auth.users
  where lower(email) = lower('nguyenxuanphucdongthap123@gmail.com')
    and email_confirmed_at is not null;

  if owner_user_id is null then
    raise exception 'No verified account found for the configured Booki owner email';
  end if;
  if exists (
    select 1 from public.app_user_roles
    where role = 'owner' and user_id <> owner_user_id
  ) then
    raise exception 'An owner is already assigned; review app_user_roles before bootstrapping another owner';
  end if;

  insert into public.app_user_roles (user_id, role)
  values (owner_user_id, 'owner')
  on conflict (user_id) do update set role = 'owner';
end
$$;
```

### Xác nhận email đăng ký

Để chỉ cho phép tài khoản email/mật khẩu sau khi chủ hộp thư xác nhận:

1. Trong **Authentication → Sign In / Providers → Email**, bật **Confirm email**.
2. Trong **Authentication → URL Configuration**, thêm origin của ứng dụng vào **Redirect URLs**; liên kết xác nhận sẽ quay về origin này.
3. Với production, cấu hình SMTP riêng trong **Project Settings → Auth → SMTP Settings** và xác minh sender/domain. Email SMTP mặc định của Supabase có giới hạn gửi và không phù hợp làm dịch vụ gửi thư production.

Ứng dụng hỗ trợ gửi lại email xác nhận từ màn hình đăng ký và không tạo hồ sơ ứng dụng trước khi Supabase cấp phiên đã xác nhận. Supabase quản lý trạng thái này; bật **Confirm email** trên Dashboard là bắt buộc vì client không thể thay cấu hình hoặc tự gửi thư. Google/Facebook OAuth vẫn dùng luồng nhà cung cấp hiện có.

## Tính năng

- Đăng ký / đăng nhập với validation
- Landing page Booki gọn với xem trước sách thật và đường dẫn khám phá công khai
- Trang `/explore` công khai có tìm kiếm, bộ lọc, trạng thái và bài đăng thật
- Đăng sách: chụp camera hoặc tải ảnh, nén WebP/JPEG
- Định vị: tính khoảng cách Haversine, radar trực quan
- Dashboard: tìm kiếm có debounce, lọc thể loại/hình thức/tình trạng/khoảng cách, lưu sách yêu thích
- Chi tiết sách: người chia sẻ, liên hệ qua điện thoại/email/Zalo/Messenger nếu người đăng tự thêm, chia sẻ QR chỉ chứa URL công khai, sách liên quan và lịch sử xem trên thiết bị
- Đề nghị mượn/đổi có trạng thái, chat riêng theo sách, xác nhận hoàn tất từ cả hai bên và đánh giá chỉ từ tương tác đã hoàn tất
- Quản lý sách cá nhân: thống kê, lọc theo trạng thái, sửa/xóa có xác nhận
- Hồ sơ và cài đặt: thông tin liên hệ/quyền riêng tư, định vị, chủ đề, cài PWA, đổi mật khẩu, đăng xuất và yêu cầu xóa tài khoản
- Kiểm duyệt báo cáo có phân quyền database (`user`, `moderator`, `admin`, `owner`); quyền owner cần bootstrap bằng SQL ở trên
- PWA: manifest, biểu tượng, cài đặt ứng dụng và service worker chỉ cache app shell/tài nguyên tĩnh (không cache API người dùng)
- Responsive: sidebar desktop, bottom nav mobile

## Tech stack

- React 18+ / TypeScript / Vite
- Tailwind CSS
- Framer Motion, GSAP + ScrollTrigger
- Lucide React, React Router DOM
- Supabase (optional) hoặc localStorage adapter

## Lưu ý quyền camera & định vị

- **localhost** thường cho phép camera/định vị trên hầu hết trình duyệt
- **Production** cần **HTTPS** để `getUserMedia` và `geolocation` hoạt động ổn định

## Nhóm phát triển

- **Nguyễn Xuân Phúc** — Trưởng nhóm
- **Nguyễn Thanh Trạng** — Thành viên
- **Cô Phạm Nguyễn Cẩm Tú** — Thành viên
