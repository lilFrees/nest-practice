import { ExecutionContext } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { User } from '../users/user.entity';

const contextWith = (currentUser?: Partial<User> | null) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ session: {}, currentUser }),
    }),
  }) as unknown as ExecutionContext;

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('denies access when there is no current user', () => {
    expect(guard.canActivate(contextWith(undefined))).toBe(false);
    expect(guard.canActivate(contextWith(null))).toBe(false);
  });

  it('denies access when the current user is not an admin', () => {
    expect(guard.canActivate(contextWith({ id: 1, admin: false }))).toBe(false);
  });

  it('allows access when the current user is an admin', () => {
    const admin = { id: 1, admin: true } as unknown as User;
    expect(guard.canActivate(contextWith(admin))).toBe(true);
  });
});
