import { describe, expect, it } from 'vitest';
import {
  PROGRESS_STEPS,
  STATUS_LABEL,
  isFinal,
  isPayable,
  newIdempotencyKey,
} from './order-status';

describe('trạng thái đơn', () => {
  it('chỉ đơn chờ thanh toán hoặc thanh toán thất bại mới thanh toán được', () => {
    expect(isPayable('PENDING')).toBe(true);
    expect(isPayable('PAYMENT_FAILED')).toBe(true);
    expect(isPayable('PAID')).toBe(false);
    expect(isPayable('COMPLETED')).toBe(false);
  });

  it('đơn hoàn thành hoặc đã hủy là trạng thái cuối', () => {
    expect(isFinal('COMPLETED')).toBe(true);
    expect(isFinal('CANCELLED')).toBe(true);
    expect(isFinal('PREPARING')).toBe(false);
  });

  it('các bước tiến trình theo đúng thứ tự xử lý của quầy', () => {
    expect(PROGRESS_STEPS).toEqual(['PAID', 'PREPARING', 'READY', 'COMPLETED']);
  });

  it('mọi trạng thái đều có nhãn tiếng Việt', () => {
    expect(STATUS_LABEL.PENDING).toBe('Chờ thanh toán');
    expect(STATUS_LABEL.PAID).toBe('Đã thanh toán');
    expect(Object.keys(STATUS_LABEL)).toHaveLength(7);
  });
});

describe('newIdempotencyKey', () => {
  it('sinh khóa dài 8 đến 64 ký tự, đúng giới hạn của API', () => {
    const key = newIdempotencyKey();
    expect(key.length).toBeGreaterThanOrEqual(8);
    expect(key.length).toBeLessThanOrEqual(64);
  });

  it('mỗi lần gọi cho một khóa khác nhau', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
});
