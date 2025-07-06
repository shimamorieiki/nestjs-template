# OpenTelemetry トレーシング設定

このドキュメントでは、NestJSテンプレートのOpenTelemetryトレーシング設定について説明します。

## 概要

OpenTelemetryは、アプリケーションのパフォーマンスモニタリングとトレーシングのための標準化されたフレームワークです。

### 環境別の設定

- **開発/ステージング**: OTLP経由でOpenTelemetry Collectorに送信
- **本番**: AWS X-Rayに直接送信

## ローカル開発環境

### 1. OpenTelemetry Collector の起動

```bash
docker-compose up -d otel-collector
```

### 2. 環境変数の設定

```env
OTEL_SERVICE_NAME=nestjs-template
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_TRACES_ENABLED=true
```

### 3. トレースの確認

zpages で確認: `http://localhost:55679/debug/tracez`

## 本番環境 (AWS X-Ray)

### 1. IAM ロールの設定

ECSタスクロールに以下のポリシーをアタッチ：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. ECS タスク定義

X-Ray デーモンをサイドカーコンテナとして追加：

```json
{
  "name": "xray-daemon",
  "image": "public.ecr.aws/xray/aws-xray-daemon:latest",
  "cpu": 32,
  "memoryReservation": 256,
  "portMappings": [
    {
      "containerPort": 2000,
      "protocol": "udp"
    }
  ],
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/xray-daemon",
      "awslogs-region": "ap-northeast-1",
      "awslogs-stream-prefix": "ecs"
    }
  }
}
```

### 3. 環境変数

```env
NODE_ENV=production
AWS_XRAY_DAEMON_ADDRESS=localhost:2000
```

## カスタムスパンの作成

### 基本的な使用方法

```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export class MyService {
  private tracer = trace.getTracer('my-service');

  async processData(data: any): Promise<void> {
    const span = this.tracer.startSpan('processData');
    
    try {
      // スパン属性の追加
      span.setAttributes({
        'data.size': data.length,
        'data.type': typeof data,
      });

      // 処理の実行
      const result = await this.heavyComputation(data);
      
      // イベントの記録
      span.addEvent('computation completed', {
        'result.size': result.length,
      });

      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      throw error;
    } finally {
      span.end();
    }
  }
}
```

### デコレーターの使用

```typescript
import { Injectable } from '@nestjs/common';
import { Span } from '@libs/tracing/decorators';

@Injectable()
export class UserService {
  @Span('UserService.findById')
  async findById(id: string): Promise<User> {
    // メソッドは自動的にトレースされます
    return this.prisma.user.findUnique({ where: { id } });
  }
}
```

## 自動計装

以下のライブラリは自動的に計装されます：

- HTTP (Express)
- Prisma
- AWS SDK
- gRPC

## トレースの分析

### AWS X-Ray コンソール

1. サービスマップでアプリケーションの全体像を確認
2. トレースリストで個別のリクエストを分析
3. アノマリー検出でパフォーマンス問題を特定

### カスタムセグメント

```typescript
// AWS X-Ray 専用のカスタムセグメント
import * as AWSXRay from 'aws-xray-sdk-core';

const segment = AWSXRay.getSegment();
const subsegment = segment.addNewSubsegment('CustomOperation');

try {
  // カスタム処理
  subsegment.addAnnotation('userId', userId);
  subsegment.addMetadata('request', requestData);
} catch (error) {
  subsegment.addError(error);
} finally {
  subsegment.close();
}
```

## パフォーマンス最適化

### サンプリング

本番環境でのサンプリングルール：

```json
{
  "version": 2,
  "default": {
    "fixed_target": 1,
    "rate": 0.1
  },
  "rules": [
    {
      "description": "Health checks",
      "service_name": "*",
      "http_method": "GET",
      "url_path": "/health*",
      "fixed_target": 0,
      "rate": 0
    }
  ]
}
```

### バッチング

トレースは自動的にバッチ処理されて送信されます：

- バッチサイズ: 1024
- タイムアウト: 1秒

## トラブルシューティング

### トレースが表示されない

1. 環境変数 `OTEL_TRACES_ENABLED` が `true` に設定されているか確認
2. ネットワーク接続を確認（Collectorまたは X-Ray デーモン）
3. IAM 権限を確認（本番環境）

### パフォーマンスへの影響

トレーシングのオーバーヘッドを最小化：

1. 本番環境では適切なサンプリングレートを設定
2. 大きなペイロードをメタデータに含めない
3. 高頻度のループ内でスパンを作成しない