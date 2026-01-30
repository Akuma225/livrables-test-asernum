import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticationGuard } from 'src/auth/guards/authentication.guard';
import { RIGHTS_RULES_METADATA_KEY, RightRule } from 'src/common/authorization/rights.types';
import { RightsGuard } from 'src/common/authorization/rights.guard';

/**
 * Protège une route via:
 * - Auth (JWT bearer)
 * - Vérification de droits (ownership aujourd'hui)
 *
 * Exemple:
 * @Authorize([{ action: RightAction.READ, resource: RightResource.DOCUMENT }])
 */
export function Authorize(rules: RightRule[] = []) {
  return applyDecorators(
    SetMetadata(RIGHTS_RULES_METADATA_KEY, rules),
    UseGuards(AuthenticationGuard, RightsGuard),
    ApiBearerAuth(),
  );
}

