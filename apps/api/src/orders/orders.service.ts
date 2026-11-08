import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { calcUnitPrice } from './pricing';

// Các trạng thái đơn mà nhân viên được phép chuyển tiếp. Đơn chưa thanh toán
// (PENDING, PAYMENT_FAILED) và đơn đã kết thúc không chuyển tiếp được.
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [],
  PAYMENT_FAILED: [],
  PAID: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

const ACTIVE_STATUSES: OrderStatus[] = ['PAID', 'PREPARING', 'READY'];

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo đơn hàng trong một transaction:
   * 1. Đọc sản phẩm và tính lại giá ở server (không tin giá từ client).
   * 2. Trừ tồn kho bằng cập nhật có điều kiện (stock >= số lượng cần).
   * 3. Ghi đơn hàng và các dòng hàng.
   * Nếu bất kỳ bước nào lỗi (sản phẩm không tồn tại, hết hàng) thì toàn bộ
   * thay đổi được hoàn tác.
   */
  async create(dto: CreateOrderDto, userId?: number) {
    return this.prisma.$transaction(async (tx) => {
      const ids = [...new Set(dto.items.map((i) => i.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: ids } },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      const items = dto.items.map((i) => {
        const product = byId.get(i.productId);
        if (!product) {
          throw new BadRequestException(
            `Sản phẩm ${i.productId} không tồn tại`,
          );
        }
        const unitPrice = calcUnitPrice(product.price, i.size, i.toppings);
        return {
          productId: i.productId,
          size: i.size,
          toppings: i.toppings,
          qty: i.qty,
          unitPrice,
          lineTotal: unitPrice * i.qty,
        };
      });

      const total = items.reduce((sum, i) => sum + i.lineTotal, 0);

      // Một sản phẩm có thể xuất hiện ở nhiều dòng (khác size/topping),
      // nên gộp số lượng theo sản phẩm trước khi trừ kho.
      const qtyByProduct = new Map<number, number>();
      for (const i of dto.items) {
        qtyByProduct.set(
          i.productId,
          (qtyByProduct.get(i.productId) ?? 0) + i.qty,
        );
      }

      // Trừ kho theo thứ tự id tăng dần để hai đơn đồng thời không khóa chéo nhau.
      const needs = [...qtyByProduct.entries()].sort((a, b) => a[0] - b[0]);
      for (const [productId, qty] of needs) {
        const { count } = await tx.product.updateMany({
          where: { id: productId, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (count === 0) {
          const name = byId.get(productId)?.name ?? `#${productId}`;
          throw new ConflictException(`Sản phẩm "${name}" không đủ hàng`);
        }
      }

      return tx.order.create({
        data: { userId, total, items: { create: items } },
        include: { items: true },
      });
    });
  }

  async findOneForUser(id: number, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { name: true, imageUrl: true } } },
        },
      },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return order;
  }

  /** Lịch sử đơn của khách, mới nhất trước. */
  async findAllForUser(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        items: {
          include: { product: { select: { name: true, imageUrl: true } } },
        },
      },
    });
  }

  /** Hàng đợi của nhân viên: các đơn đã thanh toán và chưa giao, cũ nhất trước. */
  async findActive() {
    return this.prisma.order.findMany({
      where: { status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { email: true } },
        items: {
          include: { product: { select: { name: true, imageUrl: true } } },
        },
      },
    });
  }

  /** Nhân viên chuyển trạng thái đơn theo đúng thứ tự cho phép. */
  async updateStatus(id: number, next: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    if (!ORDER_TRANSITIONS[order.status].includes(next)) {
      throw new ConflictException(
        `Không thể chuyển đơn từ ${order.status} sang ${next}`,
      );
    }

    // Cập nhật có điều kiện để hai nhân viên bấm cùng lúc không ghi đè nhau.
    const { count } = await this.prisma.order.updateMany({
      where: { id, status: order.status },
      data: { status: next },
    });
    if (count === 0) {
      throw new ConflictException(
        'Trạng thái đơn vừa được thay đổi, hãy tải lại',
      );
    }
    return this.prisma.order.findUnique({ where: { id } });
  }
}
