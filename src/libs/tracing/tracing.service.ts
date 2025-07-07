import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWSXRay from 'aws-xray-sdk-core';

@Injectable()
export class TracingService {
  constructor(private configService: ConfigService) { }

  async initialize() {
    const nodeEnv = this.configService.get<string>('nodeEnv');

    if (nodeEnv === 'production') {
      // Production: Use AWS X-Ray
      this.initializeXRay();
    } else {
      // Development/Staging: Skip tracing setup to avoid compatibility issues
      console.log('Tracing disabled in development mode');
    }
  }

  private initializeXRay() {
    // Configure AWS X-Ray
    AWSXRay.config([
      AWSXRay.plugins.ECSPlugin,
      AWSXRay.plugins.EC2Plugin,
    ]);

    if (process.env.AWS_XRAY_DAEMON_ADDRESS) {
      AWSXRay.setDaemonAddress(process.env.AWS_XRAY_DAEMON_ADDRESS);
    }

    // Enable automatic mode
    AWSXRay.enableAutomaticMode();
  }

  async shutdown() {
    // No-op for now, can be extended later if needed
  }
}
