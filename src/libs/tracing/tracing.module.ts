import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TracingService } from './tracing.service';

@Module({
  providers: [TracingService],
  exports: [TracingService],
})
export class TracingModule implements OnModuleInit {
  constructor(
    private tracingService: TracingService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const tracesEnabled = this.configService.get<boolean>('otel.tracesEnabled');
    if (tracesEnabled) {
      await this.tracingService.initialize();
    }
  }
}