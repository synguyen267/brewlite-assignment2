import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MockGatewayService } from './mock-gateway.service';

type PaymentResult = {
  paymentId: number;
  paymentStatus: string;
  orderId: number;
  orderStatus: string;
  amount: number;
  replayed: boolean;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: MockGatewayService,
  ) {}

  async pay(dto: CreatePaymentDto, userId: number): Promise<PaymentResult> {
    // Gửi lại cùng một khóa thì trả kết quả của lần đầu, không gọi cổng thanh toán nữa.
    const replay = await this.findReplay(dto.idempotencyKey, userId);
    if (replay) return replay;

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId, userId },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    if (order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED') {
      throw new ConflictException(
        `Đơn đang ở trạng thái ${order.status}, không thể thanh toán`,
      );
    }

    const ok = await this.gateway.charge({
      amount: order.total,
      method: dto.method,
      simulateFailure: dto.simulateFailure,
      idempotencyKey: dto.idempotencyKey,
    });

    try {
      const [payment, updated] = await this.prisma.$transaction([
        this.prisma.payment.create({
          data: {
            orderId: order.id,
            amount: order.total,
            method: dto.method,
            status: ok ? 'SUCCESS' : 'FAILED',
            idempotencyKey: dto.idempotencyKey,
          },
        }),
        this.prisma.order.update({
          where: { id: order.id },
          data: { status: ok ? 'PAID' : 'PAYMENT_FAILED' },
        }),
      ]);
      return this.toResult(payment, updated, false);
    } catch (err) {
      // Hai yêu cầu cùng khóa đến gần như đồng thời: yêu cầu thua bị ràng buộc
      // unique chặn, trả lại kết quả của yêu cầu thắng.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.findReplay(dto.idempotencyKey, userId);
        if (existing) return existing;
      }
      throw err;
    }
  }

  private async findReplay(
    idempotencyKey: string,
    userId: number,
  ): Promise<PaymentResult | null> {
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
      include: { order: true },
    });
    if (!existing) return null;
    if (existing.order.userId !== userId) {
      throw new ConflictException(
        'Khóa idempotency đã được dùng cho một giao dịch khác',
      );
    }
    return this.toResult(existing, existing.order, true);
  }

  private toResult(
    payment: { id: number; status: string; amount: number },
    order: { id: number; status: string },
    replayed: boolean,
  ): PaymentResult {
    return {
      paymentId: payment.id,
      paymentStatus: payment.status,
      orderId: order.id,
      orderStatus: order.status,
      amount: payment.amount,
      replayed,
    };
  }
}
