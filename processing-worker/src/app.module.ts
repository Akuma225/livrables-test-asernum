import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthenticationStrategy } from './commons/strategies/authentication.strategy';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './commons/interceptors/response.interceptor';
import { DocumentProcessingModule } from './resources/document-processing/document-processing.module';
import { KafkaModule } from './commons/services/messaging/kafka/kafka.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({}),

    DocumentProcessingModule,
    KafkaModule,
  ],
  controllers: [],
  providers: [
    AuthenticationStrategy,

    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor
    }
  ],
})
export class AppModule {}
