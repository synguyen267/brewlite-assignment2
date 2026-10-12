# Bối cảnh, stakeholder và phạm vi – BrewLite

## 1. Vấn đề nghiệp vụ

Quán cà phê nhỏ thường nhận đơn thủ công tại quầy: khách xếp hàng, gọi món, trả tiền mặt, nhân viên ghi đơn bằng tay. Cách này gây ùn tắc giờ cao điểm, dễ nhầm đơn (size, topping), khó theo dõi tồn kho và không lưu được lịch sử khách hàng.

**BrewLite** là ứng dụng web mobile-first cho phép khách xem menu, chọn size/topping, đặt đơn và thanh toán không dùng tiền mặt, sau đó theo dõi trạng thái đơn. Cửa hàng nhận đơn đã có đầy đủ thông tin và đã thanh toán.

Luồng nghiệp vụ tối thiểu:

```
Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn
```

## 2. Stakeholder

| Stakeholder | Vai trò | Mục tiêu / kỳ vọng |
|---|---|---|
| Khách hàng | Người dùng chính | Đặt đồ uống nhanh trên điện thoại, thấy giá rõ ràng, thanh toán dễ, biết đơn đến đâu rồi |
| Nhân viên quầy | Người dùng nội bộ | Nhận đơn đã thanh toán, cập nhật trạng thái chuẩn bị (PREPARING, READY, COMPLETED) |
| Quản lý cửa hàng | Chủ sở hữu nghiệp vụ | Giảm ùn tắc, kiểm soát tồn kho, có dữ liệu đơn hàng và khuyến mãi |
| Giảng viên / khách hàng nghiệm thu | Người đánh giá | Hệ thống chạy được end-to-end, tài liệu nhất quán, truy vết được |
| Nhóm phát triển | Người xây dựng | Phạm vi rõ ràng, hoàn thành đúng hạn, quy trình CI/CD ổn định |
| Đơn vị thanh toán | Hệ thống bên ngoài | Nhận yêu cầu thanh toán hợp lệ, trả kết quả thành công/thất bại (trong MVP: dịch vụ mô phỏng) |

## 3. Phạm vi

### 3.1. Trong phạm vi MVP (in-scope)
- Xem danh sách và chi tiết sản phẩm.
- Chọn size, topping; giỏ hàng; tính tổng tiền.
- Đăng ký, đăng nhập bằng JWT.
- Tạo đơn hàng, kiểm tra và trừ tồn kho an toàn.
- Mã khuyến mãi áp dụng khi đặt đơn.
- Thanh toán Ví/Thẻ mô phỏng, có idempotency.
- Xem chi tiết, trạng thái và lịch sử đơn của khách.
- Nhân viên cập nhật trạng thái đơn.
- Health check, migration/seed, Docker Compose, CI/CD, triển khai production.

### 3.2. Phạm vi mở rộng (nếu còn thời gian)
- Tích điểm thành viên (`LoyaltyTransaction`) và đổi điểm.
- Quản lý khuyến mãi dạng thực thể (`Promotion`) thay cho mã cố định.
- Thông báo đẩy khi đơn sẵn sàng (PWA).

### 3.3. Không thực hiện (out-of-scope)
- Thanh toán thật qua cổng ngân hàng hoặc ví điện tử.
- Giao hàng tận nơi, theo dõi shipper.
- Quản lý nhiều chi nhánh.
- Trang quản trị đầy đủ (CRUD sản phẩm, báo cáo doanh thu).
- Ứng dụng native iOS/Android.

## 4. Giả định
1. Thanh toán được mô phỏng bằng dịch vụ nội bộ (`mock-gateway`); không xử lý tiền thật.
2. Một cửa hàng duy nhất; tiền tệ VND, lưu số nguyên.
3. Khách hàng cần đăng nhập mới đặt đơn.
4. Mỗi sản phẩm có tồn kho (`stock`); hết hàng thì không đặt được.
5. Người dùng truy cập bằng trình duyệt hiện đại trên điện thoại hoặc máy tính.
6. Nhân viên quầy được xác định bằng vai trò (role) trong hệ thống.

## 5. Ràng buộc
| Mã | Ràng buộc |
|---|---|
| C-01 | Bắt buộc dùng Next.js (frontend), NestJS (backend), PostgreSQL (dữ liệu) |
| C-02 | Frontend theo hướng mobile-first/PWA |
| C-03 | Đóng gói bằng Docker; có `docker-compose.yml` chạy web, API, database |
| C-04 | Thực hiện qua 5 task tuần tự; mọi thay đổi tài liệu đi qua commit/PR |
| C-05 | Secret không được nằm trong repository hoặc log CI |
| C-06 | Phải có URL production truy cập được qua HTTPS tại thời điểm chấm |
| C-07 | Thời gian: học kỳ I, năm học 2026–2027 |

## 6. Rủi ro ban đầu
| Mã | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| R-01 | Hai khách cùng đặt món cuối cùng, bán vượt tồn kho | Cao | Cập nhật tồn kho trong transaction, dùng `version` (optimistic locking) |
| R-02 | Client gửi lại yêu cầu thanh toán, trừ tiền hai lần | Cao | `idempotencyKey` duy nhất trên `Payment` |
| R-03 | Gói miễn phí của nền tảng deploy ngủ đông hoặc hết hạn database trước ngày chấm | Cao | Kiểm tra URL định kỳ, có kế hoạch dự phòng |
| R-04 | Lộ secret trong repository | Cao | `.env.example` chỉ chứa giá trị mẫu, dùng secret của CI |
| R-05 | Tài liệu và code lệch nhau | Trung bình | Ma trận truy vết, review qua PR |
| R-06 | Thiếu thời gian cho test và CD | Trung bình | Chốt phạm vi MoSCoW, ưu tiên mục Must |
