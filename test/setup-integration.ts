import { PostgreSqlContainer } from '@testcontainers/postgresql';

let postgresContainer: any;

beforeAll(async () => {
  postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('test_db')
    .withUsername('test_user')
    .withPassword('test_password')
    .start();

  // Set DATABASE_URL for Prisma
  process.env.DATABASE_URL = postgresContainer.getConnectionUri();
  
  // Run Prisma migrations
  const { execSync } = require('child_process');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}, 60000);

afterAll(async () => {
  if (postgresContainer) {
    await postgresContainer.stop();
  }
});