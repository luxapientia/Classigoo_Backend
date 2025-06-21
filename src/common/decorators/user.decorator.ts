import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '../../modules/auth/schemas/user.schema';

interface RequestWithUser extends Request {
  user?: User;
}

export interface JwtPayload {
  user_id: string;
  session: string;
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  }
);
