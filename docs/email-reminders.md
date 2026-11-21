# T27 Email nhắc lịch tiêm

## Chạy thử

Từ thư mục backend, khai báo REMINDER_TIME_ZONE trong .env rồi chạy:

```powershell
npm run reminders:preview
```

Preview chỉ dùng SELECT, in tổng số chủ và mũi đến hạn. Preview giữ nguyên trạng thái gửi email và không kết nối SMTP.

Job dùng getLatestDoses của T20 để chọn mũi mới nhất theo thú cưng/loại vaccine. Cửa sổ nhắc lấy từ từng user. Chỉ các mũi DUE_SOON đóng góp vào email. Job bỏ qua user bị khóa và hồ sơ thú cưng đã xóa mềm.

## Cấu hình gửi

Điền SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, FRONTEND_URL, REMINDER_TIME_ZONE và REMINDER_DELIVERY_DIR vào môi trường backend. SMTP_PORT 465 dùng TLS trực tiếp. Các port còn lại yêu cầu STARTTLS. FRONTEND_URL là URL giao diện mà người nhận sẽ mở.

```powershell
npm run reminders:send
```

Lệnh này gửi email thật. Mỗi chủ có lịch đến hạn nhận một email gom các thú cưng của mình.

## Chạy theo lịch

Chốt REMINDER_CRON và REMINDER_TIME_ZONE với nhóm. Ví dụ lịch 08:00 mỗi ngày dùng biểu thức 0 8 * * *, múi giờ Asia/Ho_Chi_Minh. Đây là ví dụ để cấu hình, giờ chạy thực tế do nhóm quyết định.

```powershell
npm run reminders:schedule
```

Đây là worker chạy lâu dài riêng với Express. Host cần duy trì worker hoặc dùng dịch vụ lịch ngoài gọi reminders:send. API frontend vẫn chạy độc lập.

## Lưu kết quả và xử lý sự cố

REMINDER_DELIVERY_DIR phải nằm trên volume bền vững. Tất cả worker gửi email dùng chung thư mục này. Một file theo ngày và ID chủ được tạo độc quyền trước khi gửi để các lần chạy đồng thời dùng chung lịch sử.

- sent ghi nhận SMTP đã nhận thư.
- pending là lần gửi đang chạy hoặc lần đã bị gián đoạn.
- failed ghi nhận lần gửi báo lỗi.

Job bỏ qua cả ba trạng thái trong ngày đó để giảm nguy cơ gửi lặp khi SMTP đã nhận thư trước khi kết nối lỗi. Kiểm tra log SMTP và trạng thái file trước khi quyết định thử lại thủ công. Giữ pending nguyên khi chưa xác minh kết quả. Ngày tiếp theo có bản ghi riêng và vẫn gửi nếu lịch còn nằm trong cửa sổ nhắc.

Nếu host dùng filesystem tạm hoặc nhiều worker không dùng chung volume, cần tích hợp kho lưu trạng thái bền vững của host hoặc bảng MySQL trước khi bật lịch. Thay đổi schema cần được nhóm duyệt riêng.

Ngày phân loại của email dùng REMINDER_TIME_ZONE. API T20 dùng múi giờ của tiến trình server. Cấu hình TZ của backend cùng múi giờ để Dashboard và email thống nhất ngày.

## Kiểm thử

```powershell
npm run test:reminders
```

Các ca kiểm thử dùng transport giả lập, thư mục tạm và dữ liệu giả lập. Chúng kiểm tra ranh giới ngày, quyền người nhận, cửa sổ nhắc riêng, chạy lại sau restart, hai lần chạy đồng thời và lỗi SMTP của một người không cản người còn lại.
