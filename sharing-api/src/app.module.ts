import { DynamicModule, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './commons/interceptors/response.interceptor';
import { ConfigModule } from '@nestjs/config';
import { SharingLinkModule } from './resources/sharing-link/sharing-link.module';
import { ViewmodelModule } from '@akuma225/viewmodel';
import { AkumaPaginationModule } from '@akuma225/pagination';
import { prisma } from './libs/prisma/prisma';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthenticationStrategy } from './commons/strategies/authentication.strategy';
import { BullmqModule } from './commons/services/queue/bullmq/bullmq.module';

const viewmodelDynamicModule: DynamicModule = ViewmodelModule.forRoot({
  enableDefaultAudit: true,
  notFoundMessage: 'Ressource introuvable',
  notFoundArrayMessage: 'Aucune ressource trouvée',
}) as unknown as DynamicModule;

@Module({
  imports: [
    ConfigModule.forRoot(),
    JwtModule.register({}),
    PassportModule,
    BullmqModule,

    viewmodelDynamicModule,
    AkumaPaginationModule.forRoot(prisma),

    SharingLinkModule
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor
    },
    AuthenticationStrategy
  ],
})
export class AppModule {}
