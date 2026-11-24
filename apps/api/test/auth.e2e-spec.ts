import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

// Kiểm thử đăng ký và đăng nhập với database thật (FR-05, FR-06, NFR-02).
const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const email = `auth.${runId}@e2e.test`;
const password = 'matkhau-e2e-123';

process.env.JWT_SECRET ??= 'e2e-test-secret';

jest.setTimeout(30000);

describe('Đăng ký và đăng nhập (API + database thật)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const http = () => request(app.getHttpServer());

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
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: email.toLowerCase() } });
    await app.close();
  });

  describe('Đăng ký', () => {
    it('đăng ký thành công và không lộ mật khẩu', async () => {
      const res = await http()
        .post('/auth/register')
        .send({ email, password })
        .expect(201);

      expect(res.body.email).toBe(email.toLowerCase());
      expect(typeof res.body.id).toBe('number');
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
      expect(JSON.stringify(res.body)).not.toContain(password);
    });

    it('mật khẩu được băm trong database, không lưu nguyên văn', async () => {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      expect(user).not.toBeNull();
      expect(user?.passwordHash).not.toBe(password);
      expect(user?.passwordHash.startsWith('$2')).toBe(true);
    });

    it('email đã đăng ký bị từ chối (409)', async () => {
      await http().post('/auth/register').send({ email, password }).expect(409);
    });

    it('email trùng nhưng khác chữ hoa chữ thường cũng bị từ chối (409)', async () => {
      await http()
        .post('/auth/register')
        .send({ email: email.toUpperCase(), password })
        .expect(409);
    });

    it('email sai định dạng bị từ chối (400)', async () => {
      await http()
        .post('/auth/register')
        .send({ email: 'khong-phai-email', password })
        .expect(400);
    });

    it('mật khẩu ngắn hơn 8 ký tự bị từ chối (400)', async () => {
      await http()
        .post('/auth/register')
        .send({ email: `ngan.${runId}@e2e.test`, password: '1234567' })
        .expect(400);
    });

    it('trường lạ trong yêu cầu bị từ chối (400)', async () => {
      await http()
        .post('/auth/register')
        .send({ email: `la.${runId}@e2e.test`, password, role: 'STAFF' })
        .expect(400);
    });
  });

  describe('Đăng nhập', () => {
    it('đăng nhập đúng trả về accessToken', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.accessToken.length).toBeGreaterThan(20);
      expect(res.body.user.email).toBe(email.toLowerCase());
    });

    it('email không phân biệt chữ hoa chữ thường', async () => {
      await http()
        .post('/auth/login')
        .send({ email: email.toUpperCase(), password })
        .expect(200);
    });

    it('sai mật khẩu bị từ chối (401)', async () => {
      await http()
        .post('/auth/login')
        .send({ email, password: 'sai-mat-khau-123' })
        .expect(401);
    });

    it('email chưa đăng ký bị từ chối (401) với cùng thông báo', async () => {
      const wrongPassword = await http()
        .post('/auth/login')
        .send({ email, password: 'sai-mat-khau-123' })
        .expect(401);
      const unknownEmail = await http()
        .post('/auth/login')
        .send({ email: `khong-co.${runId}@e2e.test`, password })
        .expect(401);

      // Không để lộ email nào đã được đăng ký.
      expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
    });

    it('thiếu mật khẩu bị từ chối (400)', async () => {
      await http().post('/auth/login').send({ email }).expect(400);
    });
  });

  describe('Bảo vệ API bằng JWT', () => {
    it('xem lịch sử đơn khi không có token bị từ chối (401)', async () => {
      await http().get('/orders').expect(401);
    });

    it('token sai bị từ chối (401)', async () => {
      await http()
        .get('/orders')
        .set({ Authorization: 'Bearer token-khong-hop-le' })
        .expect(401);
    });

    it('API nhân viên khi không có token bị từ chối (401)', async () => {
      await http().get('/staff/orders').expect(401);
    });

    it('token hợp lệ của khách xem được lịch sử đơn (200)', async () => {
      const login = await http()
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

      await http()
        .get('/orders')
        .set({ Authorization: `Bearer ${login.body.accessToken}` })
        .expect(200);
    });
  });
});
