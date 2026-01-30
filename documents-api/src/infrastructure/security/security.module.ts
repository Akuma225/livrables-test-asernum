import { Module } from "@nestjs/common";
import { PasswordEncryptionService } from "./password-encryption.service";
import { JwtService } from "./jwt.service";
import { PasswordEncryptionPort } from "src/domain/ports/password-encryption.port";
import { JwtPort } from "src/domain/ports/jwt.port";

@Module({
    providers: [
        PasswordEncryptionService,
        JwtService,
        {
            provide: PasswordEncryptionPort,
            useExisting: PasswordEncryptionService,
        },
        {
            provide: JwtPort,
            useExisting: JwtService,
        },
    ],
    exports: [PasswordEncryptionService, JwtService, PasswordEncryptionPort, JwtPort],
})
export class SecurityModule {}
