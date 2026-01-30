import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticationGuard } from '../../auth/guards/authentication.guard';

export function IsUserAuthenticated() {
  return applyDecorators(
    UseGuards(AuthenticationGuard),
    ApiBearerAuth(),
  );
}
