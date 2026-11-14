import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

process.env.JWT_SECRET ??= 'e2e-test-secret';

describe('Ứng dụng (tích hợp với database thật)', () => {
  let app: INestApplication<App>;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / trả lời', async () => {
    await request(app.getHttpServer()).get('/').expect(200);
  });

  it('GET /health báo ok và kết nối được database', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
    expect(typeof res.body.version).toBe('string');
  });

  it('GET /products trả về danh sách (mảng)', async () => {
    const res = await request(app.getHttpServer()).get('/products').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
