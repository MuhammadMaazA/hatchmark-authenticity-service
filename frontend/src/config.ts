// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// Demo Mode Configuration (protects your production AWS)
export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
export const DEMO_API_URL = import.meta.env.VITE_DEMO_API_URL;

// Lambda Function Names (for direct invocation)
export const LAMBDA_FUNCTIONS = {
    GENERATE_URL: import.meta.env.VITE_LAMBDA_GENERATE_URL || 'hatchmark-generate-url-dev',
    REGISTER_ASSET: import.meta.env.VITE_LAMBDA_REGISTER_ASSET || 'hatchmark-register-asset-dev', 
    VERIFY_ARTWORK: import.meta.env.VITE_LAMBDA_VERIFY_ARTWORK || 'hatchmark-verify-artwork-dev',
    DUPLICATE_CHECK: import.meta.env.VITE_LAMBDA_DUPLICATE_CHECK || 'hatchmark-duplicate-check-dev'
} as const;

// AWS Configuration with Demo Protection
export const AWS_CONFIG = {
    REGION: import.meta.env.VITE_AWS_REGION || 'eu-west-1',
    INGESTION_BUCKET: IS_DEMO_MODE 
        ? 'hatchmark-demo-bucket' 
        : (import.meta.env.VITE_INGESTION_BUCKET || 'hatchmark-ingestion-bucket-dev-581150859000'),
    PROCESSED_BUCKET: IS_DEMO_MODE 
        ? 'hatchmark-demo-processed' 
        : (import.meta.env.VITE_PROCESSED_BUCKET || 'hatchmark-processed-bucket-dev-581150859000')
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
