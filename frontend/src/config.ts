// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
