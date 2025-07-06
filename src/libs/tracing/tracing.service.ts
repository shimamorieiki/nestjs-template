import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import * as AWSXRay from 'aws-xray-sdk-core';

@Injectable()
export class TracingService {
  private sdk: NodeSDK;

  constructor(private configService: ConfigService) {}

  async initialize() {
    const serviceName = this.configService.get<string>('otel.serviceName');
    const nodeEnv = this.configService.get<string>('nodeEnv');

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '0.0.1',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: nodeEnv,
    });

    if (nodeEnv === 'production') {
      // Production: Use AWS X-Ray
      this.initializeXRay();
    } else {
      // Development/Staging: Use OTLP
      const endpoint = this.configService.get<string>('otel.endpoint');
      const exporter = new OTLPTraceExporter({
        url: endpoint,
      });

      this.sdk = new NodeSDK({
        resource,
        traceExporter: exporter,
        spanProcessor: new BatchSpanProcessor(exporter),
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': {
              enabled: false,
            },
          }),
        ],
      });

      await this.sdk.start();
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
    if (this.sdk) {
      await this.sdk.shutdown();
    }
  }
}