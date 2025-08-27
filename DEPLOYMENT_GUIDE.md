# 🚀 Step-by-Step Deployment Guide

## ⚠️ SECURITY FIRST!
**Before deploying, read [SECURE_DEPLOYMENT.md](./SECURE_DEPLOYMENT.md) to protect your AWS resources!**

---

## Option 1: Quick Demo Deployment (Frontend Only)

Perfect for showcasing the UI and getting started quickly.

### Step 1: Fork and Deploy to Vercel
1. **Fork this repository** to your GitHub account
2. **Go to [Vercel](https://vercel.com)** and sign in with GitHub
3. **Click "New Project"** and select your forked repository
4. **Configure the project:**
   - Framework Preset: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. **Click Deploy**

### Step 2: Access Your Live Demo
- Your app will be live at: `https://your-project-name.vercel.app`
- The demo mode will work with mock data for testing the UI

---

## Option 2: Full Stack Deployment (Vercel + AWS)

For complete functionality including real watermarking and AWS backend.

### Prerequisites
- AWS Account with CLI configured
- Docker installed locally
- Node.js 18+ and Python 3.11+

### Step 1: Deploy Frontend to Vercel
Follow Option 1 steps above, but don't set environment variables yet.

### Step 2: Deploy AWS Backend

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/hatchmark-authenticity-service
cd hatchmark-authenticity-service

# Install AWS CLI and configure
aws configure

# Deploy the infrastructure
cd backend
sam build --use-container
sam deploy --guided
```

**During `sam deploy --guided`:**
- Stack Name: `hatchmark-authenticity-stack`
- AWS Region: `us-east-1` (or your preferred region)
- Confirm changes before deploy: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Save parameters to config file: `Y`

### Step 3: Deploy Watermarker Container

```bash
# Create ECR repository
aws ecr create-repository --repository-name hatchmark-watermarker --image-scanning-configuration scanOnPush=true

# Get your AWS account ID and region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)

# Build and push container
cd ../watermarker

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push
docker build -t hatchmark-watermarker .
docker tag hatchmark-watermarker:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hatchmark-watermarker:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hatchmark-watermarker:latest
```

### Step 4: Configure Vercel Environment Variables

1. **Get your API Gateway URL** from the SAM deployment output
2. **Go to your Vercel project dashboard**
3. **Navigate to Settings → Environment Variables**
4. **Add these variables:**

```
NEXT_PUBLIC_API_GATEWAY_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com
NEXT_PUBLIC_APP_ENV=production
```

5. **Redeploy your Vercel project** to apply the new environment variables

### Step 5: Test End-to-End

1. Visit your Vercel URL
2. Upload an image file
3. Watch the progress as it gets watermarked
4. Check the AWS Console to see:
   - S3 objects in your buckets
   - DynamoDB records
   - Step Function executions
   - Fargate tasks (if watermarking)

---

## 🎯 For Users Who Want to Run Your Project

### Quick Start (Demo Mode)
1. **Visit the live demo:** [Your Vercel URL]
2. **Try uploading an image** to see the UI in action
3. **No setup required** - works immediately

### Full Setup (Development)
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/hatchmark-authenticity-service
cd hatchmark-authenticity-service

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Start local development
npm run frontend:dev
```

### Full Setup (Production)
1. **Deploy to Vercel** using the one-click button
2. **Optional:** Set up AWS backend following the deployment guide
3. **Configure environment variables** in Vercel dashboard

---

## 🔧 Troubleshooting

### Common Issues

**Frontend not building on Vercel:**
- Ensure `package.json` has correct build scripts
- Check Node.js version compatibility
- Verify all dependencies are in `package.json`

**AWS deployment fails:**
- Check AWS CLI configuration: `aws configure list`
- Verify IAM permissions for CloudFormation
- Ensure Docker is running for container builds

**Environment variables not working:**
- Prefix frontend variables with `NEXT_PUBLIC_`
- Redeploy after adding environment variables
- Check variable names match exactly

**API Gateway CORS errors:**
- Verify CORS configuration in SAM template
- Check domain allowlist includes your Vercel domain
- Ensure request headers are properly configured

---

## 🎉 Success Indicators

**Frontend Deployment Success:**
- ✅ Vercel build completes without errors
- ✅ Site loads at your Vercel URL
- ✅ Upload component is functional

**Backend Deployment Success:**
- ✅ SAM deployment completes successfully
- ✅ API Gateway URL is accessible
- ✅ Lambda functions are created
- ✅ DynamoDB table exists

**Full Stack Integration Success:**
- ✅ File upload generates presigned URL
- ✅ Step Functions execute after upload
- ✅ Fargate tasks process watermarking
- ✅ End-to-end workflow completes

---

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review AWS CloudWatch logs for errors
3. Open an issue on the GitHub repository
4. Include error messages and deployment logs

**Happy deploying! 🚀**
