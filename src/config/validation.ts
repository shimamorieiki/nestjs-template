import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  AWS_REGION: Joi.string().default('ap-northeast-1'),
  AWS_SECRETS_MANAGER_SECRET_NAME: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  OTEL_SERVICE_NAME: Joi.string().default('nestjs-template'),
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().default('http://localhost:4317'),
  OTEL_TRACES_ENABLED: Joi.boolean().default(true),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .default('info'),
});