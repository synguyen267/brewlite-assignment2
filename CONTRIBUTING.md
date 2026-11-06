# Quy ước làm việc

## Chiến lược branch

- `main` luôn ở trạng thái chạy được. Không commit trực tiếp vào `main`.
- Mọi thay đổi (code, tài liệu, sơ đồ, cấu hình) đi qua **nhánh riêng và pull request**.
- Đặt tên nhánh theo loại công việc:

| Tiền tố | Dùng cho | Ví dụ |
|---|---|---|
| `feat/` | Tính năng mới | `feat/menu-screen` |
| `fix/` | Sửa lỗi | `fix/payment-idempotency` |
| `docs/` | Tài liệu, sơ đồ | `docs/task3-architecture` |
| `test/` | Thêm hoặc sửa test | `test/products-api` |
| `ci/` | Pipeline CI/CD | `ci/pull-request-checks` |
| `chore/` | Dọn dẹp, cấu hình | `chore/repo-setup` |

- Nhánh sống ngắn: mỗi nhánh làm một việc, merge xong thì xóa.

## Quy ước commit

Theo dạng `loại: mô tả ngắn` (Conventional Commits), viết ở thể mệnh lệnh:

```
feat: add GET /products/:id endpoint
fix: reject payment when order already paid
docs: add Task 3.2 deployment diagram
test: add unit tests for pricing
ci: run lint, test and build on pull request
chore: update .env.example
```

Các loại: `feat`, `fix`, `docs`, `test`, `ci`, `chore`, `refactor`. Mỗi commit một thay đổi có ý nghĩa; thay đổi yêu cầu, sơ đồ hoặc kiến trúc phải nêu lý do trong mô tả commit hoặc pull request.

## Pull request

1. Mở pull request vào `main` với mô tả theo mẫu `.github/pull_request_template.md`.
2. Pull request chỉ được merge khi CI (lint, test, build) **đạt** và đã tự rà soát thay đổi.
3. Dùng "Merge pull request" để giữ lịch sử commit của nhánh.
4. Xóa nhánh sau khi merge.

## Definition of Done

Một hạng mục chỉ được coi là xong khi:

- [ ] Đáp ứng tiêu chí chấp nhận của yêu cầu liên quan (FR/NFR trong `docs/requirements/srs.md`).
- [ ] Có test cho nghiệp vụ mới hoặc đã sửa, và toàn bộ test đạt.
- [ ] `npm run lint` và `npm run build` đạt ở app bị thay đổi.
- [ ] Có xử lý trạng thái lỗi và dữ liệu rỗng ở giao diện; có validate ở backend.
- [ ] Không có secret trong code, log hay lịch sử commit.
- [ ] Tài liệu liên quan được cập nhật (README, sơ đồ, ADR, ma trận truy vết nếu bị ảnh hưởng).
- [ ] Pull request đã qua CI và được merge vào `main`.

## Backlog

Product Backlog cho Sprint 1 và Sprint 2 nằm ở `docs/backlog.md`; mỗi hạng mục tương ứng một issue trên GitHub.
