# 環境設定

このドキュメントでは、NestJSテンプレートの環境設定について説明します。

## 環境変数

アプリケーションは以下の環境変数を使用します：

### 基本設定

| 変数名 | 説明 | デフォルト値 | 必須 |
|--------|------|-------------|------|
| `NODE_ENV` | 実行環境 | `development` | No |
| `PORT` | アプリケーションポート | `3000` | No |
| `LOG_LEVEL` | ログレベル | `info` | No |

### データベース設定

| 変数名 | 説明 | デフォルト値 | 必須 |
|--------|------|-------------|------|
| `DATABASE_URL` | PostgreSQL接続URL | - | Yes |

### OpenTelemetry設定

| 変数名 | 説明 | デフォルト値 | 必須 |
|--------|------|-------------|------|
| `OTEL_SERVICE_NAME` | サービス名 | `nestjs-template` | No |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP エンドポイント | `http://localhost:4317` | No |
| `OTEL_TRACES_ENABLED` | トレーシング有効化 | `true` | No |

### AWS設定（本番環境）

| 変数名 | 説明 | デフォルト値 | 必須 |
|--------|------|-------------|------|
| `AWS_REGION` | AWSリージョン | `ap-northeast-1` | No |
| `AWS_SECRETS_MANAGER_SECRET_NAME` | Secrets Manager シークレット名 | - | Yes (Production) |
| `AWS_XRAY_DAEMON_ADDRESS` | X-Ray デーモンアドレス | - | No |

## 環境別設定ファイル

### 開発環境 (.env)

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nestjs_template_dev?schema=public
LOG_LEVEL=debug
OTEL_TRACES_ENABLED=true
```

### ステージング環境 (.env.staging)

```env
NODE_ENV=staging
PORT=3000
DATABASE_URL=postgresql://user:pass@staging-db:5432/nestjs_template_staging?schema=public
LOG_LEVEL=info
OTEL_TRACES_ENABLED=true
AWS_REGION=ap-northeast-1
```

### 本番環境 (.env.production)

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn
AWS_REGION=ap-northeast-1
AWS_SECRETS_MANAGER_SECRET_NAME=nestjs-template/production
OTEL_TRACES_ENABLED=true
```

## AWS Secrets Manager

本番環境では、機密情報はAWS Secrets Managerから取得されます。以下の値を設定してください：

```json
{
  "DATABASE_URL": "postgresql://user:pass@prod-db:5432/nestjs_template_prod?schema=public",
  "API_KEY": "your-api-key",
  "JWT_SECRET": "your-jwt-secret"
}
```

## 設定の優先順位

1. 環境変数
2. AWS Secrets Manager（本番環境のみ）
3. .env.{NODE_ENV} ファイル
4. .env ファイル
5. デフォルト値

## バリデーション

環境変数は起動時にJoiスキーマによって検証されます。必須の変数が設定されていない場合、アプリケーションは起動に失敗します。