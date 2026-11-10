import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

declare global {
  namespace Express {
    interface Request {
      currentUser?: User | null;
    }
  }
}

@Injectable()
export class CurrentUserMiddleware implements NestMiddleware {
  constructor(private usersService: UsersService) {}

  async use(req: Request, _res: Response, next: (error?: any) => void) {
    const { userId } = req.session || {};

    if (userId) {
      const user = await this.usersService.getUser(userId as number);
      req.currentUser = user;
    }

    next();
  }
}
