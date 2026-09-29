# Sách Gần Nhau

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
4. Lấy **Project URL** và **anon/publishable key** từ **Project Settings → API Keys** trong Dashboard. Copy `.env.example` thành `.env.local` và điền:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Dùng chính xác Project URL trong Dashboard (không thêm `/rest/v1/`).

Nếu **không** cấu hình Supabase, app tự động dùng **local mode** (localStorage). Dữ liệu chỉ xuất hiện khi người dùng thật đăng ký và đăng sách — **không có dữ liệu mẫu**.

### OAuth Google và Facebook

Trong Supabase Dashboard, bật Google và Facebook ở **Authentication → Sign In / Providers** và nhập OAuth Client ID/Secret của từng nhà cung cấp. Trong **Authentication → URL Configuration**, đặt Site URL về domain ứng dụng và thêm các origin được dùng để đăng nhập (ví dụ `http://localhost:5173` và domain production) vào Redirect URLs.

Ở Google Cloud Console và Facebook Login, cấu hình callback URI do Supabase cung cấp: `https://eprtkfsbywwwyljnpurx.supabase.co/auth/v1/callback`. Với Facebook, bật Facebook Login và nhập cùng App ID/Secret vào Supabase.

## Tính năng

- Đăng ký / đăng nhập với validation
- Landing page với animation (Framer Motion + GSAP ScrollTrigger)
- Carousel 3D sách thật (empty state khi chưa có sách)
- Đăng sách: chụp camera hoặc tải ảnh, nén WebP/JPEG
- Định vị: tính khoảng cách Haversine, radar trực quan
- Dashboard: tìm kiếm, lọc, sắp xếp theo khoảng cách
- Quản lý sách cá nhân: sửa trạng thái, xóa
- Hồ sơ: cập nhật tên, bật/tắt định vị
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
