import { SIZE_VALUES, TOPPING_VALUES, calcUnitPrice } from './pricing';

describe('calcUnitPrice (API)', () => {
  it('size S và không topping giữ nguyên giá gốc', () => {
    expect(calcUnitPrice(35000, 'S', [])).toBe(35000);
  });

  it('cộng phụ phí theo size, gồm cả XL', () => {
    expect(calcUnitPrice(35000, 'M', [])).toBe(40000);
    expect(calcUnitPrice(35000, 'L', [])).toBe(45000);
    expect(calcUnitPrice(35000, 'XL', [])).toBe(50000);
  });

  it('cộng phụ phí từng topping, gồm cả kem muối', () => {
    expect(calcUnitPrice(35000, 'S', ['tran-chau'])).toBe(40000);
    expect(calcUnitPrice(35000, 'S', ['kem-muoi'])).toBe(45000);
    expect(calcUnitPrice(35000, 'S', ['tran-chau', 'kem', 'kem-muoi'])).toBe(
      55000,
    );
  });

  it('bỏ qua topping không tồn tại', () => {
    expect(calcUnitPrice(35000, 'S', ['khong-co'])).toBe(35000);
  });

  it('danh sách size và topping hợp lệ khớp với frontend', () => {
    expect(SIZE_VALUES).toEqual(['S', 'M', 'L', 'XL']);
    expect(TOPPING_VALUES).toEqual(['tran-chau', 'kem', 'kem-muoi']);
  });
});
