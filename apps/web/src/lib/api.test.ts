import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchProduct, fetchProducts } from './api';

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
