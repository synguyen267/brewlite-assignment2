import { beforeEach, describe, expect, it } from 'vitest';
import {
  cartCount,
  cartTotal,
  itemUnitPrice,
  useCartStore,
  type CartItem,
} from './cart-store';

const coffee = {
  productId: 1,
  name: 'Cà phê sữa',
  imageUrl: '/1.jpg',
  basePrice: 29000,
  size: 'M' as const,
  toppings: ['tran-chau'],
};

const tea = {
  productId: 2,
  name: 'Trà đào',
  imageUrl: '/2.jpg',
  basePrice: 29000,
  size: 'L' as const,
  toppings: ['kem'],
};

const items = () => useCartStore.getState().items;
const actions = () => useCartStore.getState();

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe('Giỏ hàng: thêm món', () => {
  it('thêm một món mới với số lượng mặc định là 1', () => {
    actions().addItem(coffee);

    expect(items()).toHaveLength(1);
    expect(items()[0]).toMatchObject({ productId: 1, size: 'M', qty: 1 });
  });

  it('thêm với số lượng chỉ định', () => {
    actions().addItem(coffee, 3);

    expect(items()[0].qty).toBe(3);
  });

  it('cùng sản phẩm, size và topping thì gộp vào một dòng', () => {
    actions().addItem(coffee, 1);
    actions().addItem(coffee, 2);

    expect(items()).toHaveLength(1);
    expect(items()[0].qty).toBe(3);
  });

  it('thứ tự topping không làm tách dòng', () => {
    actions().addItem({ ...coffee, toppings: ['tran-chau', 'kem'] });
    actions().addItem({ ...coffee, toppings: ['kem', 'tran-chau'] });

    expect(items()).toHaveLength(1);
    expect(items()[0].qty).toBe(2);
  });

  it('khác size thì thành dòng riêng', () => {
    actions().addItem(coffee);
    actions().addItem({ ...coffee, size: 'L' });

    expect(items()).toHaveLength(2);
  });

  it('khác topping thì thành dòng riêng', () => {
    actions().addItem(coffee);
    actions().addItem({ ...coffee, toppings: [] });

    expect(items()).toHaveLength(2);
  });
});

describe('Giỏ hàng: sửa và xóa món', () => {
  it('đổi số lượng của một dòng', () => {
    actions().addItem(coffee);
    const key = items()[0].key;

    actions().setQty(key, 5);

    expect(items()[0].qty).toBe(5);
  });

  it('đặt số lượng về 0 thì xóa dòng đó', () => {
    actions().addItem(coffee);
    actions().addItem(tea);
    const key = items()[0].key;

    actions().setQty(key, 0);

    expect(items()).toHaveLength(1);
    expect(items()[0].productId).toBe(2);
  });

  it('xóa một dòng không ảnh hưởng dòng khác', () => {
    actions().addItem(coffee);
    actions().addItem(tea);
    const key = items()[0].key;

    actions().removeItem(key);

    expect(items()).toHaveLength(1);
    expect(items()[0].productId).toBe(2);
  });

  it('xóa dòng không tồn tại thì giỏ hàng giữ nguyên', () => {
    actions().addItem(coffee);

    actions().removeItem('khong-co');

    expect(items()).toHaveLength(1);
  });

  it('làm trống giỏ hàng', () => {
    actions().addItem(coffee);
    actions().addItem(tea);

    actions().clear();

    expect(items()).toEqual([]);
  });
});

describe('Giỏ hàng: tính tiền', () => {
  it('đơn giá gồm giá gốc, phụ phí size và topping', () => {
    actions().addItem(coffee);

    // 29.000 + 5.000 (size M) + 5.000 (trân châu)
    expect(itemUnitPrice(items()[0])).toBe(39000);
  });

  it('tổng tiền bằng tổng đơn giá nhân số lượng của các dòng', () => {
    actions().addItem(coffee, 2);
    actions().addItem(tea, 1);

    // 39.000 x 2 + (29.000 + 10.000 size L + 5.000 kem) x 1
    expect(cartTotal(items())).toBe(122000);
  });

  it('tổng số ly là tổng số lượng các dòng', () => {
    actions().addItem(coffee, 2);
    actions().addItem(tea, 3);

    expect(cartCount(items())).toBe(5);
  });

  it('giỏ hàng trống: tổng tiền và số ly bằng 0', () => {
    const empty: CartItem[] = [];

    expect(cartTotal(empty)).toBe(0);
    expect(cartCount(empty)).toBe(0);
  });
});
