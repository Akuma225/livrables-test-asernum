import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { AccessTokenData } from "../interfaces/access-token-data";

@Injectable()
export class AuthenticationStrategy extends PassportStrategy(
  Strategy,
  'authentication',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('ACCESS_TOKEN_SECRET'),
    });
  }

  async validate(payload: any): Promise<AccessTokenData> {
    return {
      sub: payload.sub,
      email: payload.email,
      firstname: payload.firstname,
      lastname: payload.lastname,
      type: "access",
    };
  }
}
