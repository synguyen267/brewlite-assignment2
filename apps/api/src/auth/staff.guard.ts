import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from './auth.types';

/**
 * Chỉ cho nhân viên đi qua. Nhân viên được khai báo trong biến môi trường
 * STAFF_EMAILS (danh sách email, cách nhau bằng dấu phẩy). Guard này phải chạy
 * sau AuthGuard để req.user đã có.
 */
@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();

    const staff = (this.config.get<string>('STAFF_EMAILS') ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const email = req.user?.email.toLowerCase();

    if (!email || !staff.includes(email)) {
      throw new ForbiddenException(
        'Chỉ nhân viên mới được thực hiện thao tác này',
      );
    }
    return true;
  }
}
