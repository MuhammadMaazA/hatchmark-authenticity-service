# Hatchmark Quick Start Guide

This guide will get your Hatchmark Digital Authenticity Service up and running in less than 10 minutes.

## Prerequisites

Before starting, ensure you have:

1. **AWS Account** with programmatic access
2. **AWS CLI** installed and configured
3. **AWS SAM CLI** installed
4. **Docker** installed
5. **Python 3.11+** installed

### Install Missing Tools

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install AWS SAM CLI
pip install aws-sam-cli

# Install Docker (Ubuntu/Debian)
sudo apt update
sudo apt install docker.io
sudo usermod -aG docker $USER
```

### Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and default region
```

## One-Command Setup

For the fastest setup, run our automated setup script:

```bash
python setup.py
```

This script will:
- Check all prerequisites
- Create ECR repository
- Build and push watermarker container
- Deploy all AWS infrastructure
- Set up QLDB tables and indexes
- Display your API endpoints

## Manual Setup (Alternative)

If you prefer to understand each step:

### Step 1: Install Python Dependencies

```bash
cd backend/src
pip install -r requirements.txt
cd ../..

cd watermarker
pip install -r requirements.txt
cd ..
```

### Step 2: Build and Deploy Infrastructure

```bash
# Build the watermarker container
cd watermarker
docker build -t hatchmark-watermarker .
cd ..

# Create ECR repository and push image
aws ecr create-repository --repository-name hatchmark-watermarker
aws ecr get-login-password | docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.<region>.amazonaws.com
docker tag hatchmark-watermarker:latest <your-account-id>.dkr.ecr.<region>.amazonaws.com/hatchmark-watermarker:latest
docker push <your-account-id>.dkr.ecr.<region>.amazonaws.com/hatchmark-watermarker:latest

# Deploy SAM stack
cd backend
sam build
sam deploy --guided
cd ..
```

### Step 3: Setup QLDB Tables

```bash
pip install pyqldb
python scripts/setup_qldb.py
```

## Testing Your Deployment

### Test 1: Upload Endpoint

```bash
# Get your API Gateway URL from the deployment outputs
API_URL="https://your-api-id.execute-api.region.amazonaws.com"

# Test the upload endpoint
curl -X POST "${API_URL}/uploads/initiate" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test-image.jpg"}'
```

Expected response:
```json
{
  "uploadUrl": "https://hatchmark-ingestion-bucket.s3.amazonaws.com/...",
  "objectKey": "uploads/uuid/test-image.jpg"
}
```

### Test 2: Full Workflow

1. **Generate upload URL** (as above)
2. **Upload an image** using the presigned URL:
   ```bash
   curl -X PUT --upload-file your-image.jpg "PRESIGNED_URL_HERE"
   ```
3. **Check Step Functions** in AWS Console for workflow execution
4. **Check S3 processed bucket** for watermarked image
5. **Query QLDB** for registration record

### Test 3: Verification Endpoint

```bash
# Test the verification endpoint
curl -X POST "${API_URL}/verify" \
  -H "Content-Type: image/jpeg" \
  --data-binary @your-image.jpg
```

## Frontend Development

Start the frontend for a complete user experience:

```bash
cd frontend
npm install
npm run dev
```

Update the API base URL in your frontend configuration to point to your deployed API Gateway.

## Monitoring & Troubleshooting

### Check Logs

```bash
# Lambda function logs
aws logs tail /aws/lambda/hatchmark-generate-url --follow
aws logs tail /aws/lambda/hatchmark-hash-function --follow
aws logs tail /aws/lambda/hatchmark-ledger-function --follow

# ECS watermarker logs
aws logs tail /ecs/hatchmark-watermarker --follow

# Step Functions execution history
aws stepfunctions list-executions --state-machine-arn YOUR_STATE_MACHINE_ARN
```

### Common Issues

1. **"AccessDenied" errors**: Check IAM roles and policies
2. **QLDB connection issues**: Ensure pyqldb is installed and ledger exists
3. **Docker build failures**: Check Docker daemon is running
4. **Step Functions not triggering**: Verify S3 event configuration

### Cleanup

To delete all resources:

```bash
# Delete SAM stack
aws cloudformation delete-stack --stack-name hatchmark-dev

# Delete ECR repository
aws ecr delete-repository --repository-name hatchmark-watermarker --force

# Delete QLDB ledger (be careful - this is irreversible!)
aws qldb delete-ledger --name hatchmark-ledger
```

## What's Next?

- **Custom Domain**: Set up a custom domain for your API
- **Authentication**: Integrate AWS Cognito for user management
- **Monitoring**: Set up CloudWatch dashboards and alarms
- **Scaling**: Configure auto-scaling for ECS services
- **Multi-format Support**: Extend to support video and audio files

## Support

- Full documentation: [docs/IMPLEMENTATION_GUIDE.md](docs/IMPLEMENTATION_GUIDE.md)
- Report issues: GitHub Issues
- Community: GitHub Discussions

---

Your Hatchmark Digital Authenticity Service is now running and ready to protect digital content authenticity.
