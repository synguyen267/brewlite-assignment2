import { describe, expect, it } from 'vitest';
import { calcUnitPrice, formatPrice } from './pricing';

describe('calcUnitPrice', () => {
  it('size S và không topping giữ nguyên giá gốc', () => {
    expect(calcUnitPrice(29000, 'S', [])).toBe(29000);
  });

  it('cộng phụ phí theo size', () => {
    expect(calcUnitPrice(29000, 'M', [])).toBe(34000);
    expect(calcUnitPrice(29000, 'L', [])).toBe(39000);
    expect(calcUnitPrice(29000, 'XL', [])).toBe(44000);
  });

  it('cộng phụ phí của từng topping được chọn', () => {
    expect(calcUnitPrice(29000, 'S', ['tran-chau'])).toBe(34000);
    expect(calcUnitPrice(29000, 'S', ['tran-chau', 'kem-muoi'])).toBe(44000);
  });

  it('kết hợp size và topping', () => {
    expect(calcUnitPrice(29000, 'L', ['kem'])).toBe(44000);
  });

  it('bỏ qua topping không tồn tại', () => {
    expect(calcUnitPrice(29000, 'S', ['khong-co'])).toBe(29000);
  });
});

describe('formatPrice', () => {
  it('định dạng giá tiền kèm ký hiệu đ', () => {
    expect(formatPrice(29000)).toMatch(/^29\D?000đ$/);
  });
});
