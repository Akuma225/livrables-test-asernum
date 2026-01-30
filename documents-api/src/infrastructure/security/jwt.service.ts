import { Injectable } from "@nestjs/common";
import jwt, { SignOptions } from "jsonwebtoken";
import { JwtPort } from "src/domain/ports/jwt.port";

@Injectable()
export class JwtService extends JwtPort {
    sign(data: object, duration: string | number, key: string): string {
        const options: SignOptions = { expiresIn: duration as SignOptions["expiresIn"] };
        return jwt.sign(data, key, options);
    }

    verify<T = any>(token: string, key: string): T {
        return jwt.verify(token, key) as T;
    }
}
