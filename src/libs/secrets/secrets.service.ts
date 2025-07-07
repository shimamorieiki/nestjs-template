import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);
  private client: SecretsManagerClient;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('aws.region');
    this.client = new SecretsManagerClient({ region });
  }

  async getSecret(secretName: string): Promise<Record<string, any>> {
    try {
      const command = new GetSecretValueCommand({
        SecretId: secretName,
      });

      const response = await this.client.send(command);

      if (response.SecretString) {
        return JSON.parse(response.SecretString);
      }

      throw new Error('Secret value is not a string');
    } catch (error) {
      this.logger.error(`Error retrieving secret ${secretName}:`, error);
      throw error;
    }
  }

  async loadProductionSecrets(): Promise<void> {
    const nodeEnv = this.configService.get<string>('nodeEnv');
    const secretName = this.configService.get<string>('aws.secretsManager.secretName');

    if (nodeEnv !== 'production' || !secretName) {
      return;
    }

    try {
      const secrets = await this.getSecret(secretName);
      
      // Merge secrets into process.env
      Object.entries(secrets).forEach(([key, value]) => {
        process.env[key] = String(value);
      });

      this.logger.log('Production secrets loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load production secrets:', error);
      // Decide whether to fail startup or continue with defaults
      // throw error; // Uncomment to fail on secret loading error
    }
  }
}