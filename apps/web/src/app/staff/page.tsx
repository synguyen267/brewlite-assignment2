'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  fetchStaffOrders,
  updateOrderStatus,
  type OrderStatus,
  type StaffOrderView,
  type StaffSettableStatus,
} from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { STATUS_LABEL, STATUS_STYLE } from '@/lib/order-status';
import { TOPPINGS, formatPrice } from '@/lib/pricing';
import { useAuthReady } from '@/lib/use-auth-ready';

// Hàng đợi tự làm mới để nhân viên thấy đơn mới mà không cần tải lại trang.
const REFRESH_MS = 5000;

// Thao tác tiếp theo của nhân viên với từng trạng thái (đúng thứ tự API cho phép).
const NEXT_ACTION: Partial<
  Record<OrderStatus, { next: StaffSettableStatus; label: string }>
> = {
  PAID: { next: 'PREPARING', label: 'Bắt đầu pha chế' },
  PREPARING: { next: 'READY', label: 'Đã pha xong' },
  READY: { next: 'COMPLETED', label: 'Đã giao khách' },
};

const COLUMNS: { status: OrderStatus; title: string }[] = [
  { status: 'PAID', title: 'Đơn mới' },
  { status: 'PREPARING', title: 'Đang pha chế' },
  { status: 'READY', title: 'Sẵn sàng nhận' },
];

const toppingText = (values: string[]) =>
  values.length === 0
    ? 'Không topping'
    : values
        .map((v) => TOPPINGS.find((t) => t.value === v)?.label ?? v)
        .join(', ');

export default function StaffPage() {
  const ready = useAuthReady();
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const {
    data: orders,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['staff-orders'],
    queryFn: () => fetchStaffOrders(token ?? ''),
    enabled: ready && !!token,
    refetchInterval: REFRESH_MS,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: number; status: StaffSettableStatus }) =>
      updateOrderStatus(token ?? '', vars.id, vars.status),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] }),
  });

  const unauthorized = error instanceof ApiError && error.status === 401;
  const forbidden = error instanceof ApiError && error.status === 403;
  const loadFailed = error && !unauthorized && !forbidden;

  const byStatus = (status: OrderStatus): StaffOrderView[] =>
    (orders ?? []).filter((o) => o.status === status);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/" className="text-sm text-stone-500 hover:underline">
        ← Về menu
      </Link>
      <h1 className="mt-4 mb-1 text-2xl font-bold">Hàng đợi đơn (nhân viên)</h1>
      <p className="mb-6 text-sm text-stone-500">
        Tự làm mới mỗi {REFRESH_MS / 1000} giây.
      </p>

      {!ready && <p className="text-stone-500">Đang tải...</p>}

      {ready && !token && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
          <p className="text-stone-600">
            Bạn cần đăng nhập bằng tài khoản nhân viên.
          </p>
          <Link
            href="/login?next=/staff"
            className="mt-3 inline-block text-amber-700 underline"
          >
            Đăng nhập
          </Link>
        </div>
      )}

      {ready && token && isLoading && (
        <p className="text-stone-500">Đang tải hàng đợi...</p>
      )}

      {unauthorized && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
          <p className="text-stone-600">Phiên đăng nhập đã hết hạn.</p>
          <Link
            href="/login?next=/staff"
            className="mt-3 inline-block text-amber-700 underline"
          >
            Đăng nhập lại
          </Link>
        </div>
      )}

      {forbidden && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Tài khoản này không phải nhân viên.
        </div>
      )}

      {loadFailed && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p>{error.message}</p>
          <button onClick={() => refetch()} className="mt-2 underline">
            Thử lại
          </button>
        </div>
      )}

      {mutation.error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {mutation.error.message}
        </div>
      )}

      {orders && orders.length === 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
          <p className="text-stone-500">Chưa có đơn nào cần xử lý.</p>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const list = byStatus(col.status);
            return (
              <section key={col.status} aria-label={col.title}>
                <h2 className="mb-2 flex items-center gap-2 font-semibold">
                  {col.title}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[col.status]}`}
                  >
                    {list.length}
                  </span>
                </h2>
                <ul className="space-y-3">
                  {list.map((order) => {
                    const action = NEXT_ACTION[order.status];
                    return (
                      <li
                        key={order.id}
                        className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">Đơn #{order.id}</p>
                            <p className="text-xs text-stone-500">
                              {new Date(order.createdAt).toLocaleTimeString(
                                'vi-VN',
                              )}
                              {order.user?.email ? ` · ${order.user.email}` : ''}
                            </p>
                          </div>
                          <p className="font-medium text-amber-700">
                            {formatPrice(order.total)}
                          </p>
                        </div>
                        <ul className="my-3 space-y-1 text-sm">
                          {order.items.map((item) => (
                            <li key={item.id}>
                              {item.qty} ×{' '}
                              {item.product?.name ?? `Sản phẩm #${item.productId}`}{' '}
                              ({item.size})
                              <span className="block text-xs text-stone-500">
                                {toppingText(item.toppings)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {action && (
                          <button
                            onClick={() =>
                              mutation.mutate({
                                id: order.id,
                                status: action.next,
                              })
                            }
                            disabled={mutation.isPending}
                            className="w-full rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                          >
                            {action.label}
                          </button>
                        )}
                        <span className="sr-only">{STATUS_LABEL[order.status]}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
