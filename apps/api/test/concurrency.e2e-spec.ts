import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

// Kiểm thử đồng thời với database thật: AC-08 của UC-04, NFR-06, rủi ro R-01.
const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const password = 'matkhau-e2e-123';
const emails = Array.from(
  { length: 8 },
  (_, i) => `dongthoi${i}.${runId}@e2e.test`,
);

process.env.JWT_SECRET ??= 'e2e-test-secret';

jest.setTimeout(60000);

describe('Đồng thời (API + database thật)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: string[];
  const productIds: number[] = [];

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

  async function createProduct(stock: number): Promise<number> {
    const product = await prisma.product.create({
      data: {
        name: `E2E đồng thời ${runId}-${productIds.length}`,
        price: 30000,
        imageUrl: '/e2e.jpg',
        stock,
      },
    });
    productIds.push(product.id);
    return product.id;
  }

  const placeOrder = (token: string, productId: number, qty = 1) =>
    http()
      .post('/orders')
      .set(auth(token))
      .send({ items: [{ productId, size: 'M', toppings: [], qty }] });

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

    tokens = [];
    for (const email of emails) {
      tokens.push(await signUp(email));
    }
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
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
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await app.close();
  });

  it('AC-08: hai khách đặt món cuối cùng cùng lúc, chỉ một người được đơn', async () => {
    const productId = await createProduct(1);

    const [a, b] = await Promise.all([
      placeOrder(tokens[0], productId),
      placeOrder(tokens[1], productId),
    ]);

    const statuses = [a.status, b.status].sort((x, y) => x - y);
    expect(statuses).toEqual([201, 409]);

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    expect(product?.stock).toBe(0);
    expect(await prisma.orderItem.count({ where: { productId } })).toBe(1);
  });

  it('nhiều khách tranh nhau số hàng còn lại: không bán vượt, tồn kho không âm', async () => {
    const stock = 3;
    const productId = await createProduct(stock);

    const results = await Promise.all(
      tokens.map((token) => placeOrder(token, productId)),
    );

    const created = results.filter((r) => r.status === 201);
    const conflicted = results.filter((r) => r.status === 409);
    expect(created).toHaveLength(stock);
    expect(conflicted).toHaveLength(tokens.length - stock);

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    expect(product?.stock).toBe(0);
    expect(await prisma.orderItem.count({ where: { productId } })).toBe(stock);
  });

  it('đơn bị từ chối vì hết hàng không để lại đơn hay trừ kho dở dang', async () => {
    const productId = await createProduct(1);
    const otherId = await createProduct(5);

    // Một đơn có hai món: món thứ hai không đủ hàng thì toàn bộ đơn bị hoàn tác.
    const res = await http()
      .post('/orders')
      .set(auth(tokens[2]))
      .send({
        items: [
          { productId: otherId, size: 'M', toppings: [], qty: 2 },
          { productId, size: 'M', toppings: [], qty: 2 },
        ],
      })
      .expect(409);
    expect(res.body.message).toContain('không đủ hàng');

    const other = await prisma.product.findUnique({ where: { id: otherId } });
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    expect(other?.stock).toBe(5);
    expect(product?.stock).toBe(1);
    expect(
      await prisma.orderItem.count({
        where: { productId: { in: [productId, otherId] } },
      }),
    ).toBe(0);
  });

  it('thanh toán gửi lại đồng thời cùng một khóa: chỉ ghi một giao dịch', async () => {
    const productId = await createProduct(5);
    const order = await placeOrder(tokens[3], productId).expect(201);
    const orderId = order.body.id as number;
    const body = {
      orderId,
      method: 'WALLET',
      idempotencyKey: `e2e-dup-${runId}`,
    };

    const [a, b] = await Promise.all([
      http().post('/payments').set(auth(tokens[3])).send(body),
      http().post('/payments').set(auth(tokens[3])).send(body),
    ]);

    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.paymentId).toBe(b.body.paymentId);
    // Một yêu cầu xử lý thật, yêu cầu còn lại nhận lại kết quả đã có.
    const replayed = [a.body.replayed, b.body.replayed] as boolean[];
    expect(replayed.sort((x, y) => Number(x) - Number(y))).toEqual([
      false,
      true,
    ]);
    expect(await prisma.payment.count({ where: { orderId } })).toBe(1);
  });

  it('thanh toán đơn đã thanh toán bằng khóa mới bị từ chối (409)', async () => {
    const productId = await createProduct(5);
    const order = await placeOrder(tokens[4], productId).expect(201);
    const orderId = order.body.id as number;

    await http()
      .post('/payments')
      .set(auth(tokens[4]))
      .send({ orderId, method: 'CARD', idempotencyKey: `e2e-first-${runId}` })
      .expect(201);

    await http()
      .post('/payments')
      .set(auth(tokens[4]))
      .send({ orderId, method: 'CARD', idempotencyKey: `e2e-second-${runId}` })
      .expect(409);

    expect(await prisma.payment.count({ where: { orderId } })).toBe(1);
  });
});
