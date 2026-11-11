# ---- Giai đoạn build: cài thư viện, sinh Prisma client, biên dịch NestJS ----
FROM node:24-slim AS build
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
# DATABASE_URL giả, chỉ để Prisma đọc được cấu hình khi generate (không kết nối).
RUN DATABASE_URL=postgresql://user:pass@localhost:5432/db npx prisma generate

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- Giai đoạn chạy ----
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Phiên bản (commit SHA) được ghi vào image để /health báo lại, giúp pipeline
# kiểm tra đúng bản mới đã chạy.
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Giữ nguyên node_modules (gồm Prisma CLI) để chạy migration khi khởi động.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json prisma.config.ts ./
COPY prisma ./prisma

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Khởi động: áp dụng migration, nạp dữ liệu mẫu nếu bảng sản phẩm đang trống
# (khi RUN_SEED=true), rồi chạy API.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && if [ \"$RUN_SEED\" = \"true\" ]; then node prisma/seed.js; fi && exec node dist/main"]
