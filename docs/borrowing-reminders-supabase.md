# Cấu hình nhắc trả sách trong Supabase

Migration `supabase-migration-book-borrowing-completion.sql` thêm hàm RPC
`public.process_borrowing_reminders()` và bảng
`public.borrowing_reminder_deliveries` để chống gửi trùng.

Hàm này:

- Chỉ xử lý loan đang ở trạng thái `active`.
- Gửi nhắc cho người mượn ở mốc còn 3 ngày, còn 1 ngày, đến hạn và quá hạn.
- Ghi một khóa theo loan, người nhận và hạn trả hiện tại.
- Không gửi lại nhắc cũ sau khi hạn trả được gia hạn vì khóa có chứa ngày hạn mới.

## Bật scheduler

Trong Supabase Dashboard, mở SQL Editor và chạy thêm:

```sql
create extension if not exists pg_cron;

select cron.schedule(
  'booki-borrowing-reminders-daily',
  '0 17 * * *',
  $$select public.process_borrowing_reminders();$$
);
```

Lịch `17:00 UTC` tương ứng `00:00 Asia/Ho_Chi_Minh` vào mùa không có DST.
Nếu dự án vẫn cần chạy vào 06:00 UTC thì đổi cron expression và ghi chú rõ timezone.

Kiểm tra job và lịch chạy:

```sql
select * from cron.job;
select * from cron.job_run_details
order by start_time desc
limit 20;
```

Khi cấu hình dịch vụ chạy trên Supabase, `process_borrowing_reminders()` chỉ được gọi
bởi `service_role` và cron database. Không đưa service-role key vào frontend.

Sau khi chạy migration và cron, kiểm tra thủ công bằng:

```sql
select public.process_borrowing_reminders();
```

Nếu kết quả trả về `0`, không có loan nào đang nằm đúng mốc nhắc.
