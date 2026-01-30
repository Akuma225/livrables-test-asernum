import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PasswordEncryptionPort } from "src/domain/ports/password-encryption.port";

@Injectable()
export class PasswordEncryptionService extends PasswordEncryptionPort {
    async hashPassword(password: string, saltRounds: number = 10): Promise<string> {
        return await bcrypt.hash(password, saltRounds);
    }

    async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(password, hashedPassword);
    }
}