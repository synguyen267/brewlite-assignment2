# Ma trận truy vết

Liên kết từng yêu cầu trong `docs/requirements/srs.md` với use-case, thiết kế, mã nguồn và kiểm thử. Mã sơ đồ:

| Mã | Tệp |
|---|---|
| UseCase-01 | `docs/diagrams/usecase-overview.puml` |
| UseCase-02 | `docs/diagrams/usecase-checkout.puml` |
| Activity-01 | `docs/diagrams/activity-order.puml` |
| Sequence-01 | `docs/diagrams/sequence-checkout.puml` |
| Class-01 | `docs/diagrams/class-domain.puml` |
| Deployment-01 | `docs/architecture/deployment-production.puml` |
| ADR-001 đến ADR-008 | `docs/architecture/adr/` |

Đường dẫn mã nguồn viết tắt: **API** = `apps/api/src`, **WEB** = `apps/web/src`. Test API nằm cạnh mã (`*.spec.ts`) và ở `apps/api/test` (`*.e2e-spec.ts`); test web là `*.test.ts(x)`.

## 1. Yêu cầu chức năng

| Mã | Ưu tiên | Use-case | Thiết kế, sơ đồ | Code, API | Test |
|---|---|---|---|---|---|
| FR-01 | Must | UC-01 | Activity-01, Class-01 (Product), ADR-002 | `GET /products`; `API/products`; `WEB/app/page.tsx` | `products.service.spec`, `products.controller.spec`; `menu-page.test` (loading, rỗng, lỗi, có sản phẩm); `app.e2e-spec` và `orders-payments.e2e-spec` (menu có sản phẩm) |
| FR-02 | Must | UC-01 | Class-01 (Product) | `GET /products/:id`; `API/products`; `WEB/app/products/[id]/page.tsx` | `products.service.spec` (tìm theo id, 404); `api.test` (fetchProduct 404) |
| FR-03 | Must | UC-02 | Class-01 (OrderItem: size, toppings) | `API/orders/pricing.ts`; `WEB/lib/pricing.ts`; trang chi tiết sản phẩm | `pricing.spec` (API); `pricing.test` (web) |
| FR-04 | Must | UC-02 | Activity-01 | `WEB/lib/cart-store.ts`; `WEB/app/cart/page.tsx` | `cart-store.test` (thêm, gộp dòng cùng size và topping, tách dòng khi khác, sửa số lượng, xóa, làm trống, tính tổng tiền và số ly) |
| FR-05 | Must | UC-03 | Class-01 (User), ADR-004 | `POST /auth/register`; `API/auth` | `orders-payments.e2e-spec` (đăng ký ba tài khoản); `auth.e2e-spec` (đăng ký thành công, email trùng 409 kể cả khác hoa thường, email và mật khẩu sai định dạng 400, mật khẩu được băm) |
| FR-06 | Must | UC-08 | Sequence-01 (kiểm tra JWT), ADR-004 | `POST /auth/login`; `API/auth` | `orders-payments.e2e-spec` (đăng nhập, dùng token); `auth.e2e-spec` (đăng nhập đúng, sai mật khẩu 401, email không tồn tại 401 cùng thông báo, token sai 401) |
| FR-07 | Must | UC-04 | Activity-01, Sequence-01, Class-01 (Order, OrderItem), ADR-002 | `POST /orders`; `API/orders/orders.service.ts` | `orders.service.spec` (tính tổng, trừ kho, sản phẩm không tồn tại, hết hàng, gộp số lượng); `orders-payments.e2e-spec` (tổng 80.000đ, 401, 400, hết hàng 409) |
| FR-08 | Should | UC-07 | Class-01 (Promotion) | Chưa hiện thực: schema có `discount`, `promoCode` nhưng chưa có API | Không có |
| FR-09 | Must | UC-04 | Sequence-01 (nhánh alt), Class-01 (Payment), ADR-005 | `POST /payments`; `API/payments`; `WEB/app/orders/[id]/page.tsx` | `payments.service.spec` (thành công, thất bại); `orders-payments.e2e-spec` (thanh toán thành công, thất bại rồi thử lại); `concurrency.e2e-spec` (thanh toán lại đơn đã PAID bị từ chối 409); `order-page.test` |
| FR-10 | Must | UC-04 | Sequence-01 (idempotency), ADR-005 | `API/payments/payments.service.ts`; `WEB/app/orders/[id]/page.tsx` (giữ khóa khi lỗi mạng) | `payments.service.spec` (gửi lại, trùng khóa đồng thời, khóa người khác); `orders-payments.e2e-spec` (gửi lại không tính tiền hai lần); `concurrency.e2e-spec` (hai yêu cầu cùng khóa gửi đồng thời chỉ ghi một giao dịch); `order-page.test` (lỗi mạng dùng cùng khóa); `api.test` (payOrder) |
| FR-11 | Must | UC-05 | Sequence-01 | `GET /orders/:id`; `WEB/app/orders/[id]/page.tsx` | `orders.service.spec` (đúng chủ, người khác, không có đơn); `orders-payments.e2e-spec` (xác nhận đơn, 404 với người khác); `order-page.test` (chi tiết, tiến trình) |
| FR-12 | Should | UC-05 | – | `GET /orders`; `WEB/app/orders/page.tsx` | `orders.service.spec` (lịch sử); `orders-payments.e2e-spec` (lịch sử chứa đơn) |
| FR-13 | Should | UC-06 | ADR-007 | `GET /staff/orders`, `PATCH /staff/orders/:id/status`; `API/auth/staff.guard.ts` | `orders.service.spec` (chuyển trạng thái, từ chối nhảy bước); `staff.guard.spec`; `orders-payments.e2e-spec` (luồng nhân viên, 403 với khách) |
| FR-14 | Could | – | Class-01 (LoyaltyTransaction) | Chưa hiện thực | Không có |
| FR-15 | Won't | – | – | Không có API hay giao diện quản trị; dữ liệu nạp bằng `apps/api/prisma/seed.js` | Kiểm chứng phủ định: rà soát mã nguồn |
| FR-16 | Won't | – | ADR-005 | `API/payments/mock-gateway.service.ts` là cổng mô phỏng; không có khóa cổng thật trong repository | Kiểm chứng phủ định: rà soát mã nguồn |

## 2. Yêu cầu phi chức năng

| Mã | Ưu tiên | Thiết kế, sơ đồ | Code, cấu hình | Kiểm chứng |
|---|---|---|---|---|
| NFR-01 | Should | – | `GET /products` | Chưa đo thời gian phản hồi (mục 4) |
| NFR-02 | Must | ADR-004 | `API/auth` (bcryptjs băm mật khẩu, JWT); `AuthGuard` | `orders-payments.e2e-spec` (401 khi thiếu token); `auth.e2e-spec` (token sai và thiếu token 401, mật khẩu băm) |
| NFR-03 | Must | ADR-002 | `ValidationPipe` và DTO ở API; kiểm tra ở web; API chỉ trả `id`, `email` | `orders-payments.e2e-spec` (400 khi dữ liệu sai); `auth.e2e-spec` (400 với email sai, mật khẩu ngắn, trường lạ) |
| NFR-04 | Must | ADR-006, Deployment-01 | `.env.example`, `.gitignore`; secret ở GitHub Secrets và biến môi trường Render | Rà soát repository: chỉ có giá trị mẫu |
| NFR-05 | Must | – | `WEB/app/page.tsx` (lưới 2 cột trên điện thoại, 3 và 4 cột trên màn hình lớn) | `menu-page.test` (loading, rỗng, lỗi); chưa kiểm thử ở 360 px (mục 4) |
| NFR-06 | Must | Sequence-01 (transaction), ADR-002 | `API/orders/orders.service.ts` (`$transaction`, trừ kho có điều kiện) | `orders.service.spec`; `orders-payments.e2e-spec` (hết hàng, tồn kho không đổi); `concurrency.e2e-spec` (hai khách đặt món cuối cùng chỉ một người thành công; nhiều khách tranh số hàng còn lại không bán vượt, tồn kho về 0 không âm; đơn nhiều món hết một món thì hoàn tác toàn bộ) |
| NFR-07 | Must | Deployment-01, ADR-006 | `docker-compose.yml`, `apps/api/Dockerfile`, `apps/web/Dockerfile` | Kiểm tra thủ công: `docker compose --profile app up --build` |
| NFR-08 | Must | Deployment-01 | `API/health` | `health.controller.spec`; `app.e2e-spec`; smoke test trong `.github/workflows/cd.yml` |
| NFR-09 | Must | ADR-003 | `apps/api/prisma/migrations`, `seed.js` | Job `API integration and e2e` trong CI chạy `prisma migrate deploy` trên database trống |
| NFR-10 | Must | – | Các tệp test ở trên; `.github/workflows/ci.yml` | CI chạy unit, integration và e2e; `orders-payments.e2e-spec` là test E2E từ menu đến xác nhận đơn |
| NFR-11 | Must | ADR-006 | `.github/workflows/ci.yml`; ruleset `protect-main` | PR #9 (một lần CI phát hiện lỗi, một lần thành công); ảnh `docs/ci-evidence.png` |

## 3. Truy vết sơ đồ sang mã nguồn

| Sơ đồ | Thành phần | Mã nguồn |
|---|---|---|
| Sequence-01 | Customer → Next.js UI → NestJS API → Database → Payment Service | `WEB/app/cart`, `WEB/app/orders/[id]`, `API/orders`, `API/payments`, `API/prisma`, `MockGatewayService` |
| Class-01 | User, Product, Order, OrderItem, Payment | `apps/api/prisma/schema.prisma` |
| Class-01 | Promotion, LoyaltyTransaction | Chưa hiện thực (FR-08, FR-14) |
| Deployment-01 | brewlite-web, brewlite-api, Render Postgres, GHCR, GitHub Actions | `apps/web/Dockerfile`, `apps/api/Dockerfile`, `.github/workflows/cd.yml`, `docs/deployment.md` |

## 4. Khoảng trống đã biết

Các điểm chưa có minh chứng tự động hoặc chưa hiện thực, ghi lại để không nhận nhầm là đã đạt:

- **FR-08, FR-14:** chưa hiện thực (mức Should và Could).
- **NFR-01:** chưa đo hiệu năng.
- **NFR-05:** chưa kiểm thử giao diện ở chiều rộng 360 px.
- **FR-13:** mới có API cho nhân viên, chưa có giao diện nhân viên.
- **NFR-10:** test E2E chạy ở mức API với database thật (`supertest`), chưa có test qua trình duyệt.
- **Cột `version` của `Product`:** có trong schema nhưng code không dùng; tồn kho được bảo vệ bằng cập nhật có điều kiện `stock >= qty`.
