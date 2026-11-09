'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { ApiError, fetchOrder, payOrder, type PaymentMethod } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  PROGRESS_STEPS,
  STATUS_LABEL,
  STATUS_STYLE,
  isFinal,
  isPayable,
  newIdempotencyKey,
} from '@/lib/order-status';
import { TOPPINGS, formatPrice } from '@/lib/pricing';
import { useAuthReady } from '@/lib/use-auth-ready';

// Chỉ hiện ô giả lập lỗi khi chạy chế độ demo (NEXT_PUBLIC_DEMO_MODE=true).
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'WALLET', label: 'Ví BrewLite' },
  { value: 'CARD', label: 'Thẻ' },
];

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const ready = useAuthReady();
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(token ?? '', id),
    enabled: ready && !!token && Number.isInteger(id),
    // Tự làm mới trạng thái khi đơn đang được quầy xử lý.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && !isFinal(status) && !isPayable(status) ? 5000 : false;
    },
  });

  const [method, setMethod] = useState<PaymentMethod>('WALLET');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState('');
  // Khóa idempotency của lần thanh toán đang thực hiện. Giữ nguyên khi gặp lỗi
  // mạng để bấm lại không bị tính tiền hai lần; chỉ đổi khi lần thử đã có kết quả.
  const keyRef = useRef<string | null>(null);

  const handlePay = async () => {
    if (!token) return;
    keyRef.current ??= newIdempotencyKey();
    setMessage('');
    setPaying(true);
    try {
      const result = await payOrder(token, {
        orderId: id,
        method,
        idempotencyKey: keyRef.current,
        simulateFailure: DEMO_MODE && simulateFailure,
      });
      keyRef.current = null;
      if (result.paymentStatus === 'FAILED') {
        setMessage('Thanh toán thất bại. Bạn có thể thử lại.');
      }
      await queryClient.invalidateQueries({ queryKey: ['order', id] });
    } catch (err) {
      setMessage(
        `${(err as Error).message}. Bạn có thể bấm thanh toán lại, hệ thống sẽ không tính tiền hai lần.`,
      );
    } finally {
      setPaying(false);
    }
  };

  const toppingText = (values: string[]) =>
    values.length === 0
      ? 'Không topping'
      : values
          .map((v) => TOPPINGS.find((t) => t.value === v)?.label ?? v)
          .join(', ');

  const loginHref = `/login?next=/orders/${params.id}`;
  const unauthorized = error instanceof ApiError && error.status === 401;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/orders" className="text-sm text-stone-500 hover:underline">
        ← Đơn hàng của tôi
      </Link>

      {!ready && <p className="mt-6 text-stone-500">Đang tải...</p>}

      {ready && !token && (
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 text-center">
          <p className="text-stone-600">Bạn cần đăng nhập để xem đơn hàng.</p>
          <Link href={loginHref} className="mt-3 inline-block text-amber-700 underline">
            Đăng nhập
          </Link>
        </div>
      )}

      {ready && token && isLoading && (
        <p className="mt-6 text-stone-500">Đang tải đơn hàng...</p>
      )}

      {unauthorized && (
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 text-center">
          <p className="text-stone-600">Phiên đăng nhập đã hết hạn.</p>
          <Link href={loginHref} className="mt-3 inline-block text-amber-700 underline">
            Đăng nhập lại
          </Link>
        </div>
      )}

      {error && !unauthorized && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p>{error.message}</p>
          <button onClick={() => refetch()} className="mt-2 underline">
            Thử lại
          </button>
        </div>
      )}

      {order && (
        <>
          <div className="mt-4 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Đơn #{order.id}</h1>
              <p className="text-sm text-stone-500">
                {new Date(order.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLE[order.status]}`}
            >
              {STATUS_LABEL[order.status]}
            </span>
          </div>

          {PROGRESS_STEPS.includes(order.status) && (
            <ol className="mt-5 flex items-center justify-between gap-1 text-center text-xs">
              {PROGRESS_STEPS.map((step, index) => {
                const current = PROGRESS_STEPS.indexOf(order.status);
                const done = index <= current;
                return (
                  <li
                    key={step}
                    aria-current={index === current ? 'step' : undefined}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${
                        done ? 'bg-green-600' : 'bg-stone-300'
                      }`}
                    >
                      {done ? '✓' : index + 1}
                    </span>
                    <span className={done ? 'text-stone-800' : 'text-stone-400'}>
                      {STATUS_LABEL[step]}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          <ul className="mt-6 space-y-2">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3"
              >
                <div>
                  <p className="font-medium">
                    <span>{item.product?.name ?? `Sản phẩm #${item.productId}`}</span>{' '}
                    <span className="text-stone-500">
                      ({item.size}) × {item.qty}
                    </span>
                  </p>
                  <p className="text-xs text-stone-500">
                    {toppingText(item.toppings)}
                  </p>
                </div>
                <span className="font-medium">{formatPrice(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4">
            <span className="text-stone-600">Tổng tiền</span>
            <span className="text-xl font-bold text-amber-700">
              {formatPrice(order.total)}
            </span>
          </div>

          {isPayable(order.status) && (
            <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
              <h2 className="font-medium">Phương thức thanh toán</h2>
              <div className="mt-2 flex gap-4">
                {METHODS.map((m) => (
                  <label key={m.value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="method"
                      value={m.value}
                      checked={method === m.value}
                      onChange={() => setMethod(m.value)}
                    />
                    {m.label}
                  </label>
                ))}
              </div>

              {DEMO_MODE && (
                <label className="mt-3 flex items-center gap-2 text-sm text-stone-500">
                  <input
                    type="checkbox"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                  />
                  Demo: giả lập thanh toán thất bại
                </label>
              )}

              {message && (
                <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {message}
                </p>
              )}

              <button
                onClick={handlePay}
                disabled={paying}
                className="mt-4 w-full rounded-lg bg-stone-800 px-5 py-2 text-white hover:bg-stone-700 disabled:opacity-50"
              >
                {paying ? 'Đang thanh toán...' : `Thanh toán ${formatPrice(order.total)}`}
              </button>
            </section>
          )}
        </>
      )}
    </main>
  );
}
