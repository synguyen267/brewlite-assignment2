'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ApiError, fetchOrders } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { STATUS_LABEL, STATUS_STYLE } from '@/lib/order-status';
import { formatPrice } from '@/lib/pricing';
import { useAuthReady } from '@/lib/use-auth-ready';

export default function OrdersPage() {
  const ready = useAuthReady();
  const token = useAuthStore((s) => s.token);

  const {
    data: orders,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: () => fetchOrders(token ?? ''),
    enabled: ready && !!token,
  });

  const unauthorized = error instanceof ApiError && error.status === 401;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="text-sm text-stone-500 hover:underline">
        ← Về menu
      </Link>
      <h1 className="mt-4 mb-6 text-2xl font-bold">Đơn hàng của tôi</h1>

      {!ready && <p className="text-stone-500">Đang tải...</p>}

      {ready && !token && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
          <p className="text-stone-600">Bạn cần đăng nhập để xem đơn hàng.</p>
          <Link
            href="/login?next=/orders"
            className="mt-3 inline-block text-amber-700 underline"
          >
            Đăng nhập
          </Link>
        </div>
      )}

      {ready && token && isLoading && (
        <p className="text-stone-500">Đang tải đơn hàng...</p>
      )}

      {unauthorized && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
          <p className="text-stone-600">Phiên đăng nhập đã hết hạn.</p>
          <Link
            href="/login?next=/orders"
            className="mt-3 inline-block text-amber-700 underline"
          >
            Đăng nhập lại
          </Link>
        </div>
      )}

      {error && !unauthorized && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p>{error.message}</p>
          <button onClick={() => refetch()} className="mt-2 underline">
            Thử lại
          </button>
        </div>
      )}

      {orders && orders.length === 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
          <p className="text-stone-500">Bạn chưa có đơn hàng nào.</p>
          <Link href="/" className="mt-3 inline-block text-amber-700 underline">
            Xem menu
          </Link>
        </div>
      )}

      {orders && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <p className="font-medium">Đơn #{order.id}</p>
                  <p className="text-xs text-stone-500">
                    {new Date(order.createdAt).toLocaleString('vi-VN')} ·{' '}
                    {order.items.reduce((sum, i) => sum + i.qty, 0)} ly
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-amber-700">
                    {formatPrice(order.total)}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[order.status]}`}
                  >
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
