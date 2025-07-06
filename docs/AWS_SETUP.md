# AWS セットアップガイド

このドキュメントでは、NestJSテンプレートをAWSにデプロイするために必要なリソースのセットアップ手順を説明します。

## 必要なAWSサービス

- VPC (Virtual Private Cloud)
- ECS (Elastic Container Service) with Fargate
- ECR (Elastic Container Registry)
- RDS (PostgreSQL)
- ALB (Application Load Balancer)
- Secrets Manager
- CloudWatch
- X-Ray
- IAM

## セットアップ手順

### 1. VPC とネットワーキング

#### VPC の作成

```bash
# VPC の作成
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=nestjs-template-vpc}]'
```

#### サブネットの作成

```bash
# パブリックサブネット (AZ-a)
aws ec2 create-subnet \
  --vpc-id <vpc-id> \
  --cidr-block 10.0.1.0/24 \
  --availability-zone ap-northeast-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=nestjs-template-public-1a}]'

# パブリックサブネット (AZ-c)
aws ec2 create-subnet \
  --vpc-id <vpc-id> \
  --cidr-block 10.0.2.0/24 \
  --availability-zone ap-northeast-1c \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=nestjs-template-public-1c}]'

# プライベートサブネット (AZ-a)
aws ec2 create-subnet \
  --vpc-id <vpc-id> \
  --cidr-block 10.0.11.0/24 \
  --availability-zone ap-northeast-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=nestjs-template-private-1a}]'

# プライベートサブネット (AZ-c)
aws ec2 create-subnet \
  --vpc-id <vpc-id> \
  --cidr-block 10.0.12.0/24 \
  --availability-zone ap-northeast-1c \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=nestjs-template-private-1c}]'
```

#### インターネットゲートウェイとNATゲートウェイ

```bash
# インターネットゲートウェイの作成とアタッチ
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=nestjs-template-igw}]'

aws ec2 attach-internet-gateway \
  --vpc-id <vpc-id> \
  --internet-gateway-id <igw-id>

# Elastic IP の割り当て
aws ec2 allocate-address --domain vpc

# NAT ゲートウェイの作成
aws ec2 create-nat-gateway \
  --subnet-id <public-subnet-1a-id> \
  --allocation-id <eip-allocation-id> \
  --tag-specifications 'ResourceType=nat-gateway,Tags=[{Key=Name,Value=nestjs-template-nat}]'
```

### 2. セキュリティグループ

#### ALB用セキュリティグループ

```bash
aws ec2 create-security-group \
  --group-name nestjs-template-alb-sg \
  --description "Security group for ALB" \
  --vpc-id <vpc-id>

# HTTP/HTTPS を許可
aws ec2 authorize-security-group-ingress \
  --group-id <alb-sg-id> \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id <alb-sg-id> \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

#### ECSタスク用セキュリティグループ

```bash
aws ec2 create-security-group \
  --group-name nestjs-template-ecs-sg \
  --description "Security group for ECS tasks" \
  --vpc-id <vpc-id>

# ALBからの通信を許可
aws ec2 authorize-security-group-ingress \
  --group-id <ecs-sg-id> \
  --protocol tcp \
  --port 3000 \
  --source-group <alb-sg-id>
```

#### RDS用セキュリティグループ

```bash
aws ec2 create-security-group \
  --group-name nestjs-template-rds-sg \
  --description "Security group for RDS" \
  --vpc-id <vpc-id>

# ECSタスクからの通信を許可
aws ec2 authorize-security-group-ingress \
  --group-id <rds-sg-id> \
  --protocol tcp \
  --port 5432 \
  --source-group <ecs-sg-id>
```

### 3. RDS PostgreSQL

#### サブネットグループの作成

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name nestjs-template-db-subnet \
  --db-subnet-group-description "Subnet group for RDS" \
  --subnet-ids <private-subnet-1a-id> <private-subnet-1c-id>
```

#### RDSインスタンスの作成

```bash
aws rds create-db-instance \
  --db-instance-identifier nestjs-template-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --allocated-storage 20 \
  --storage-encrypted \
  --master-username postgres \
  --master-user-password <secure-password> \
  --vpc-security-group-ids <rds-sg-id> \
  --db-subnet-group-name nestjs-template-db-subnet \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "Mon:04:00-Mon:05:00" \
  --no-publicly-accessible
```

### 4. Secrets Manager

```bash
# シークレットの作成
aws secretsmanager create-secret \
  --name nestjs-template/production \
  --description "Production secrets for NestJS template" \
  --secret-string '{
    "DATABASE_URL": "postgresql://postgres:<password>@<rds-endpoint>:5432/nestjs_template_prod?schema=public",
    "JWT_SECRET": "<generate-secure-secret>",
    "API_KEY": "<generate-api-key>"
  }'
```

### 5. ECR リポジトリ

```bash
aws ecr create-repository \
  --repository-name nestjs-template \
  --image-scanning-configuration scanOnPush=true \
  --region ap-northeast-1
```

### 6. IAM ロール

#### ECS タスク実行ロール

`ecs-task-execution-role-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

```bash
# ロールの作成
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://ecs-task-execution-role-policy.json

# ポリシーのアタッチ
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

#### ECS タスクロール

```bash
# ロールの作成
aws iam create-role \
  --role-name nestjs-template-task-role \
  --assume-role-policy-document file://ecs-task-execution-role-policy.json

# カスタムポリシーの作成
aws iam create-policy \
  --policy-name nestjs-template-task-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "secretsmanager:GetSecretValue"
        ],
        "Resource": "arn:aws:secretsmanager:ap-northeast-1:*:secret:nestjs-template/*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ],
        "Resource": "*"
      }
    ]
  }'

# ポリシーのアタッチ
aws iam attach-role-policy \
  --role-name nestjs-template-task-role \
  --policy-arn <policy-arn>
```

### 7. CloudWatch ロググループ

```bash
aws logs create-log-group --log-group-name /ecs/nestjs-template
aws logs create-log-group --log-group-name /ecs/xray-daemon
```

### 8. ALB の作成

```bash
# ターゲットグループ
aws elbv2 create-target-group \
  --name nestjs-template-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id <vpc-id> \
  --target-type ip \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

# ロードバランサー
aws elbv2 create-load-balancer \
  --name nestjs-template-alb \
  --subnets <public-subnet-1a-id> <public-subnet-1c-id> \
  --security-groups <alb-sg-id> \
  --scheme internet-facing \
  --type application

# リスナー
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=<target-group-arn>
```

### 9. ECS クラスターとサービス

```bash
# クラスターの作成
aws ecs create-cluster \
  --cluster-name nestjs-template-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1

# タスク定義の登録（task-definition.jsonを作成後）
aws ecs register-task-definition --cli-input-json file://task-definition.json

# サービスの作成
aws ecs create-service \
  --cluster nestjs-template-cluster \
  --service-name nestjs-template-service \
  --task-definition nestjs-template-task:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={
    subnets=[<private-subnet-1a-id>,<private-subnet-1c-id>],
    securityGroups=[<ecs-sg-id>],
    assignPublicIp=DISABLED
  }" \
  --load-balancers "targetGroupArn=<target-group-arn>,containerName=nestjs-template,containerPort=3000" \
  --health-check-grace-period-seconds 60
```

## 推奨事項

1. **マルチAZ構成**: 高可用性のため、最低2つのAZにリソースを配置
2. **自動スケーリング**: ECSサービスとRDSの自動スケーリングを設定
3. **バックアップ**: RDSの自動バックアップとスナップショットを有効化
4. **監視**: CloudWatch アラームを設定してシステムを監視
5. **セキュリティ**: 最小権限の原則に従ってIAMロールを設定

## コスト最適化

1. **Fargate Spot**: 開発環境では Fargate Spot を使用
2. **RDS Reserved Instances**: 本番環境では予約インスタンスを検討
3. **S3 ライフサイクル**: ログの長期保存にはS3を使用し、ライフサイクルポリシーを設定