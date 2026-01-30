export interface AccessTokenData {
    sub: string;
    email: string;
    firstname: string;
    lastname: string;
    type: "access" | "refresh";
}