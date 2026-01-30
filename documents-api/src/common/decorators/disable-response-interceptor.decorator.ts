import { applyDecorators, SetMetadata } from "@nestjs/common";

export function DisableResponseInterceptor() {
    return applyDecorators(
        SetMetadata('disable-response-interceptor', true),
    );
}