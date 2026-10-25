import { Global, Module } from '@nestjs/common';
import { REALTIME_PUBLISHER } from '../../application/ports/realtime-publisher.port';
import { InMemoryRealtimeHub } from './in-memory-realtime-hub';
import { RealtimeController } from './realtime.controller';

@Global()
@Module({
  controllers: [RealtimeController],
  providers: [
    InMemoryRealtimeHub,
    { provide: REALTIME_PUBLISHER, useExisting: InMemoryRealtimeHub },
  ],
  exports: [REALTIME_PUBLISHER],
})
export class RealtimeModule {}
