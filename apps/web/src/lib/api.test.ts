import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  fetchOrders,
  fetchProduct,
  fetchProducts,
  payOrder,
} from './api';

function mockFetch(response: Partial<Response>) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchProducts', () => {
  it('trả về danh sách sản phẩm khi API thành công', async () => {
    const products = [{ id: 1, name: 'Cà phê sữa', price: 29000, imageUrl: '/1.jpg' }];
    const fn = mockFetch({ ok: true, json: async () => products });

    await expect(fetchProducts()).resolves.toEqual(products);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(String(fn.mock.calls[0][0])).toMatch(/\/products$/);
  });

  it('ném lỗi khi API trả về lỗi', async () => {
    mockFetch({ ok: false, status: 500 });

    await expect(fetchProducts()).rejects.toThrow(
      'Không tải được danh sách sản phẩm',
    );
  });
});

describe('fetchProduct', () => {
  it('ném lỗi "Không tìm thấy sản phẩm" khi API trả 404', async () => {
    mockFetch({ ok: false, status: 404 });

    await expect(fetchProduct(999)).rejects.toThrow('Không tìm thấy sản phẩm');
  });
});

describe('fetchOrders', () => {
  it('gửi kèm token trong header Authorization', async () => {
    const fn = mockFetch({ ok: true, json: async () => [] });

    await expect(fetchOrders('jwt-token')).resolves.toEqual([]);

    const [url, init] = fn.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/orders$/);
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer jwt-token',
    );
  });
});

describe('payOrder', () => {
  const input = {
    orderId: 10,
    method: 'WALLET' as const,
    idempotencyKey: 'key-12345678',
  };

  it('gửi POST /payments kèm idempotencyKey và token', async () => {
    const result = {
      paymentId: 1,
      paymentStatus: 'SUCCESS',
      orderId: 10,
      orderStatus: 'PAID',
      amount: 90000,
      replayed: false,
    };
    const fn = mockFetch({ ok: true, json: async () => result });

    await expect(payOrder('jwt-token', input)).resolves.toEqual(result);

    const [url, init] = fn.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/payments$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(input);
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer jwt-token',
    );
  });

  it('ném ApiError kèm mã trạng thái và thông báo của server', async () => {
    mockFetch({
      ok: false,
      status: 409,
      json: async () => ({ message: 'Đơn đã thanh toán' }),
    });

    const error = await payOrder('jwt-token', input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).message).toBe('Đơn đã thanh toán');
  });
});
