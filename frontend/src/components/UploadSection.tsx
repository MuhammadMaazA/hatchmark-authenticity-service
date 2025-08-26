import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileImage, CheckCircle, AlertCircle, Shield, Download, User, Mail } from "lucide-react";

interface UploadResult {
  uploadId: string;
  objectKey: string;
  uploadUrl: string;
  assetId?: string;
  perceptualHash?: string;
  timestamp?: string;
}

interface UserInfo {
  name: string;
  email: string;
}

const UploadSection = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'user-info' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', email: '' });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0];
      if (file.type.startsWith('image/')) {
        setFile(file);
        setUploadStatus('user-info');
      } else {
        setErrorMessage('Please upload an image file (JPG, PNG, etc.)');
        setUploadStatus('error');
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus('user-info');
    }
  }, []);

  const handleUpload = async (uploadFile: File, userData: UserInfo) => {
    setUploadStatus('uploading');
    setErrorMessage('');

    try {
      console.log('Starting upload process...');
      // Step 1: Get presigned URL
      const response = await fetch('http://localhost:3002/uploads/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: uploadFile.name,
          contentType: uploadFile.type,
          fileSize: uploadFile.size,
          creator: userData.name,
          email: userData.email,
        }),
      });

      console.log('Upload initiate response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload initiate failed:', errorText);
        throw new Error(`Failed to initiate upload: ${response.status} ${errorText}`);
      }

      const uploadData: UploadResult = await response.json();
      console.log('Upload data received:', uploadData);
      setUploadResult(uploadData);

      // Step 2: Upload file to S3
      console.log('Uploading to S3...', uploadData.uploadUrl);
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: uploadFile,
        headers: {
          'Content-Type': uploadFile.type,
        },
      });

      console.log('S3 upload response status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        console.error('S3 upload failed:', uploadResponse.status, uploadResponse.statusText);
        throw new Error(`Failed to upload file: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      setUploadStatus('processing');

      // Step 3: Notify backend of successful upload
      const completeResponse = await fetch('http://localhost:3002/uploads/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId: uploadData.uploadId,
          objectKey: uploadData.objectKey,
          creator: userData.name,
          email: userData.email,
        }),
      });

      if (!completeResponse.ok) {
        console.error('Upload completion failed:', completeResponse.status);
        throw new Error('Failed to complete upload');
      }

      const completionData = await completeResponse.json();
      setUploadResult(prev => prev ? { ...prev, ...completionData } : completionData);
      setUploadStatus('success');

    } catch (error) {
      console.error('Upload failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      setUploadStatus('error');
    }
  };

  const generateCertificate = () => {
    if (!uploadResult || !file) return;

    const certificateHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hatchmark Digital Authenticity Certificate</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .certificate {
      background: white;
      border-radius: 12px;
      padding: 3rem;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      border: 3px solid #667eea;
    }
    .header {
      text-align: center;
      margin-bottom: 2rem;
      border-bottom: 2px solid #eee;
      padding-bottom: 2rem;
    }
    .logo {
      font-size: 2.5rem;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      font-size: 1.2rem;
      color: #666;
      font-weight: 500;
    }
    .content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin: 2rem 0;
    }
    .field {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }
    .label {
      font-weight: 600;
      color: #333;
    }
    .value {
      color: #666;
      font-family: monospace;
      background: #f5f5f5;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .status {
      background: #22c55e;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: bold;
      text-align: center;
      margin: 2rem 0;
    }
    .footer {
      text-align: center;
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 2px solid #eee;
      color: #666;
      font-size: 0.9rem;
    }
    .qr-placeholder {
      width: 100px;
      height: 100px;
      background: #f0f0f0;
      border: 2px dashed #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      border-radius: 8px;
      color: #999;
      font-size: 0.8rem;
    }
    @media print {
      body { background: white; padding: 0; }
      .certificate { box-shadow: none; border: 2px solid #333; }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logo">🔒 HATCHMARK</div>
      <div class="subtitle">Digital Authenticity Certificate</div>
    </div>
    
    <div class="status">
      ✓ VERIFIED AUTHENTIC
    </div>
    
    <div class="content">
      <div>
        <div class="field">
          <span class="label">Asset ID:</span>
          <span class="value">${uploadResult.assetId || 'Processing...'}</span>
        </div>
        <div class="field">
          <span class="label">Filename:</span>
          <span class="value">${file.name}</span>
        </div>
        <div class="field">
          <span class="label">File Size:</span>
          <span class="value">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
        </div>
        <div class="field">
          <span class="label">Upload ID:</span>
          <span class="value">${uploadResult.uploadId}</span>
        </div>
      </div>
      
      <div>
        <div class="field">
          <span class="label">Registered:</span>
          <span class="value">${uploadResult.timestamp ? new Date(uploadResult.timestamp).toLocaleString() : new Date().toLocaleString()}</span>
        </div>
        <div class="field">
          <span class="label">Creator:</span>
          <span class="value">${userInfo.name || 'Anonymous'}</span>
        </div>
        <div class="field">
          <span class="label">Email:</span>
          <span class="value">${userInfo.email || 'Not provided'}</span>
        </div>
        <div class="field">
          <span class="label">Storage:</span>
          <span class="value">AWS S3 Secure</span>
        </div>
        <div class="field">
          <span class="label">Blockchain:</span>
          <span class="value">Ethereum</span>
        </div>
      </div>
    </div>
    
    <div style="text-align: center; margin: 2rem 0;">
      <div class="qr-placeholder">
        QR Code
      </div>
      <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
        Scan to verify authenticity
      </p>
    </div>
    
    <div class="footer">
      <p><strong>This certificate verifies the authenticity and integrity of the digital asset.</strong></p>
      <p>Certificate generated on ${new Date().toLocaleDateString()} by Hatchmark Digital Authenticity Service</p>
      <p>Learn more at <strong>hatchmark.io</strong></p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([certificateHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    
    if (newWindow) {
      newWindow.onload = () => {
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      };
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadResult(null);
    setUploadStatus('idle');
    setErrorMessage('');
    setUserInfo({ name: '', email: '' });
  };

  const handleUserInfoSubmit = () => {
    if (!userInfo.name.trim() || !userInfo.email.trim()) {
      setErrorMessage('Please enter both name and email address');
      return;
    }
    if (!file) {
      setErrorMessage('No file selected');
      return;
    }
    handleUpload(file, userInfo);
  };

  return (
    <section id="upload" className="py-24 bg-muted/30">
      <div className="max-width section-padding">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance mb-6">
            Secure your digital assets
          </h2>
          <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
            Upload your digital content to generate an immutable proof of authenticity and protect against tampering.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {uploadStatus === 'idle' && (
            <div
              className={`
                relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
                ${isDragging 
                  ? 'border-primary bg-primary/5 scale-105' 
                  : 'border-border hover:border-primary/50 hover:bg-primary/5'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="space-y-4">
                <div className="flex justify-center">
                  <Upload className="w-16 h-16 text-muted-foreground" />
                </div>
                
                <div>
                  <p className="text-xl font-semibold mb-2">
                    Drop your digital asset here
                  </p>
                  <p className="text-muted-foreground">
                    or click to browse files
                  </p>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p>Supports: JPG, PNG, GIF, WebP</p>
                  <p>Maximum file size: 50MB</p>
                </div>
              </div>
            </div>
          )}

          {file && uploadStatus !== 'idle' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-6 bg-background rounded-xl border">
                <FileImage className="w-12 h-12 text-primary" />
                <div className="flex-1">
                  <h3 className="font-semibold">{file.name}</h3>
                  <p className="text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {uploadStatus === 'success' && (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                )}
                {uploadStatus === 'error' && (
                  <AlertCircle className="w-8 h-8 text-red-600" />
                )}
              </div>

              {uploadStatus === 'user-info' && (
                <div className="space-y-6">
                  <div className="p-6 bg-background rounded-xl border">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Creator Information
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Please provide your details to register this asset under your name.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="creator-name">Full Name</Label>
                        <Input
                          id="creator-name"
                          type="text"
                          placeholder="Enter your full name"
                          value={userInfo.name}
                          onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="creator-email">Email Address</Label>
                        <Input
                          id="creator-email"
                          type="email"
                          placeholder="Enter your email address"
                          value={userInfo.email}
                          onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                      <Button 
                        onClick={handleUserInfoSubmit}
                        disabled={!userInfo.name.trim() || !userInfo.email.trim()}
                        className="flex-1"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Register & Upload
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={resetUpload}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {uploadStatus === 'uploading' && (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="font-medium">Uploading to secure storage...</p>
                  <p className="text-sm text-muted-foreground">This may take a few moments</p>
                </div>
              )}

              {uploadStatus === 'processing' && (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="font-medium">Processing and generating hash...</p>
                  <p className="text-sm text-muted-foreground">Creating authenticity fingerprint</p>
                </div>
              )}

              {uploadStatus === 'success' && uploadResult && (
                <div className="space-y-6">
                  <div className="text-center py-6 bg-green-50 rounded-xl border border-green-200">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-green-900 mb-2">
                      Upload Successful!
                    </h3>
                    <p className="text-green-700">
                      Your digital asset has been securely stored and authenticated.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-background rounded-xl border">
                    <div>
                      <h4 className="font-semibold mb-2">Asset Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Upload ID:</span>
                          <span className="font-mono">{uploadResult.uploadId}</span>
                        </div>
                        {uploadResult.assetId && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Asset ID:</span>
                            <span className="font-mono">{uploadResult.assetId}</span>
                          </div>
                        )}
                        {uploadResult.perceptualHash && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Hash:</span>
                            <span className="font-mono text-xs">{uploadResult.perceptualHash.slice(0, 16)}...</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Security Status</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-600" />
                          <span>Encrypted Storage</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Hash Generated</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Blockchain Ready</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      onClick={generateCertificate}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      View Certificate
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={resetUpload}
                      className="flex-1"
                    >
                      Upload Another
                    </Button>
                  </div>
                </div>
              )}

              {uploadStatus === 'error' && (
                <div className="text-center py-8 bg-red-50 rounded-xl border border-red-200">
                  <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-red-900 mb-2">
                    Upload Failed
                  </h3>
                  <p className="text-red-700 mb-4">
                    {errorMessage || 'An error occurred during upload. Please try again.'}
                  </p>
                  <Button onClick={resetUpload} variant="outline">
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default UploadSection;
