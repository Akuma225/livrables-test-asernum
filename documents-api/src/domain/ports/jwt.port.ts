export abstract class JwtPort {
    abstract sign(data: object, duration: string | number, key: string): string;
    abstract verify<T = any>(token: string, key: string): T;
}
