import { Module } from '@nestjs/common';
import { RightsService } from './rights.service';
import { RightsGuard } from 'src/common/authorization/rights.guard';

@Module({
  providers: [RightsService, RightsGuard],
  exports: [RightsService, RightsGuard],
})
export class AuthorizationModule {}

