# Kiểm thử và bàn giao tích hợp PetCare

## Kết quả ngày 20/11/2026

Bốn PR #18, #19, #20 và #21 đã qua review và merge vào main theo thứ tự. Nhánh feature/petcare-deploy-reminder-prep nối phần TV1 vào main mới.

| Hạng mục | Môi trường | Kết quả |
| --- | --- | --- |
| Lint toàn frontend | Source tích hợp | Đạt |
| Production build với VITE_API_BASE_URL riêng | Vite build | Đạt, còn cảnh báo bundle lớn hơn 500 kB |
| Đăng nhập từ trang tiêm rồi quay về đúng thú cưng | Chrome và API giả lập | Đạt |
| Gợi ý ngày tiêm tiếp theo, thêm, sửa và xóa | Chrome và API giả lập | Đạt |
| Đăng ký, lưu hồ sơ, tên trên navbar, đăng xuất | Chrome và API giả lập | Đạt |
| Đọc summary.overdue và summary.due_soon | Chrome và API giả lập | Đạt |
| Sửa cửa sổ nhắc và cập nhật huy hiệu/menu/Dashboard | Chrome và API giả lập | Đạt |
| Lọc khoảng ngày cân nặng, thay đổi kg, khoảng sai, khoảng trống và xóa lọc | Chrome và API giả lập | Đạt |
| Kết nối và truy vấn T20 chọn mũi mới nhất | MySQL thật, chỉ SELECT | Đạt |
| CRUD tiêm và quyền truy cập, chỉnh ngày nhắc trong hồ sơ | 18 request HTTP, route Express thật và service giả lập | Đạt trong lượt review 4 PR |
| T24 kiểm tra hồ sơ đang hoạt động | Source service | Đã thêm điều kiện is_active = TRUE |

Các thao tác tạo/sửa/xóa của kiểm thử tự động dùng dữ liệu giả lập. Cần chạy lại ca ghi trên tài khoản demo được nhóm đồng ý sử dụng và trên môi trường triển khai chính thức.

## Nghiệm thu khi TV2 gửi URL backend

- Đặt URL HTTPS API bao gồm /api vào VITE_API_BASE_URL trước khi build frontend.
- TV2 cho phép frontend origin trong CORS nếu hai dịch vụ khác domain.
- Mở trực tiếp và tải lại /login, /register, /profile, /dashboard, /pets, trang cân nặng, trang khám và trang tiêm.
- Đăng ký tài khoản demo, đăng nhập, sửa hồ sơ, đăng xuất và đăng nhập lại.
- Thêm/sửa/xóa đúng các bản ghi demo được chỉ định cho lần test. Dùng hai tài khoản để xác nhận dữ liệu người khác trả 404.
- Chuẩn bị mũi quá hạn, đến hạn hôm nay, đúng ngày cuối cửa sổ và sau cửa sổ. Đối chiếu T20, Dashboard và huy hiệu.
- Sửa/xóa một mũi hoặc đổi cửa sổ nhắc trong hồ sơ, xác nhận số nhắc cập nhật.
- Kiểm tra màn hình hẹp, lỗi mạng và phiên hết hạn.
- Ghi URL frontend, URL API, commit và kết quả của từng ca vào tài liệu bàn giao.

## Thông tin còn cần từ TV2

| Phần | Thông tin cần cung cấp | Cách sử dụng |
| --- | --- | --- |
| T33 | URL HTTPS API chính thức và frontend origin được cho phép | Cấu hình Vite và kiểm tra website online |
| T27 | Dịch vụ SMTP, địa chỉ gửi, giờ gửi và múi giờ nhóm thống nhất | Cài lịch gửi và kiểm tra email thật |
| T27 | Môi trường chạy job liên tục hoặc lịch chạy do host hỗ trợ | Bảo đảm lịch gửi hoạt động sau deploy |
| T27 | Đồng ý phương án lưu lịch sử gửi nếu cần bảng mới | Tránh gửi trùng khi restart hoặc chạy lại |
| T35–T37 | Nội dung TV2 trình bày, URL Swagger nếu có và dữ liệu demo được phép chỉnh | Ghép báo cáo, slide và tập demo chung |

T20 đã có getLatestDoses và getRemindBeforeDays trong backend/src/services/reminders.service.js để dùng lại khi triển khai email. T27 đã có worker, dry-run và kiểm thử tự động trong nhánh feature/T27-email-reminders. Xem email-reminders.md. Còn chờ nghiệm thu SMTP thật và cấu hình lịch trên host.
