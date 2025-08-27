// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// Lambda Function Names (for direct invocation)
export const LAMBDA_FUNCTIONS = {
    GENERATE_URL: 'hatchmark-generate-url-dev',
    REGISTER_ASSET: 'hatchmark-register-asset-dev', 
    VERIFY_ARTWORK: 'hatchmark-verify-artwork-dev'
} as const;

// AWS Configuration
export const AWS_CONFIG = {
    REGION: 'eu-west-1',
    INGESTION_BUCKET: 'hatchmark-ingestion-bucket-dev-581150859000',
    PROCESSED_BUCKET: 'hatchmark-processed-bucket-dev-581150859000'
} as const;

export const API_ENDPOINTS = {
    UPLOAD_INITIATE: '/uploads/initiate',
    VERIFY: '/verify'
} as const;

// App Configuration
export const APP_CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
    UPLOAD_TIMEOUT: 30000, // 30 seconds
} as const;
