import type { OrderStatus } from './api';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAYMENT_FAILED: 'Thanh toán thất bại',
  PAID: 'Đã thanh toán',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng nhận',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PAYMENT_FAILED: 'bg-red-100 text-red-700',
  PAID: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-blue-100 text-blue-800',
  READY: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-stone-200 text-stone-700',
  CANCELLED: 'bg-stone-200 text-stone-700',
};

// Các bước khách theo dõi sau khi đã thanh toán.
export const PROGRESS_STEPS: OrderStatus[] = [
  'PAID',
  'PREPARING',
  'READY',
  'COMPLETED',
];

export const isPayable = (status: OrderStatus) =>
  status === 'PENDING' || status === 'PAYMENT_FAILED';

export const isFinal = (status: OrderStatus) =>
  status === 'COMPLETED' || status === 'CANCELLED';

// Khóa idempotency cho một lần thanh toán (API yêu cầu 8 đến 64 ký tự).
export function newIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
