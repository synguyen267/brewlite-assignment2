# Đặc tả yêu cầu phần mềm (SRS rút gọn) – BrewLite

Phiên bản 1.0. Ưu tiên theo MoSCoW: **Must**, **Should**, **Could**, **Won't** (không làm trong MVP).

## 1. Yêu cầu chức năng

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
|---|---|---|---|
| FR-01 | Hệ thống hiển thị danh sách sản phẩm (menu) với tên, giá, ảnh | Must | `GET /products` trả 200 và danh sách; trang menu hiển thị đủ sản phẩm; khi rỗng hiện thông báo "empty", khi lỗi hiện "error", khi đang tải hiện "loading" |
| FR-02 | Hệ thống hiển thị chi tiết một sản phẩm | Must | `GET /products/:id` trả 200 với đúng sản phẩm; id không tồn tại trả 404 |
| FR-03 | Khách chọn size và topping cho sản phẩm | Must | Giá dòng hàng (`lineTotal`) thay đổi đúng theo size, topping và số lượng |
| FR-04 | Khách thêm, sửa số lượng, xóa món trong giỏ hàng; hệ thống tính tổng tiền | Must | Thêm món làm tổng tăng đúng; xóa món làm tổng giảm đúng; giỏ trống hiện trạng thái trống |
| FR-05 | Khách đăng ký tài khoản bằng email và mật khẩu | Must | `POST /auth/register` trả 201; email trùng trả 409; mật khẩu lưu dạng băm, không lưu rõ |
| FR-06 | Khách đăng nhập và nhận JWT | Must | `POST /auth/login` đúng thông tin trả 200 kèm token; sai thông tin trả 401 |
| FR-07 | Khách tạo đơn từ giỏ hàng; hệ thống kiểm tra tồn kho và tính tổng ở phía server | Must | `POST /orders` có JWT hợp lệ trả 201, đơn ở trạng thái PENDING; không có JWT trả 401; số lượng vượt tồn kho trả lỗi và không tạo đơn; tồn kho giảm đúng sau khi đặt |
| FR-08 | Khách nhập mã khuyến mãi khi đặt đơn | Should | Mã hợp lệ làm `discount` > 0 và `total` giảm đúng; mã sai trả lỗi rõ ràng và đơn không bị tính giảm |
| FR-09 | Khách thanh toán đơn bằng Ví hoặc Thẻ (mô phỏng) | Must | `POST /payments` thành công đổi đơn sang PAID và tạo `Payment` SUCCESS; thất bại đổi đơn sang PAYMENT_FAILED và tạo `Payment` FAILED |
| FR-10 | Gửi lại cùng yêu cầu thanh toán không tạo thêm giao dịch | Must | Hai yêu cầu cùng `idempotencyKey` chỉ tạo một `Payment`; yêu cầu thứ hai trả cùng kết quả |
| FR-11 | Khách xem chi tiết và trạng thái một đơn | Must | `GET /orders/:id` trả đơn kèm các dòng hàng và trạng thái; đơn của người khác không xem được (403/404) |
| FR-12 | Khách xem lịch sử các đơn của mình | Should | `GET /orders` trả danh sách đơn của chính người dùng, mới nhất trước |
| FR-13 | Nhân viên quầy cập nhật trạng thái đơn (PREPARING, READY, COMPLETED, CANCELLED) | Should | Chỉ vai trò nhân viên gọi được; chuyển trạng thái sai thứ tự bị từ chối; khách thấy trạng thái mới khi tải lại |
| FR-14 | Hệ thống tích điểm thành viên sau đơn đã thanh toán | Could | Điểm của người dùng tăng đúng quy tắc sau thanh toán thành công; có bản ghi giao dịch điểm |
| FR-15 | Quản lý tạo, sửa, xóa sản phẩm và khuyến mãi qua giao diện quản trị | Won't | Kiểm chứng phủ định: bản MVP không có API và giao diện quản trị sản phẩm; dữ liệu sản phẩm được nạp bằng seed |
| FR-16 | Thanh toán thật qua cổng ngân hàng hoặc ví điện tử | Won't | Kiểm chứng phủ định: mọi thanh toán đi qua dịch vụ mô phỏng (`mock-gateway`); không có khóa hay cấu hình cổng thanh toán thật trong repository |

## 2. Yêu cầu phi chức năng

| Mã | Nhóm | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
|---|---|---|---|---|
| NFR-01 | Hiệu năng | API đọc menu phản hồi nhanh | Should | `GET /products` có thời gian phản hồi p95 dưới 500 ms với dữ liệu seed, đo bằng công cụ kiểm thử tải đơn giản |
| NFR-02 | Bảo mật | Mật khẩu được băm; xác thực bằng JWT | Must | Cột `passwordHash` không chứa mật khẩu rõ; API bảo vệ trả 401 khi thiếu hoặc sai token |
| NFR-03 | Bảo mật | Dữ liệu đầu vào được kiểm tra ở backend và frontend; không trả `passwordHash` ra API | Must | Dữ liệu sai định dạng trả 400; phản hồi API không chứa trường `passwordHash` |
| NFR-04 | Bảo mật | Secret nằm ngoài repository và log CI | Must | Repo chỉ có `.env.example` với giá trị mẫu; quét repo không thấy secret thật |
| NFR-05 | Tính khả dụng | Giao diện dùng tốt trên điện thoại | Must | Hiển thị đúng ở chiều rộng 360 px, không tràn ngang; có trạng thái loading, empty, error |
| NFR-06 | Độ tin cậy | Tạo đơn và trừ tồn kho thuộc cùng một transaction, không bán vượt tồn | Must | Hai yêu cầu đồng thời đặt món cuối cùng: chỉ một yêu cầu thành công |
| NFR-07 | Khả năng triển khai | Chạy toàn bộ hệ thống bằng một lệnh ở local | Must | `docker compose up` khởi động web, API và database; README hướng dẫn đủ |
| NFR-08 | Khả năng triển khai | Có endpoint health check | Must | `GET /health` trả 200 khi API và database hoạt động |
| NFR-09 | Khả năng triển khai | Database tái tạo được bằng migration và seed | Must | Chạy migration và seed trên database trống cho ra dữ liệu mẫu đầy đủ |
| NFR-10 | Khả năng kiểm thử | Có unit, integration và end-to-end test cho luồng quan trọng | Must | Pipeline CI chạy test; có ít nhất một test E2E từ menu đến xác nhận đơn |
| NFR-11 | Khả năng bảo trì | CI chặn merge khi lint, test hoặc build lỗi | Must | Pull request lỗi không merge được vào `main` |

## 3. Sơ đồ use-case tổng quát

Nguồn: `docs/diagrams/usecase-overview.puml`; ảnh kết xuất: `docs/diagrams/usecase-overview.svg`.

| Mã use-case | Tên | Actor | Yêu cầu liên quan |
|---|---|---|---|
| UC-01 | Xem menu và chi tiết sản phẩm | Customer | FR-01, FR-02 |
| UC-02 | Quản lý giỏ hàng | Customer | FR-03, FR-04 |
| UC-03 | Đăng ký và đăng nhập | Customer | FR-05, FR-06 |
| UC-04 | Đặt và thanh toán đơn hàng | Customer, Payment Service | FR-07, FR-08, FR-09, FR-10 |
| UC-05 | Xem trạng thái và lịch sử đơn | Customer | FR-11, FR-12 |
| UC-06 | Cập nhật trạng thái đơn | Staff | FR-13 |
| UC-07 | Áp mã khuyến mãi (extend của UC-04) | Customer | FR-08 |
| UC-08 | Xác thực người dùng (include trong UC-04, UC-05, UC-06) | Customer, Staff | FR-06, NFR-02 |

Đặc tả chi tiết UC-04 nằm ở `docs/requirements/use-case-checkout.md`.
