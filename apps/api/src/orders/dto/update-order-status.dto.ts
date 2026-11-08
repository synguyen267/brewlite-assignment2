import { IsIn } from 'class-validator';

// Nhân viên chỉ được đặt các trạng thái xử lý đơn; trạng thái liên quan thanh
// toán do hệ thống quản lý.
export const STAFF_SETTABLE_STATUSES = [
  'PREPARING',
  'READY',
  'COMPLETED',
] as const;

export class UpdateOrderStatusDto {
  @IsIn(STAFF_SETTABLE_STATUSES)
  status!: (typeof STAFF_SETTABLE_STATUSES)[number];
}
