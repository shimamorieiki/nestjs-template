# デプロイメント

このドキュメントでは、NestJSテンプレートをAWS ECS (Fargate)にデプロイする方法について説明します。

## 前提条件

- AWS アカウント
- AWS CLI がインストールされ、設定済み
- Docker がインストール済み
- GitHub リポジトリへのアクセス権限

## AWS リソースのセットアップ

### 1. ECR リポジトリの作成

```bash
aws ecr create-repository --repository-name nestjs-template --region ap-northeast-1
```

### 2. VPC とネットワーキング

既存のVPCを使用するか、新しいVPCを作成します：

- パブリックサブネット（ALB用）
- プライベートサブネット（ECS タスク用）
- NAT ゲートウェイ
- セキュリティグループ

### 3. RDS PostgreSQL インスタンス

```bash
aws rds create-db-instance \
  --db-instance-identifier nestjs-template-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username postgres \
  --master-user-password <password> \
  --allocated-storage 20 \
  --vpc-security-group-ids <security-group-id> \
  --db-subnet-group-name <subnet-group-name>
```

### 4. ECS クラスターの作成

```bash
aws ecs create-cluster --cluster-name nestjs-template-cluster
```

### 5. タスク定義

`ecs-task-definition.json` を作成：

```json
{
  "family": "nestjs-template-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "nestjs-template",
      "image": "YOUR_ECR_URI/nestjs-template:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "AWS_REGION",
          "value": "ap-northeast-1"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:YOUR_ACCOUNT_ID:secret:nestjs-template/production:DATABASE_URL::"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/nestjs-template",
          "awslogs-region": "ap-northeast-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

### 6. ALB の作成

```bash
# ターゲットグループの作成
aws elbv2 create-target-group \
  --name nestjs-template-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id <vpc-id> \
  --target-type ip \
  --health-check-path /health

# ロードバランサーの作成
aws elbv2 create-load-balancer \
  --name nestjs-template-alb \
  --subnets <public-subnet-1> <public-subnet-2> \
  --security-groups <alb-security-group-id>
```

### 7. ECS サービスの作成

```bash
aws ecs create-service \
  --cluster nestjs-template-cluster \
  --service-name nestjs-template-service \
  --task-definition nestjs-template-task:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<private-subnet-1>,<private-subnet-2>],securityGroups=[<task-security-group-id>],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=<target-group-arn>,containerName=nestjs-template,containerPort=3000"
```

## GitHub Actions によるCI/CD

`.github/workflows/deploy.yml` ファイルを作成して、自動デプロイを設定します。

### 必要なGitHub Secrets

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## 手動デプロイ

### 1. Docker イメージのビルド

```bash
docker build -t nestjs-template .
```

### 2. ECR へのプッシュ

```bash
# ECR ログイン
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin YOUR_ECR_URI

# タグ付け
docker tag nestjs-template:latest YOUR_ECR_URI/nestjs-template:latest

# プッシュ
docker push YOUR_ECR_URI/nestjs-template:latest
```

### 3. サービスの更新

```bash
aws ecs update-service \
  --cluster nestjs-template-cluster \
  --service nestjs-template-service \
  --force-new-deployment
```

## モニタリング

### CloudWatch Logs

アプリケーションログは `/ecs/nestjs-template` ロググループに保存されます。

### X-Ray トレーシング

本番環境では、トレースは自動的にAWS X-Rayに送信されます。

### CloudWatch メトリクス

ECS サービスのメトリクスは CloudWatch で確認できます。

## トラブルシューティング

### タスクが起動しない

1. CloudWatch Logs でエラーを確認
2. タスクロールに必要な権限があるか確認
3. セキュリティグループの設定を確認

### データベース接続エラー

1. RDS のセキュリティグループがECSタスクからの接続を許可しているか確認
2. Secrets Manager の設定が正しいか確認
3. VPC のルーティングを確認