export type Product = {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
};

export type OrderLine = {
  productId: number;
  size: string;
  toppings: string[];
  qty: number;
};

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PAYMENT_FAILED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type OrderItemView = {
  id: number;
  productId: number;
  size: string;
  toppings: string[];
  qty: number;
  unitPrice: number;
  lineTotal: number;
  product?: { name: string; imageUrl: string };
};

export type OrderView = {
  id: number;
  status: OrderStatus;
  total: number;
  createdAt: string;
  items: OrderItemView[];
};

export type PaymentMethod = 'WALLET' | 'CARD';

export type PaymentInput = {
  orderId: number;
  method: PaymentMethod;
  idempotencyKey: string;
  simulateFailure?: boolean;
};

export type PaymentResult = {
  paymentId: number;
  paymentStatus: 'SUCCESS' | 'FAILED';
  orderId: number;
  orderStatus: OrderStatus;
  amount: number;
  replayed: boolean;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function readError(res: Response, fallback: string) {
  try {
    const body = await res.json();
    const msg = body?.message;
    return Array.isArray(msg) ? msg.join(', ') : (msg ?? fallback);
  } catch {
    return fallback;
  }
}

async function authedJson<T>(
  token: string,
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new ApiError(await readError(res, fallback), res.status);
  }
  return res.json() as Promise<T>;
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products`);
  if (!res.ok) throw new Error('Không tải được danh sách sản phẩm');
  return res.json();
}

export async function fetchProduct(id: number): Promise<Product> {
  const res = await fetch(`${API_URL}/products/${id}`);
  if (res.status === 404) throw new Error('Không tìm thấy sản phẩm');
  if (!res.ok) throw new Error('Không tải được sản phẩm');
  return res.json();
}

export async function registerUser(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new ApiError(await readError(res, 'Đăng ký thất bại'), res.status);
  }
  return res.json();
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ accessToken: string; user: { id: number; email: string } }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new ApiError(await readError(res, 'Đăng nhập thất bại'), res.status);
  }
  return res.json();
}

export async function createOrder(
  token: string,
  items: OrderLine[],
): Promise<{ id: number; status: string; total: number }> {
  return authedJson(
    token,
    '/orders',
    { method: 'POST', body: JSON.stringify({ items }) },
    'Không tạo được đơn',
  );
}

export function fetchOrders(token: string): Promise<OrderView[]> {
  return authedJson(token, '/orders', {}, 'Không tải được lịch sử đơn');
}

export function fetchOrder(token: string, id: number): Promise<OrderView> {
  return authedJson(token, `/orders/${id}`, {}, 'Không tải được đơn hàng');
}

export function payOrder(
  token: string,
  input: PaymentInput,
): Promise<PaymentResult> {
  return authedJson(
    token,
    '/payments',
    { method: 'POST', body: JSON.stringify(input) },
    'Thanh toán không thành công',
  );
}
