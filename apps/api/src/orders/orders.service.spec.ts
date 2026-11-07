import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const tx = {
    product: { findMany: jest.fn(), updateMany: jest.fn() },
    order: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(),
    order: { findUnique: jest.fn() },
  };

  const coffee = { id: 1, name: 'Cà phê sữa', price: 35000, stock: 10 };
  const tea = { id: 2, name: 'Trà đào', price: 39000, stock: 10 };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      async (cb: (t: typeof tx) => unknown) => cb(tx),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('create', () => {
    it('tính tổng tiền ở server, trừ tồn kho và tạo đơn trong một transaction', async () => {
      tx.product.findMany.mockResolvedValue([coffee]);
      tx.product.updateMany.mockResolvedValue({ count: 1 });
      tx.order.create.mockResolvedValue({ id: 100 });

      await service.create(
        {
          items: [
            { productId: 1, size: 'M', toppings: ['tran-chau'], qty: 2 },
          ],
        },
        7,
      );

      // 35000 + 5000 (size M) + 5000 (trân châu) = 45000; 2 ly = 90000
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: { id: 1, stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      });
      expect(tx.order.create).toHaveBeenCalledWith({
        data: {
          userId: 7,
          total: 90000,
          items: {
            create: [
              {
                productId: 1,
                size: 'M',
                toppings: ['tran-chau'],
                qty: 2,
                unitPrice: 45000,
                lineTotal: 90000,
              },
            ],
          },
        },
        include: { items: true },
      });
    });

    it('ném BadRequestException và không trừ kho khi sản phẩm không tồn tại', async () => {
      tx.product.findMany.mockResolvedValue([]);

      await expect(
        service.create(
          { items: [{ productId: 99, size: 'S', toppings: [], qty: 1 }] },
          7,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(tx.product.updateMany).not.toHaveBeenCalled();
      expect(tx.order.create).not.toHaveBeenCalled();
    });

    it('ném ConflictException và không tạo đơn khi không đủ hàng', async () => {
      tx.product.findMany.mockResolvedValue([coffee]);
      tx.product.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.create(
          { items: [{ productId: 1, size: 'S', toppings: [], qty: 20 }] },
          7,
        ),
      ).rejects.toThrow(ConflictException);

      expect(tx.order.create).not.toHaveBeenCalled();
    });

    it('gộp số lượng khi cùng một sản phẩm xuất hiện ở nhiều dòng', async () => {
      tx.product.findMany.mockResolvedValue([coffee]);
      tx.product.updateMany.mockResolvedValue({ count: 1 });
      tx.order.create.mockResolvedValue({ id: 101 });

      await service.create(
        {
          items: [
            { productId: 1, size: 'S', toppings: [], qty: 2 },
            { productId: 1, size: 'L', toppings: ['kem'], qty: 3 },
          ],
        },
        7,
      );

      expect(tx.product.updateMany).toHaveBeenCalledTimes(1);
      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: { id: 1, stock: { gte: 5 } },
        data: { stock: { decrement: 5 } },
      });
    });

    it('trừ kho theo thứ tự id tăng dần', async () => {
      tx.product.findMany.mockResolvedValue([coffee, tea]);
      tx.product.updateMany.mockResolvedValue({ count: 1 });
      tx.order.create.mockResolvedValue({ id: 102 });

      await service.create(
        {
          items: [
            { productId: 2, size: 'S', toppings: [], qty: 1 },
            { productId: 1, size: 'S', toppings: [], qty: 1 },
          ],
        },
        7,
      );

      const calledIds = tx.product.updateMany.mock.calls.map(
        (call: [{ where: { id: number } }]) => call[0].where.id,
      );
      expect(calledIds).toEqual([1, 2]);
    });
  });

  describe('findOneForUser', () => {
    it('trả về đơn khi đúng chủ sở hữu', async () => {
      const order = { id: 5, userId: 7, items: [] };
      prisma.order.findUnique.mockResolvedValue(order);

      await expect(service.findOneForUser(5, 7)).resolves.toEqual(order);
    });

    it('ném NotFoundException khi đơn thuộc người dùng khác', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 5, userId: 8 });

      await expect(service.findOneForUser(5, 7)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('ném NotFoundException khi không có đơn', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.findOneForUser(5, 7)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
