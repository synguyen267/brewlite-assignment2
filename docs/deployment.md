# Hướng dẫn triển khai (Render + GitHub Actions)

## 1. Tổng quan

| Thành phần | Chạy ở đâu | Nguồn |
|---|---|---|
| Web (Next.js) | Render, Web Service từ image | `ghcr.io/<owner>/brewlite-web` |
| API (NestJS) | Render, Web Service từ image | `ghcr.io/<owner>/brewlite-api` |
| PostgreSQL | Render Postgres, truy cập qua URL nội bộ | – |
| Registry | GitHub Container Registry (GHCR) | pipeline CD đẩy image |

Pipeline (`.github/workflows/cd.yml`) chạy khi push vào `main` hoặc đẩy tag `v*`:

```
Push/Tag -> Lint và Test (CI) -> Build image -> Push GHCR -> Deploy Render -> Smoke test
                                                                          \-> lỗi: rollback về :stable
```

1. **Quality gate:** gọi lại `ci.yml` (lint, test, build cho API và Web). Thất bại thì dừng, không build image.
2. **Build image:** tag theo **commit SHA** (đầy đủ 40 ký tự), thêm `latest` khi push vào `main`, thêm tag phiên bản (ví dụ `1.0.0`) khi đẩy tag `v1.0.0`. Image API ghi sẵn commit SHA để `/health` báo lại.
3. **Deploy:** gọi deploy hook của Render, kèm `imgURL` trỏ tới đúng tag SHA vừa build. API khởi động sẽ tự chạy `prisma migrate deploy` (chỉ áp dụng migration chưa chạy) rồi mới nhận traffic.
4. **Smoke test:** đợi `GET /health` trả `status=ok`, `db=up` và `version` đúng bằng commit vừa deploy; kiểm tra `GET /products` có dữ liệu; kiểm tra trang web trả nội dung BrewLite.
5. **Đánh dấu ổn định:** chỉ khi smoke test đạt, image được gắn thêm tag `stable`.
6. **Rollback:** nếu bước deploy hoặc smoke test lỗi, pipeline gọi lại deploy hook với `:stable` (bản chạy tốt gần nhất) rồi báo thất bại.

Secret (deploy hook, JWT) chỉ nằm trong GitHub Secrets và biến môi trường của Render, không nằm trong repository hay log.

## 2. Cấu hình một lần

### 2.1. Đẩy image lần đầu
Ở tab **Settings > Secrets and variables > Actions > Variables**, chưa cần đặt `DEPLOY_ENABLED`. Push vào `main` (hoặc chạy tay workflow **CD** ở tab Actions). Pipeline sẽ build và đẩy image `latest` lên GHCR nhưng bỏ qua bước deploy.

Sau đó vào GitHub, trang **Packages** của tài khoản, mở `brewlite-api` và `brewlite-web`, chọn **Package settings > Change visibility > Public** để Render kéo image không cần thông tin đăng nhập. Image không chứa secret (secret nằm ở biến môi trường của Render).

### 2.2. Tạo dịch vụ trên Render
1. **PostgreSQL:** tạo database mới, ghi lại **Internal Database URL**.
2. **API:** New > Web Service > **Existing Image**, image `ghcr.io/<owner>/brewlite-api:latest`. Đặt biến môi trường:

   | Biến | Giá trị |
   |---|---|
   | `DATABASE_URL` | Internal Database URL của Render Postgres |
   | `JWT_SECRET` | chuỗi ngẫu nhiên dài (không dùng lại giá trị mẫu) |
   | `CORS_ORIGIN` | URL HTTPS của dịch vụ Web |
   | `STAFF_EMAILS` | email nhân viên, cách nhau bằng dấu phẩy |
   | `RUN_SEED` | `true` (chỉ nạp dữ liệu mẫu khi bảng sản phẩm trống) |

   Đặt **Health Check Path** là `/health`.
3. **Web:** New > Web Service > Existing Image, image `ghcr.io/<owner>/brewlite-web:latest`. Không cần biến môi trường (địa chỉ API được ghi vào image lúc build).
4. Ở trang **Settings** của từng dịch vụ, sao chép **Deploy Hook URL**.

Tên menu trên Render có thể thay đổi; nếu khác, đối chiếu với tài liệu Render hiện tại.

### 2.3. Khai báo cho GitHub Actions
Settings > Secrets and variables > Actions:

| Loại | Tên | Giá trị |
|---|---|---|
| Secret | `RENDER_API_DEPLOY_HOOK` | Deploy Hook URL của dịch vụ API |
| Secret | `RENDER_WEB_DEPLOY_HOOK` | Deploy Hook URL của dịch vụ Web |
| Variable | `API_PUBLIC_URL` | URL HTTPS của API, không có dấu `/` ở cuối |
| Variable | `WEB_PUBLIC_URL` | URL HTTPS của Web, không có dấu `/` ở cuối |
| Variable | `DEPLOY_ENABLED` | `true` |
| Variable | `DEMO_MODE` | để trống hoặc `false` ở production |

Chạy lại workflow **CD** một lần nữa để web được build với đúng địa chỉ API, rồi mọi lần push vào `main` sẽ tự triển khai.

## 3. Phát hành phiên bản

```
git tag v1.0.0
git push origin v1.0.0
```

Pipeline build image có tag `1.0.0` và triển khai. Tạo **Release** trên GitHub từ tag đó, kèm release notes.

## 4. Rollback

- **Tự động:** xem bước 6 ở phần 1.
- **Thủ công, về một commit cụ thể:** gọi deploy hook của từng dịch vụ với `imgURL` đã mã hóa URL, ví dụ
  `curl -X POST "<deploy-hook>&imgURL=ghcr.io%2F<owner>%2Fbrewlite-api%3A<commit-sha>"`.
- **Thủ công, trên Render:** mở tab Events của dịch vụ và chọn rollback về một deploy trước đó. Image của deploy đó phải còn trong GHCR.
- **Migration** không tự rollback. Mỗi migration phải tương thích với bản code chạy trước đó (thêm cột trước, xóa cột sau).

## 5. Chạy ở máy local

Xem `README.md`: `docker compose up -d` (chỉ database) hoặc `docker compose --profile app up --build` (cả ba dịch vụ).

## 6. Kiểm tra sau khi triển khai

- `GET <API_PUBLIC_URL>/health` trả `{"status":"ok","db":"up","version":"<commit sha>",...}`
- Mở `<WEB_PUBLIC_URL>`: thấy menu, đăng ký, đặt đơn và thanh toán được.
- Database không có địa chỉ công khai; chỉ API truy cập qua URL nội bộ.

## 7. Giới hạn đã biết

- Gói miễn phí của Render có thể tạm dừng dịch vụ khi không có traffic và có giới hạn với database; cần kiểm tra điều kiện hiện hành trước khi nộp bài (URL phải hoạt động khi chấm).
- Lần rollback đầu tiên không thực hiện được nếu chưa từng có bản `stable`.
