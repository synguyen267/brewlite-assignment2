export type Size = 'S' | 'M' | 'L' | 'XL';

// Phụ phí theo size và topping. Phải khớp với apps/web/src/lib/pricing.ts.
export const SIZE_EXTRA: Record<Size, number> = {
  S: 0,
  M: 5000,
  L: 10000,
  XL: 15000,
};

export const SIZE_VALUES = Object.keys(SIZE_EXTRA) as Size[];

export const TOPPING_EXTRA: Record<string, number> = {
  'tran-chau': 5000,
  kem: 5000,
  'kem-muoi': 10000,
};

export const TOPPING_VALUES = Object.keys(TOPPING_EXTRA);

export function calcUnitPrice(
  basePrice: number,
  size: Size,
  toppings: string[],
): number {
  const toppingExtra = toppings.reduce(
    (sum, t) => sum + (TOPPING_EXTRA[t] ?? 0),
    0,
  );
  return basePrice + SIZE_EXTRA[size] + toppingExtra;
}
