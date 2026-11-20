# PetCare

PetCare là ứng dụng web quản lý hồ sơ thú cưng, lịch sử cân nặng và khám thú y. React/Vite hiển thị giao diện, Express cung cấp REST API và MySQL lưu dữ liệu.

## Chạy trên máy

Cần Node.js tương thích với phiên bản Vite trong `frontend/package.json`, npm và MySQL 8.

1. Dùng một schema MySQL riêng cho dự án. Với máy mới, tạo schema `petcare_db`, chạy `database/001_create_tables.sql` rồi chạy `database/002_seed_data.sql` nếu muốn nạp dữ liệu mẫu. Hai script mặc định chọn `petcare_db`. Khi dùng tên schema khác, đồng bộ tên trong script và cấu hình backend. Với cơ sở dữ liệu có sẵn, kiểm tra đúng schema trước khi chạy SQL.
2. Trong `backend/`, sao chép `.env.example` sang `.env` nếu chưa có. Điền các biến `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` và `JWT_SECRET` của môi trường local.
3. Mở hai terminal ở thư mục gốc dự án. Trong terminal backend chạy:

   ```powershell
   cd backend
   npm ci
   npm run dev
   ```

   Kiểm tra [API health](http://localhost:3000/api/health). Kết nối thành công trả về `{"message":"Database connected"}`.

4. Trong terminal còn lại chạy:

   ```powershell
   cd frontend
   npm ci
   npm run dev
   ```

   Mở [PetCare trên localhost](http://localhost:5173). Dùng tài khoản test đã thiết lập cho môi trường của bạn.

## Build và triển khai frontend

```powershell
cd frontend
npm run lint
npm run build
```

Frontend local mặc định gọi `http://localhost:3000/api`. Có thể đặt `VITE_API_BASE_URL` trong `frontend/.env.local` để ghi đè. Đặt biến này lúc build nếu API được triển khai ở một domain riêng. Khi dùng cùng domain, chuyển tiếp `/api/*` đến Express. Xem [ghi chú triển khai](docs/deployment-and-reminders.md) để cấu hình các route React và kiểm tra sau khi deploy.

## Tài liệu dự án

- [Phạm vi và phân công](docs/project-scope.md)
- [Sơ đồ cơ sở dữ liệu](docs/petcare-erd.png)
- [Email nhắc lịch T27](docs/email-reminders.md)
- [Kiểm thử và bàn giao](docs/qa-and-handoff.md)
- [Kịch bản demo và ôn vấn đáp](docs/demo-and-qa-prep.md)
