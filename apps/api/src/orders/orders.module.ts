import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { StaffOrdersController } from './staff-orders.controller';

@Module({
  imports: [AuthModule],
  controllers: [OrdersController, StaffOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
