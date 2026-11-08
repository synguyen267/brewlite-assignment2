import { Injectable } from '@nestjs/common';

@Injectable()
export class MockGatewayService {
  // Mô phỏng cổng thanh toán. Cổng thật thường nhận thêm idempotencyKey để tự
  // chống trừ tiền hai lần, nên khóa được truyền xuống ở đây dù bản mô phỏng
  // không dùng tới.
  async charge(input: {
    amount: number;
    method: 'WALLET' | 'CARD';
    simulateFailure?: boolean;
    idempotencyKey?: string;
  }): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return !input.simulateFailure;
  }
}
