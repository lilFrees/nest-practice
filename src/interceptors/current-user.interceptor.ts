import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class CurrentUserInterceptor implements NestInterceptor {
  constructor(private usersService: UsersService) {}

  async intercept(context: ExecutionContext, next: CallHandler<any>) {
    const request = context.switchToHttp().getRequest<{
      session?: { userId?: number };
      currentUser?: User | null;
    }>();

    const { userId } = request.session || {};

    if (userId) {
      const user = await this.usersService.getUser(userId);
      request.currentUser = user;
    }

    return next.handle();
  }
}
