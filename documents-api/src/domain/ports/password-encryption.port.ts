export abstract class PasswordEncryptionPort {
    abstract hashPassword(password: string, saltRounds?: number): Promise<string>;
    abstract comparePassword(password: string, hashedPassword: string): Promise<boolean>;
}
