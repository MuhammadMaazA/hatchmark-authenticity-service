# 🔐 How Vercel Securely Handles Your AWS Credentials

## ❌ What's NOT Secure:
- Putting credentials in code files
- Committing .env files to Git
- Hardcoding API keys in frontend

## ✅ What IS Secure (Vercel Method):

### Step 1: Set Environment Variables in Vercel Dashboard

1. **Go to [vercel.com](https://vercel.com)**
2. **Log in and select your project**
3. **Go to Settings → Environment Variables**
4. **Add these variables ONE BY ONE:**

```
Variable Name: VITE_API_URL
Value: https://your-api-gateway.amazonaws.com/prod
Environment: Production

Variable Name: VITE_DEMO_MODE  
Value: true
Environment: Production

Variable Name: AWS_ACCESS_KEY_ID
Value: AKIA... (your actual key)
Environment: Production

Variable Name: AWS_SECRET_ACCESS_KEY
Value: ... (your actual secret)
Environment: Production
```

### Step 2: How Vercel Builds Your App

When Vercel builds your app:

1. **Build Process**: Vercel reads env vars from its encrypted storage
2. **Compile Time**: Variables get baked into the build (only VITE_ prefixed ones for frontend)
3. **Deploy**: Only the compiled app gets deployed, not the raw credentials
4. **Runtime**: Your app can access these values via `import.meta.env.VITE_*`

### Step 3: What Gets Exposed vs Hidden

#### ✅ Frontend (Safe to expose):
```typescript
// These become part of the built JavaScript (public)
export const API_BASE_URL = import.meta.env.VITE_API_URL;
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE;
```

#### 🔒 Backend/Server (Never exposed):
```typescript
// These stay on Vercel's servers only (private)
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID; // Server-side only
const AWS_SECRET = process.env.AWS_SECRET_ACCESS_KEY; // Server-side only
```

### Step 4: Security Best Practices

#### For Public Demo (Recommended):
1. **Create a demo AWS account** or separate IAM user
2. **Give minimal permissions** (only demo S3 buckets)
3. **Set spending alerts** 
4. **Use demo credentials** in Vercel, not your main AWS account

#### IAM Policy for Demo User:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject"
            ],
            "Resource": [
                "arn:aws:s3:::hatchmark-demo-bucket/*"
            ]
        }
    ]
}
```

### Step 5: What People See vs What They Don't

#### ✅ What visitors to your deployed site can see:
- Your frontend code (React components, styling)
- API endpoints you're calling (e.g., `https://api.example.com`)
- Demo functionality

#### 🔒 What they CANNOT see:
- Your actual AWS credentials
- Your AWS secret keys
- Server-side environment variables
- Vercel's encrypted environment storage

---

## 🛡️ Summary: Your Credentials Are Safe Because:

1. **Environment variables are stored encrypted** in Vercel's secure storage
2. **Only VITE_ prefixed vars** get included in frontend build
3. **AWS credentials stay server-side** and never reach the browser
4. **Demo mode protects** your production resources
5. **IAM policies limit** what the demo user can access

Your main AWS account remains completely protected! 🎯
