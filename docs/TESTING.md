# テスト戦略

このドキュメントでは、NestJSテンプレートのテスト戦略について説明します。

## テストの種類

### 1. ユニットテスト

個々のサービス、コントローラー、その他のコンポーネントを独立してテストします。

```bash
npm test
```

#### 例: サービスのテスト

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../database/prisma.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create a user', async () => {
    const userData = { email: 'test@example.com', name: 'Test User' };
    const expectedUser = { id: '1', ...userData };

    jest.spyOn(prisma.user, 'create').mockResolvedValue(expectedUser);

    const result = await service.create(userData);
    expect(result).toEqual(expectedUser);
  });
});
```

### 2. E2E テスト

HTTPリクエストレベルでアプリケーション全体をテストします。

```bash
npm run test:e2e
```

#### 例: APIエンドポイントのテスト

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('UserController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/users (POST)', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'test@example.com',
        name: 'Test User',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.email).toBe('test@example.com');
      });
  });
});
```

### 3. 統合テスト

Testcontainersを使用して、実際のPostgreSQLデータベースでテストします。

```bash
npm run test:integration
```

#### Testcontainers のセットアップ

```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';

let postgresContainer;

beforeAll(async () => {
  postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('test_db')
    .withUsername('test_user')
    .withPassword('test_password')
    .start();

  process.env.DATABASE_URL = postgresContainer.getConnectionUri();
});

afterAll(async () => {
  await postgresContainer.stop();
});
```

## テストのベストプラクティス

### 1. テストの独立性

各テストは他のテストに依存せず、独立して実行できるようにします。

### 2. データのクリーンアップ

```typescript
afterEach(async () => {
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
});
```

### 3. モックの使用

外部サービスや重い処理はモックを使用します。

```typescript
jest.mock('../external-api/client', () => ({
  ExternalApiClient: jest.fn().mockImplementation(() => ({
    fetchData: jest.fn().mockResolvedValue({ data: 'mocked' }),
  })),
}));
```

### 4. テストデータの生成

```typescript
// test/factories/user.factory.ts
export const createTestUser = (overrides = {}) => ({
  email: 'test@example.com',
  name: 'Test User',
  ...overrides,
});
```

## カバレッジ

コードカバレッジレポートを生成：

```bash
npm run test:cov
```

目標カバレッジ：
- ステートメント: 80%
- ブランチ: 75%
- 関数: 80%
- 行: 80%

## CI/CD でのテスト

GitHub Actions でのテスト実行：

```yaml
- name: Run tests
  run: |
    npm test -- --coverage
    npm run test:e2e
```

## デバッグ

### VSCode でのデバッグ設定

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Jest Tests",
      "runtimeArgs": [
        "--inspect-brk",
        "${workspaceRoot}/node_modules/.bin/jest",
        "--runInBand"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## パフォーマンステスト

大規模なデータセットでのパフォーマンスを確認：

```typescript
it('should handle large datasets efficiently', async () => {
  const users = Array.from({ length: 1000 }, (_, i) => ({
    email: `user${i}@example.com`,
    name: `User ${i}`,
  }));

  const start = Date.now();
  await service.createMany(users);
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(5000); // 5秒以内
});
```