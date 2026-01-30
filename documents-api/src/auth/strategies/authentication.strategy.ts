import { Injectable } from "@nestjs/common";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { AccessTokenData } from "../interfaces/access-token-data";

@Injectable()
export class AuthenticationStrategy extends PassportStrategy(
  Strategy,
  'authentication',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.ACCESS_TOKEN_SECRET as string,
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
