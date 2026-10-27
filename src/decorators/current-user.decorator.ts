import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface RequestWithUser {
  currentUser?: unknown;
}

export const CurrentUser = createParamDecorator(
  (_data: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return request.currentUser;
  },
);
