-- Thêm thông tin liên hệ trên bài đăng sách (chỉ hiện khi người dùng chủ động nhập khi đăng)

alter table books
  add column if not exists contact_phone text,
  add column if not exists contact_email text;
