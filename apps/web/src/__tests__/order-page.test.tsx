import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OrderPage from '@/app/orders/[id]/page';
import { fetchOrder, payOrder, type OrderView } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '10' }),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, fetchOrder: vi.fn(), payOrder: vi.fn() };
});

const mockedFetchOrder = vi.mocked(fetchOrder);
const mockedPayOrder = vi.mocked(payOrder);

const pendingOrder: OrderView = {
  id: 10,
  status: 'PENDING',
  total: 90000,
  createdAt: '2026-11-08T10:00:00.000Z',
  items: [
    {
      id: 1,
      productId: 1,
      size: 'M',
      toppings: ['tran-chau'],
      qty: 2,
      unitPrice: 45000,
      lineTotal: 90000,
      product: { name: 'Cà phê sữa', imageUrl: '/1.jpg' },
    },
  ],
};

const paidResult = {
  paymentId: 1,
  paymentStatus: 'SUCCESS' as const,
  orderId: 10,
  orderStatus: 'PAID' as const,
  amount: 90000,
  replayed: false,
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <OrderPage />
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  mockedFetchOrder.mockReset();
  mockedPayOrder.mockReset();
  await useAuthStore.persist.rehydrate();
  useAuthStore.setState({
    token: 'jwt-token',
    user: { id: 7, email: 'khach@example.com' },
  });
});

afterEach(() => {
  cleanup();
  useAuthStore.setState({ token: null, user: null });
});

describe('Trang chi tiết đơn', () => {
  it('hiển thị chi tiết đơn và nút thanh toán khi đơn chờ thanh toán', async () => {
    mockedFetchOrder.mockResolvedValue(pendingOrder);

    renderPage();

    expect(await screen.findByText('Đơn #10')).toBeTruthy();
    expect(screen.getByText('Cà phê sữa')).toBeTruthy();
    expect(screen.getByText('Chờ thanh toán')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Thanh toán/ })).toBeTruthy();
  });

  it('bấm thanh toán gửi đúng phương thức và một khóa idempotency hợp lệ', async () => {
    mockedFetchOrder.mockResolvedValue(pendingOrder);
    mockedPayOrder.mockResolvedValue(paidResult);

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Thanh toán/ }));

    await waitFor(() => expect(mockedPayOrder).toHaveBeenCalledTimes(1));
    const [token, input] = mockedPayOrder.mock.calls[0];
    expect(token).toBe('jwt-token');
    expect(input.orderId).toBe(10);
    expect(input.method).toBe('WALLET');
    expect(input.idempotencyKey.length).toBeGreaterThanOrEqual(8);
  });

  it('gặp lỗi mạng thì bấm lại dùng cùng khóa để không bị tính tiền hai lần', async () => {
    mockedFetchOrder.mockResolvedValue(pendingOrder);
    mockedPayOrder
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce(paidResult);

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Thanh toán/ }));
    expect(
      await screen.findByText(/sẽ không tính tiền hai lần/),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Thanh toán/ }));
    await waitFor(() => expect(mockedPayOrder).toHaveBeenCalledTimes(2));

    const firstKey = mockedPayOrder.mock.calls[0][1].idempotencyKey;
    const secondKey = mockedPayOrder.mock.calls[1][1].idempotencyKey;
    expect(secondKey).toBe(firstKey);
  });

  it('đơn đã thanh toán hiển thị tiến trình và không còn nút thanh toán', async () => {
    mockedFetchOrder.mockResolvedValue({ ...pendingOrder, status: 'PAID' });

    renderPage();

    expect((await screen.findAllByText('Đã thanh toán')).length).toBeGreaterThan(0);
    expect(screen.getByText('Đang pha chế')).toBeTruthy();
    expect(screen.getByText('Sẵn sàng nhận')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Thanh toán/ })).toBeNull();
  });

  it('chưa đăng nhập thì hiện liên kết đăng nhập và không gọi API', async () => {
    useAuthStore.setState({ token: null, user: null });

    renderPage();

    expect(await screen.findByRole('link', { name: 'Đăng nhập' })).toBeTruthy();
    expect(mockedFetchOrder).not.toHaveBeenCalled();
  });
});
