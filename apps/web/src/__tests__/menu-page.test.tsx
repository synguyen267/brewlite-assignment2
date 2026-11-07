import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MenuPage from '@/app/page';
import { fetchProducts } from '@/lib/api';

vi.mock('@/lib/api', () => ({ fetchProducts: vi.fn() }));
vi.mock('@/components/CartLink', () => ({ default: () => null }));
vi.mock('@/components/AuthLink', () => ({ default: () => null }));

const mockedFetchProducts = vi.mocked(fetchProducts);

function renderMenu() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MenuPage />
    </QueryClientProvider>,
  );
}

const products = [
  { id: 1, name: 'Cà phê sữa', price: 29000, imageUrl: '/1.jpg' },
  { id: 2, name: 'Trà đào', price: 35000, imageUrl: '/2.jpg' },
];

beforeEach(() => {
  mockedFetchProducts.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('Màn hình menu', () => {
  it('hiển thị trạng thái loading khi đang tải', () => {
    mockedFetchProducts.mockReturnValue(new Promise(() => {}));

    renderMenu();

    expect(screen.getByText('Đang tải menu...')).toBeTruthy();
  });

  it('hiển thị danh sách sản phẩm kèm liên kết tới trang chi tiết', async () => {
    mockedFetchProducts.mockResolvedValue(products);

    renderMenu();

    expect(await screen.findByText('Cà phê sữa')).toBeTruthy();
    expect(screen.getByText('Trà đào')).toBeTruthy();
    expect(screen.queryByText('Đang tải menu...')).toBeNull();

    const hrefs = screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/products/1', '/products/2']);
  });

  it('hiển thị trạng thái empty khi chưa có sản phẩm', async () => {
    mockedFetchProducts.mockResolvedValue([]);

    renderMenu();

    expect(await screen.findByText('Hiện chưa có sản phẩm nào.')).toBeTruthy();
  });

  it('hiển thị trạng thái error và cho phép thử lại', async () => {
    mockedFetchProducts.mockRejectedValue(new Error('network'));

    renderMenu();

    expect(await screen.findByText(/Không tải được menu/)).toBeTruthy();
    expect(mockedFetchProducts).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Thử lại'));

    await waitFor(() => expect(mockedFetchProducts).toHaveBeenCalledTimes(2));
  });
});
