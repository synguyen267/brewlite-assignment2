import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StaffGuard } from './staff.guard';

function makeGuard(staffEmails: string | undefined) {
  const config = {
    get: jest.fn().mockReturnValue(staffEmails),
  } as unknown as ConfigService;
  return new StaffGuard(config);
}

function makeContext(user?: { id: number; email: string }) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('StaffGuard', () => {
  it('cho đi qua khi email nằm trong danh sách nhân viên', () => {
    const guard = makeGuard('staff@brewlite.vn');

    expect(
      guard.canActivate(makeContext({ id: 1, email: 'staff@brewlite.vn' })),
    ).toBe(true);
  });

  it('không phân biệt hoa thường và khoảng trắng trong danh sách', () => {
    const guard = makeGuard(' Staff@BrewLite.vn , other@brewlite.vn ');

    expect(
      guard.canActivate(makeContext({ id: 1, email: 'staff@brewlite.vn' })),
    ).toBe(true);
  });

  it('từ chối khách hàng không phải nhân viên', () => {
    const guard = makeGuard('staff@brewlite.vn');

    expect(() =>
      guard.canActivate(makeContext({ id: 2, email: 'khach@gmail.com' })),
    ).toThrow(ForbiddenException);
  });

  it('từ chối khi chưa cấu hình danh sách nhân viên hoặc chưa đăng nhập', () => {
    expect(() =>
      makeGuard(undefined).canActivate(
        makeContext({ id: 1, email: 'staff@brewlite.vn' }),
      ),
    ).toThrow(ForbiddenException);

    expect(() =>
      makeGuard('staff@brewlite.vn').canActivate(makeContext(undefined)),
    ).toThrow(ForbiddenException);
  });
});
