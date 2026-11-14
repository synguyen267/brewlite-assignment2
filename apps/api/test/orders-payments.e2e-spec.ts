import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

// Mỗi lần chạy dùng dữ liệu riêng (email, sản phẩm) để không đụng dữ liệu có sẵn,
// và dọn sạch sau khi chạy xong.
const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const customerEmail = `khach.${runId}@e2e.test`;
const otherEmail = `khac.${runId}@e2e.test`;
const staffEmail = `nhanvien.${runId}@e2e.test`;
const password = 'matkhau-e2e-123';

process.env.JWT_SECRET ??= 'e2e-test-secret';
process.env.STAFF_EMAILS = staffEmail;

jest.setTimeout(30000);

describe('Luồng đặt đơn từ menu đến xác nhận đơn (API + database thật)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let productId: number;
  let customerToken: string;
  let otherToken: string;
  let staffToken: string;

  // Trạng thái dùng chung giữa các bước của luồng chính
  let orderId: number;
  let paymentId: number;
  const payKey = `e2e-pay-${runId}`;

  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function signUp(email: string): Promise<string> {
    await http().post('/auth/register').send({ email, password }).expect(201);
    const res = await http()
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body.accessToken as string;
  }

  function placeOrder(token: string, qty: number) {
    return http()
      .post('/orders')
      .set(auth(token))
      .send({
        items: [{ productId, size: 'M', toppings: ['tran-chau'], qty }],
      });
  }

  async function stockOf(id: number): Promise<number | undefined> {
    const product = await prisma.product.findUnique({ where: { id } });
    return product?.stock;
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    const product = await prisma.product.create({
      data: {
        name: `E2E Trà ${runId}`,
        price: 30000,
        imageUrl: '/e2e.jpg',
        stock: 10,
      },
    });
    productId = product.id;

    customerToken = await signUp(customerEmail);
    otherToken = await signUp(otherEmail);
    staffToken = await signUp(staffEmail);
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: [customerEmail, otherEmail, staffEmail] } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    const orders = await prisma.order.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);

    await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await app.close();
  });

  describe('Luồng chính: menu, đặt đơn, thanh toán, xác nhận', () => {
    it('menu có sản phẩm', async () => {
      const res = await http().get('/products').expect(200);

      const ids = (res.body as { id: number }[]).map((p) => p.id);
      expect(ids).toContain(productId);
    });

    it('đặt đơn: server tính tổng tiền và trừ tồn kho', async () => {
      const res = await placeOrder(customerToken, 2).expect(201);

      // (30.000 + 5.000 size M + 5.000 trân châu) x 2 ly = 80.000
      expect(res.body.total).toBe(80000);
      expect(res.body.status).toBe('PENDING');
      orderId = res.body.id as number;
      expect(await stockOf(productId)).toBe(8);
    });

    it('thanh toán thành công, đơn chuyển sang PAID', async () => {
      const res = await http()
        .post('/payments')
        .set(auth(customerToken))
        .send({ orderId, method: 'WALLET', idempotencyKey: payKey })
        .expect(201);

      expect(res.body.paymentStatus).toBe('SUCCESS');
      expect(res.body.orderStatus).toBe('PAID');
      expect(res.body.replayed).toBe(false);
      paymentId = res.body.paymentId as number;
    });

    it('gửi lại cùng khóa: không tính tiền hai lần', async () => {
      const res = await http()
        .post('/payments')
        .set(auth(customerToken))
        .send({ orderId, method: 'WALLET', idempotencyKey: payKey })
        .expect(201);

      expect(res.body.replayed).toBe(true);
      expect(res.body.paymentId).toBe(paymentId);
      expect(await prisma.payment.count({ where: { orderId } })).toBe(1);
    });

    it('xác nhận đơn: xem chi tiết và lịch sử', async () => {
      const detail = await http()
        .get(`/orders/${orderId}`)
        .set(auth(customerToken))
        .expect(200);
      expect(detail.body.status).toBe('PAID');

      const history = await http()
        .get('/orders')
        .set(auth(customerToken))
        .expect(200);
      const ids = (history.body as { id: number }[]).map((o) => o.id);
      expect(ids).toContain(orderId);
    });
  });

  describe('Kiểm tra và bảo vệ', () => {
    it('đặt đơn không có token bị từ chối (401)', async () => {
      await http()
        .post('/orders')
        .send({
          items: [{ productId, size: 'M', toppings: [], qty: 1 }],
        })
        .expect(401);
    });

    it('dữ liệu sai bị từ chối (400)', async () => {
      await http()
        .post('/orders')
        .set(auth(customerToken))
        .send({
          items: [{ productId, size: 'XXL', toppings: [], qty: 1 }],
        })
        .expect(400);
    });

    it('hết hàng: trả 409 và không đổi tồn kho', async () => {
      const before = await stockOf(productId);

      await placeOrder(customerToken, 20).expect(409);

      expect(await stockOf(productId)).toBe(before);
    });

    it('thanh toán thất bại rồi thử lại bằng khóa mới thì thành công', async () => {
      const order = await placeOrder(customerToken, 1).expect(201);
      const id = order.body.id as number;

      const failed = await http()
        .post('/payments')
        .set(auth(customerToken))
        .send({
          orderId: id,
          method: 'CARD',
          idempotencyKey: `e2e-fail-${runId}`,
          simulateFailure: true,
        })
        .expect(201);
      expect(failed.body.paymentStatus).toBe('FAILED');
      expect(failed.body.orderStatus).toBe('PAYMENT_FAILED');

      const retried = await http()
        .post('/payments')
        .set(auth(customerToken))
        .send({
          orderId: id,
          method: 'CARD',
          idempotencyKey: `e2e-retry-${runId}`,
        })
        .expect(201);
      expect(retried.body.paymentStatus).toBe('SUCCESS');
      expect(retried.body.orderStatus).toBe('PAID');
    });

    it('người dùng khác không xem được đơn (404)', async () => {
      await http()
        .get(`/orders/${orderId}`)
        .set(auth(otherToken))
        .expect(404);
    });
  });

  describe('Nhân viên xử lý đơn', () => {
    it('khách hàng không được dùng API nhân viên (403)', async () => {
      await http().get('/staff/orders').set(auth(customerToken)).expect(403);
    });

    it('nhân viên thấy đơn đã thanh toán trong hàng đợi', async () => {
      const res = await http()
        .get('/staff/orders')
        .set(auth(staffToken))
        .expect(200);

      const ids = (res.body as { id: number }[]).map((o) => o.id);
      expect(ids).toContain(orderId);
    });

    it('chuyển trạng thái theo đúng thứ tự, từ chối nhảy bước', async () => {
      const patch = (status: string) =>
        http()
          .patch(`/staff/orders/${orderId}/status`)
          .set(auth(staffToken))
          .send({ status });

      await patch('PREPARING').expect(200);
      await patch('COMPLETED').expect(409);
      const ready = await patch('READY').expect(200);
      expect(ready.body.status).toBe('READY');

      const detail = await http()
        .get(`/orders/${orderId}`)
        .set(auth(customerToken))
        .expect(200);
      expect(detail.body.status).toBe('READY');
    });
  });
});
