import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  orderId!: number;

  @IsIn(['WALLET', 'CARD'])
  method!: 'WALLET' | 'CARD';

  /**
   * Khóa định danh cho một lần thanh toán. Client sinh một khóa mới cho mỗi
   * lần người dùng bấm thanh toán và gửi lại đúng khóa đó khi gửi lại yêu cầu
   * (mất mạng, bấm hai lần). Muốn thử thanh toán lại sau khi thất bại thì dùng
   * khóa mới.
   */
  @IsString()
  @Length(8, 64)
  idempotencyKey!: string;

  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}
