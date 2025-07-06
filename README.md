# NestJS Template

NestJSを使用したバックエンドサービス開発のための基礎テンプレートです。このテンプレートは、プロダクション対応の設定と最新のベストプラクティスを含んでいます。

## 🚀 特徴

- **NestJS** (Latest LTS) + **TypeScript**
- **Prisma ORM** によるデータベース管理
- **OpenAPI/Swagger** 自動ドキュメント生成
- **OpenTelemetry** による分散トレーシング
- **AWS ECS (Fargate)** デプロイメント対応
- **テスト** (Jest, Supertest, Testcontainers)
- **環境別設定** (.env, AWS Secrets Manager)
- **ログ** (Pino)
- **Docker** サポート

## 📋 必要条件

- Node.js 18.x 以上
- Docker & Docker Compose
- PostgreSQL (Dockerで提供)

## 🛠️ セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-org/nestjs-template.git
cd nestjs-template
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

### 3. 依存関係のインストール

```bash
npm install
```

### 4. データベースとOpenTelemetry Collectorの起動

```bash
docker-compose up -d
```

### 5. データベースマイグレーション

```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

### 6. アプリケーションの起動

```bash
npm run start:dev
```

アプリケーションは `http://localhost:3000` で起動します。
Swagger UIは `http://localhost:3000/docs` でアクセスできます。

## 📚 詳細ドキュメント

- [環境設定](./docs/CONFIGURATION.md)
- [デプロイメント](./docs/DEPLOYMENT.md)
- [テスト戦略](./docs/TESTING.md)
- [OpenTelemetry設定](./docs/TRACING.md)
- [AWS設定](./docs/AWS_SETUP.md)

## 🧪 テスト

```bash
# ユニットテスト
npm test

# E2Eテスト
npm run test:e2e

# 統合テスト（Testcontainersを使用）
npm run test:integration

# カバレッジ付きテスト
npm run test:cov
```

## 📦 ビルドとデプロイ

```bash
# プロダクションビルド
npm run build

# Dockerイメージのビルド
docker build -t nestjs-template .

# ECSへのデプロイ（GitHub Actions経由）
# mainブランチへのプッシュで自動デプロイ
```

## 📝 ライセンス

MIT
