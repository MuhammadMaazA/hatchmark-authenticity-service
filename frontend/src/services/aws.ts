import AWS from 'aws-sdk';
import { AWS_CONFIG, LAMBDA_FUNCTIONS } from '../config';

// Configure AWS SDK with explicit credentials
AWS.config.update({
  region: AWS_CONFIG.REGION,
  accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
  secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
});

const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

export interface UploadResponse {
  uploadId: string;
  presignedUrl: string;
  uploadUrl: string;
}

export interface VerificationResponse {
  isValid: boolean;
  hash?: string;
  metadata?: any;
  assetId?: string;
}

export interface DuplicateCheckResponse {
  isDuplicate: boolean;
  perceptualHash?: string;
  existingAsset?: {
    assetId: string;
    creator: string;
    timestamp: string;
    originalFilename: string;
  };
  similarAssets?: any[];
}

// Generate presigned URL for file upload
export const generatePresignedUrl = async (filename: string, contentType: string): Promise<UploadResponse> => {
  try {
    const params = {
      FunctionName: LAMBDA_FUNCTIONS.GENERATE_URL,
      Payload: JSON.stringify({
        filename,
        content_type: contentType,
        bucket: AWS_CONFIG.INGESTION_BUCKET
      })
    };

    const result = await lambda.invoke(params).promise();
    
    if (result.Payload) {
      const response = JSON.parse(result.Payload as string);
      
      if (response.errorMessage) {
        throw new Error(response.errorMessage);
      }
      
      return JSON.parse(response.body || response);
    }
    
    throw new Error('No response from Lambda function');
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
};

// Check for duplicate images
export const checkForDuplicate = async (file: File): Promise<DuplicateCheckResponse> => {
  try {
    // Convert file to base64
    const fileBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);
    const base64File = btoa(Array.from(uint8Array, byte => String.fromCharCode(byte)).join(''));

    const params = {
      FunctionName: LAMBDA_FUNCTIONS.DUPLICATE_CHECK,
      Payload: JSON.stringify({
        fileData: base64File,
        filename: file.name,
        contentType: file.type
      })
    };

    const result = await lambda.invoke(params).promise();
    
    if (result.Payload) {
      const response = JSON.parse(result.Payload as string);
      
      if (response.errorMessage) {
        throw new Error(response.errorMessage);
      }
      
      return JSON.parse(response.body || response);
    }
    
    throw new Error('No response from Lambda function');
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    throw error;
  }
};

// Upload file to S3 using presigned URL
export const uploadFileToS3 = async (presignedUrl: string, file: File): Promise<boolean> => {
  try {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Verify artwork authenticity
export const verifyArtwork = async (filename: string): Promise<VerificationResponse> => {
  try {
    const params = {
      FunctionName: LAMBDA_FUNCTIONS.VERIFY_ARTWORK,
      Payload: JSON.stringify({
        filename,
        bucket: AWS_CONFIG.PROCESSED_BUCKET
      })
    };

    const result = await lambda.invoke(params).promise();
    
    if (result.Payload) {
      const response = JSON.parse(result.Payload as string);
      
      if (response.errorMessage) {
        throw new Error(response.errorMessage);
      }
      
      return JSON.parse(response.body || response);
    }
    
    throw new Error('No response from Lambda function');
  } catch (error) {
    console.error('Error verifying artwork:', error);
    throw error;
  }
};

// Register asset in DynamoDB
export const registerAsset = async (
  uploadId: string, 
  objectKey: string, 
  creator: string, 
  email: string, 
  fileSize: number
): Promise<any> => {
  try {
    const params = {
      FunctionName: LAMBDA_FUNCTIONS.REGISTER_ASSET,
      Payload: JSON.stringify({
        uploadId,
        objectKey,
        creator,
        email,
        fileSize
      })
    };

    const result = await lambda.invoke(params).promise();
    
    if (result.Payload) {
      const response = JSON.parse(result.Payload as string);
      
      if (response.errorMessage) {
        throw new Error(response.errorMessage);
      }
      
      return JSON.parse(response.body || response);
    }
    
    throw new Error('No response from Lambda function');
  } catch (error) {
    console.error('Error registering asset:', error);
    throw error;
  }
};

export default {
  generatePresignedUrl,
  uploadFileToS3,
  verifyArtwork,
  registerAsset,
  checkForDuplicate
};
