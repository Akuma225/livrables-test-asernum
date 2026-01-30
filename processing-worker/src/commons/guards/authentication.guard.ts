import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class AuthenticationGuard extends AuthGuard('authentication') {
  handleRequest<TUser = any>(err: any, user: TUser, info: any, context: ExecutionContext): TUser {
    if (err || !user) {
      throw new UnauthorizedException("Vous n'êtes pas autorisé à accéder à cette ressource");
    }
    return user;
  }
}