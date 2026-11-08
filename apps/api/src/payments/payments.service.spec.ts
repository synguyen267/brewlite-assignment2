import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MockGatewayService } from './mock-gateway.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const prisma = {
    order: { findUnique: jest.fn(), update: jest.fn() },
    payment: { findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  };
  const gateway = { charge: jest.fn() };

  const KEY = 'pay-key-0001';
  const pendingOrder = { id: 10, userId: 7, status: 'PENDING', total: 90000 };
  const dto = {
    orderId: 10,
    method: 'WALLET' as const,
    idempotencyKey: KEY,
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MockGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('thanh toán thành công: gọi cổng một lần, ghi Payment và chuyển đơn sang PAID', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    prisma.order.findUnique.mockResolvedValue(pendingOrder);
    gateway.charge.mockResolvedValue(true);
    prisma.$transaction.mockResolvedValue([
      { id: 1, status: 'SUCCESS', amount: 90000 },
      { id: 10, status: 'PAID' },
    ]);

    const result = await service.pay(dto, 7);

    expect(gateway.charge).toHaveBeenCalledTimes(1);
    expect(gateway.charge).toHaveBeenCalledWith({
      amount: 90000,
      method: 'WALLET',
      simulateFailure: undefined,
      idempotencyKey: KEY,
    });
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        orderId: 10,
        amount: 90000,
        method: 'WALLET',
        status: 'SUCCESS',
        idempotencyKey: KEY,
      },
    });
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: 'PAID' },
    });
    expect(result).toEqual({
      paymentId: 1,
      paymentStatus: 'SUCCESS',
      orderId: 10,
      orderStatus: 'PAID',
      amount: 90000,
      replayed: false,
    });
  });

  it('thanh toán thất bại: ghi Payment FAILED và chuyển đơn sang PAYMENT_FAILED', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    prisma.order.findUnique.mockResolvedValue(pendingOrder);
    gateway.charge.mockResolvedValue(false);
    prisma.$transaction.mockResolvedValue([
      { id: 2, status: 'FAILED', amount: 90000 },
      { id: 10, status: 'PAYMENT_FAILED' },
    ]);

    const result = await service.pay({ ...dto, simulateFailure: true }, 7);

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'FAILED' }) as unknown,
    });
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: 'PAYMENT_FAILED' },
    });
    expect(result.paymentStatus).toBe('FAILED');
    expect(result.orderStatus).toBe('PAYMENT_FAILED');
  });

  it('gửi lại cùng khóa: trả kết quả lần đầu, không gọi cổng và không ghi thêm', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 1,
      status: 'SUCCESS',
      amount: 90000,
      order: { id: 10, userId: 7, status: 'PAID' },
    });

    const result = await service.pay(dto, 7);

    expect(result).toEqual({
      paymentId: 1,
      paymentStatus: 'SUCCESS',
      orderId: 10,
      orderStatus: 'PAID',
      amount: 90000,
      replayed: true,
    });
    expect(gateway.charge).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('ném ConflictException khi khóa đã dùng cho giao dịch của người khác', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 1,
      status: 'SUCCESS',
      amount: 90000,
      order: { id: 10, userId: 99, status: 'PAID' },
    });

    await expect(service.pay(dto, 7)).rejects.toThrow(ConflictException);
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('hai yêu cầu cùng khóa đến đồng thời: yêu cầu thua trả lại kết quả của yêu cầu thắng', async () => {
    prisma.payment.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 1,
        status: 'SUCCESS',
        amount: 90000,
        order: { id: 10, userId: 7, status: 'PAID' },
      });
    prisma.order.findUnique.mockResolvedValue(pendingOrder);
    gateway.charge.mockResolvedValue(true);
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await service.pay(dto, 7);

    expect(result.replayed).toBe(true);
    expect(result.paymentId).toBe(1);
  });

  it('ném lại lỗi không phải trùng khóa', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    prisma.order.findUnique.mockResolvedValue(pendingOrder);
    gateway.charge.mockResolvedValue(true);
    prisma.$transaction.mockRejectedValue(new Error('db down'));

    await expect(service.pay(dto, 7)).rejects.toThrow('db down');
  });

  it('ném NotFoundException khi không có đơn của người dùng', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    prisma.order.findUnique.mockResolvedValue(null);

    await expect(service.pay(dto, 7)).rejects.toThrow(NotFoundException);
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('ném ConflictException khi đơn đã thanh toán và khóa là khóa mới', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    prisma.order.findUnique.mockResolvedValue({
      ...pendingOrder,
      status: 'PAID',
    });

    await expect(service.pay(dto, 7)).rejects.toThrow(ConflictException);
    expect(gateway.charge).not.toHaveBeenCalled();
  });
});
