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
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
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

  describe('findAllForUser', () => {
    it('lấy đơn của đúng người dùng, mới nhất trước', async () => {
      prisma.order.findMany.mockResolvedValue([{ id: 2 }, { id: 1 }]);

      const result = await service.findAllForUser(7);

      expect(result).toEqual([{ id: 2 }, { id: 1 }]);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 7 },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }) as unknown,
      );
    });
  });

  describe('findActive', () => {
    it('chỉ lấy đơn đã thanh toán và chưa giao, cũ nhất trước', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await service.findActive();

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['PAID', 'PREPARING', 'READY'] } },
          orderBy: { createdAt: 'asc' },
        }) as unknown,
      );
    });
  });

  describe('updateStatus', () => {
    it('chuyển PAID sang PREPARING', async () => {
      prisma.order.findUnique
        .mockResolvedValueOnce({ id: 5, status: 'PAID' })
        .mockResolvedValueOnce({ id: 5, status: 'PREPARING' });
      prisma.order.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.updateStatus(5, 'PREPARING');

      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 5, status: 'PAID' },
        data: { status: 'PREPARING' },
      });
      expect(result).toEqual({ id: 5, status: 'PREPARING' });
    });

    it('từ chối chuyển nhảy bước (PAID sang COMPLETED)', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 5, status: 'PAID' });

      await expect(service.updateStatus(5, 'COMPLETED')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('từ chối khi đơn chưa thanh toán', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 5, status: 'PENDING' });

      await expect(service.updateStatus(5, 'PREPARING')).rejects.toThrow(
        ConflictException,
      );
    });

    it('ném NotFoundException khi không có đơn', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus(5, 'PREPARING')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('ném ConflictException khi trạng thái đã bị đổi bởi người khác', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 5, status: 'PAID' });
      prisma.order.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.updateStatus(5, 'PREPARING')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
