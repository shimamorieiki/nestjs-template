export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  aws: {
    region: process.env.AWS_REGION || 'ap-northeast-1',
    secretsManager: {
      secretName: process.env.AWS_SECRETS_MANAGER_SECRET_NAME,
    },
  },
  otel: {
    serviceName: process.env.OTEL_SERVICE_NAME || 'nestjs-template',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
    tracesEnabled: process.env.OTEL_TRACES_ENABLED === 'true',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
});