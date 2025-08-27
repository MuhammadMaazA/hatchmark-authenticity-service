interface InitiateUploadResponse {
  uploadUrl: string;
  objectKey: string;
}

interface InitiateUploadRequest {
  filename: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || '';
    if (!this.baseUrl) {
      console.warn('NEXT_PUBLIC_API_GATEWAY_URL not configured');
    }
  }

  async initiateUpload({ filename }: InitiateUploadRequest): Promise<InitiateUploadResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/uploads/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error initiating upload:', error);
      throw error;
    }
  }

  async uploadFileToS3(uploadUrl: string, file: File, onProgress?: (progress: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  async checkProcessingStatus(objectKey: string): Promise<{ status: string; watermarkedUrl?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${encodeURIComponent(objectKey)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking status:', error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
export type { InitiateUploadResponse, InitiateUploadRequest };
