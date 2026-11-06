# Product Backlog

Mỗi hạng mục tương ứng một issue trên GitHub (gắn nhãn `sprint-1` hoặc `sprint-2`). Mã yêu cầu lấy từ `docs/requirements/srs.md`.

Mã trạng thái: **Todo** (chưa làm), **Có code** (đã có trong repo từ Assignment 1, cần rà soát, bổ sung test và đối chiếu SRS), **Done**.

## Sprint 1 – Nền tảng và MVP menu

**Sprint Goal:** tạo nền tảng kỹ thuật, tài liệu có kiểm soát phiên bản và một MVP đầu tiên chạy được cho luồng xem menu.

| ID | Hạng mục | Yêu cầu | Trạng thái |
|---|---|---|---|
| S1-01 | Thiết lập repository: cấu trúc, README, `.env.example`, quy ước branch/commit, Definition of Done | – | Todo |
| S1-02 | Đưa tài liệu Task 1–3 vào `docs/`, mọi thay đổi đi qua pull request | – | Done |
| S1-03 | API `GET /products` và `GET /products/:id` | FR-01, FR-02 | Có code |
| S1-04 | Màn hình menu mobile-first (Next.js) với trạng thái loading, empty, error | FR-01, NFR-05 | Có code |
| S1-05 | Dữ liệu mẫu bằng database seed, tái tạo được bằng migration | NFR-09 | Có code |
| S1-06 | Kiểm thử tối thiểu: unit test API products, test component/luồng menu | NFR-10 | Todo |
| S1-07 | Pipeline CI chạy khi mở pull request: Install → Lint → Test → Build; chặn merge khi thất bại | NFR-11 | Todo |

## Sprint 2 – Hoàn thiện end-to-end và Delivery

**Sprint Goal:** hoàn thành luồng end-to-end, tự động hóa đóng gói và triển khai một phiên bản production truy cập được.

| ID | Hạng mục | Yêu cầu | Mức ưu tiên | Trạng thái |
|---|---|---|---|---|
| S2-01 | Chi tiết sản phẩm, chọn size và topping | FR-02, FR-03 | Must | Có code |
| S2-02 | Giỏ hàng, thêm/sửa/xóa món, tính tổng tiền | FR-04 | Must | Có code |
| S2-03 | Đăng ký, đăng nhập, JWT | FR-05, FR-06 | Must | Có code |
| S2-04 | Tạo đơn: tính tổng ở server, kiểm tra và trừ tồn kho trong một transaction | FR-07, NFR-06 | Must | Có code (thiếu tồn kho, transaction) |
| S2-05 | Thanh toán Ví/Thẻ mô phỏng | FR-09 | Must | Có code |
| S2-06 | Idempotency khi gửi lại yêu cầu thanh toán | FR-10 | Must | Todo |
| S2-07 | Xác nhận đơn, xem trạng thái đơn | FR-11 | Must | Có code (thiếu giao diện) |
| S2-08 | Lịch sử đơn của khách | FR-12 | Should | Todo |
| S2-09 | Nhân viên cập nhật trạng thái đơn | FR-13 | Should | Todo |
| S2-10 | Mã khuyến mãi khi đặt đơn | FR-08 | Should | Todo |
| S2-11 | Tích điểm thành viên | FR-14 | Could | Todo |
| S2-12 | Endpoint `GET /health` | NFR-08 | Must | Todo |
| S2-13 | Unit test nghiệp vụ, integration test tạo đơn/thanh toán, một E2E từ menu đến xác nhận đơn | NFR-10 | Must | Todo |
| S2-14 | Dockerfile cho web và api; `docker-compose.yml` chạy web, api, db | NFR-07 | Must | Todo |
| S2-15 | Pipeline CD: build image gắn tag commit SHA, push registry, deploy, migration, smoke test, rollback | NFR-11 | Must | Todo |
| S2-16 | Triển khai production trên Render (HTTPS, database không public, secret ngoài repo) | NFR-04 | Must | Todo |
| S2-17 | Ma trận truy vết `docs/traceability-matrix.md` | – | Must | Todo |
| S2-18 | `docs/deployment.md`, release notes, tag phiên bản, video demo | – | Must | Todo |
| S2-19 | Sprint Review và Sprint Retrospective | – | Must | Todo |

Ngoài phạm vi: FR-15 (quản trị sản phẩm/khuyến mãi), FR-16 (thanh toán thật) – mức Won't.
