import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StaffPage from '@/app/staff/page';
import {
  ApiError,
  fetchStaffOrders,
  updateOrderStatus,
  type StaffOrderView,
} from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, fetchStaffOrders: vi.fn(), updateOrderStatus: vi.fn() };
});

const mockedFetch = vi.mocked(fetchStaffOrders);
const mockedUpdate = vi.mocked(updateOrderStatus);

const order = (
  id: number,
  status: StaffOrderView['status'],
): StaffOrderView => ({
  id,
  status,
  total: 90000,
  createdAt: '2026-11-24T10:00:00.000Z',
  user: { email: 'khach@example.com' },
  items: [
    {
      id: id * 10,
      productId: 1,
      size: 'M',
      toppings: ['tran-chau'],
      qty: 2,
      unitPrice: 45000,
      lineTotal: 90000,
      product: { name: 'Cà phê sữa', imageUrl: '/1.jpg' },
    },
  ],
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <StaffPage />
    </QueryClientProvider>,
  );
}

async function loginAs(token: string | null) {
  await useAuthStore.persist.rehydrate();
  useAuthStore.setState(
    token
      ? { token, user: { id: 1, email: 'nhanvien@brewlite.vn' } }
      : { token: null, user: null },
  );
}

beforeEach(async () => {
  mockedFetch.mockReset();
  mockedUpdate.mockReset();
  await loginAs('staff-token');
});

afterEach(() => {
  cleanup();
  useAuthStore.setState({ token: null, user: null });
});

describe('Trang nhân viên', () => {
  it('chưa đăng nhập thì mời đăng nhập và không gọi API', async () => {
    await loginAs(null);

    renderPage();

    expect(await screen.findByText(/đăng nhập bằng tài khoản nhân viên/i)).toBeTruthy();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('chia đơn theo ba cột và hiển thị chi tiết món', async () => {
    mockedFetch.mockResolvedValue([
      order(1, 'PAID'),
      order(2, 'PREPARING'),
      order(3, 'READY'),
    ]);

    renderPage();

    expect(await screen.findByText('Đơn #1')).toBeTruthy();
    expect(screen.getByText('Đơn #2')).toBeTruthy();
    expect(screen.getByText('Đơn #3')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Đơn mới' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Đang pha chế' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Sẵn sàng nhận' })).toBeTruthy();
    expect(screen.getAllByText(/Cà phê sữa/).length).toBe(3);
    expect(screen.getAllByText('Trân châu').length).toBe(3);
    expect(mockedFetch).toHaveBeenCalledWith('staff-token');
  });

  it('hàng đợi trống thì báo chưa có đơn', async () => {
    mockedFetch.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Chưa có đơn nào cần xử lý.')).toBeTruthy();
  });

  it('bấm "Bắt đầu pha chế" chuyển đơn đã thanh toán sang PREPARING', async () => {
    mockedFetch.mockResolvedValue([order(1, 'PAID')]);
    mockedUpdate.mockResolvedValue(order(1, 'PREPARING'));

    renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Bắt đầu pha chế' }),
    );

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
    expect(mockedUpdate).toHaveBeenCalledWith('staff-token', 1, 'PREPARING');
  });

  it('mỗi trạng thái có đúng nút thao tác tiếp theo', async () => {
    mockedFetch.mockResolvedValue([
      order(1, 'PAID'),
      order(2, 'PREPARING'),
      order(3, 'READY'),
    ]);

    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Bắt đầu pha chế' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Đã pha xong' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Đã giao khách' })).toBeTruthy();
  });

  it('hiển thị lỗi khi API từ chối chuyển trạng thái (409)', async () => {
    mockedFetch.mockResolvedValue([order(1, 'PAID')]);
    mockedUpdate.mockRejectedValue(
      new ApiError('Trạng thái đơn vừa được thay đổi', 409),
    );

    renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Bắt đầu pha chế' }),
    );

    expect(
      await screen.findByText('Trạng thái đơn vừa được thay đổi'),
    ).toBeTruthy();
  });

  it('tài khoản không phải nhân viên (403) thì báo rõ', async () => {
    mockedFetch.mockRejectedValue(
      new ApiError('Chỉ nhân viên mới được thực hiện thao tác này', 403),
    );

    renderPage();

    expect(
      await screen.findByText('Tài khoản này không phải nhân viên.'),
    ).toBeTruthy();
  });

  it('phiên hết hạn (401) thì mời đăng nhập lại', async () => {
    mockedFetch.mockRejectedValue(new ApiError('Unauthorized', 401));

    renderPage();

    expect(await screen.findByText('Phiên đăng nhập đã hết hạn.')).toBeTruthy();
  });
});
