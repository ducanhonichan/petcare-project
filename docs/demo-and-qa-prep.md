# Kịch bản demo và ôn vấn đáp PetCare

## Demo phần TV1 trong khoảng 5 phút

| Thời gian | Màn hình | Nội dung nói và thao tác |
| --- | --- | --- |
| 0:00–0:40 | Mở đầu và ERD | PetCare tập trung hồ sơ và lịch sử sức khỏe quanh từng thú cưng. Chỉ ba quan hệ trong sơ đồ: chủ sở hữu, cân nặng và lịch khám. |
| 0:40–1:35 | Login và My Pets | Đăng nhập bằng tài khoản demo trong phiên trình duyệt sẵn có. Mở một hồ sơ, mô tả thêm/sửa và xóa mềm. |
| 1:35–2:45 | Weight Tracking | Mở thú cưng đã có bản ghi. Chỉ trục thời gian, số kg, giá trị mới nhất và mức thay đổi. Chọn khoảng ngày để minh họa bộ lọc. Trên dữ liệu demo được phép chỉnh, thêm rồi sửa một bản ghi riêng và xem biểu đồ cập nhật. |
| 2:45–3:45 | Veterinary Visits | Mở từ thẻ thú cưng. Thêm lịch khám demo, tải lại để xác nhận lưu, rồi xóa đúng bản ghi vừa tạo. |
| 3:45–4:30 | Dashboard | Chỉ số thú cưng và cân nặng. Sau khi tích hợp T20, bổ sung một ca quá hạn, một ca sắp đến hạn và huy hiệu menu. |
| 4:30–5:00 | Kiểm thử | Giải thích phản hồi khi thiếu phiên, khi không có dữ liệu và khi API lỗi. Nếu có thời gian, đưa checklist và kết quả kiểm thử. |

Tập lượt 1 trên localhost với dữ liệu demo được phép chỉnh. Ghi chỗ bị vấp và thời lượng thực tế. Tập lượt 2 trên URL nộp bài sau khi nối backend chính thức. Kiểm tra đủ dữ liệu trước buổi trình bày. Sử dụng ảnh/chụp màn hình dự phòng nếu mạng hoặc host ngừng phản hồi.

## Câu hỏi vấn đáp phần TV1

**Một lần khám đi từ giao diện xuống MySQL như thế nào?**

React lấy pet ID từ route, thêm Bearer token và gửi POST. Express xác thực token, kiểm tra thú cưng thuộc chủ và kiểm tra dữ liệu lịch khám. Service gửi truy vấn tham số hóa tới MySQL. Response 201 cho biết lưu thành công và React tải lại lịch sử.

**Làm sao biết thú cưng thuộc người đang đăng nhập?**

Server xác thực chữ ký JWT rồi lấy ID từ token. Điều kiện SQL ghép ID thú cưng với ID chủ. ID từ URL chỉ xác định tài nguyên cần đọc, sửa hoặc xóa.

**Tại sao thú cưng đã xóa vẫn còn trong database?**

My Pets cập nhật `is_active` để ẩn hồ sơ và giữ quan hệ với lịch sử cân nặng, tiêm và khám. Các route dành cho chủ kiểm tra thú cưng còn hoạt động trước khi dùng lịch sử.

**Biểu đồ lấy dữ liệu ở đâu?**

Trang cân nặng đọc bản ghi theo thú cưng, chuyển giá trị kg thành số, bỏ dữ liệu không dùng được và sắp theo thời gian. Recharts vẽ biểu đồ từ các điểm đo.

**Khi nào dùng 400, 401, 403, 404 và 201?**

400 cho dữ liệu sai, 401 khi thiếu hoặc không còn phiên hợp lệ, 403 khi tài khoản không được phép đăng nhập, 404 khi tài nguyên không tồn tại hoặc không thuộc chủ, 201 khi tạo thành công.

**Dashboard lấy trạng thái nhắc lịch ở đâu?**

Backend T20 tính trạng thái theo lịch tiêm, cửa sổ nhắc của người dùng và mũi gần nhất. UI lấy số quá hạn và sắp đến hạn từ adapter. Khi hoàn thành tích hợp, tập giải thích kiểu dữ liệu thực dựa trên PR T20.

**Vì sao cần khai báo URL API lúc build?**

Vite đưa giá trị cấu hình vào JavaScript khi build. Các trang dùng chung một API base. Host frontend phải phục vụ `index.html` cho route của React, còn API và asset có đường dẫn riêng.
