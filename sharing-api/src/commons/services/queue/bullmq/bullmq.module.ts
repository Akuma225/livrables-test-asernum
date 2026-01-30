import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { createRedisConnectionOptions } from './bullmq.config';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: createRedisConnectionOptions(),
    }),
  ],
  exports: [BullModule],
})
export class BullmqModule {}

