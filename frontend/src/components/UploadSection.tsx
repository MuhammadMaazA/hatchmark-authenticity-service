import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileImage, CheckCircle, AlertCircle, Shield } from "lucide-react";

const UploadSection = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [file, setFile] = useState<File | null>(null);

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
        simulateUpload();
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      simulateUpload();
    }
  }, []);

  const simulateUpload = () => {
    setUploadStatus('uploading');
    setTimeout(() => {
      setUploadStatus('success');
    }, 3000);
  };

  const resetUpload = () => {
    setFile(null);
    setUploadStatus('idle');
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Upload className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <section id="upload" className="py-24 bg-muted/30">
      <div className="max-width section-padding">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance mb-6">
            Start protecting your work
          </h2>
          <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
            Upload your creative work and we'll create an immutable record with invisible watermarking in seconds.
          </p>
        </div>

        {/* Upload Area */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-lg p-8">
            <div
              className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-muted-foreground'
              } ${uploadStatus === 'success' ? 'border-success bg-success/5' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploadStatus === 'uploading'}
              />

              <div className="flex flex-col items-center gap-4">
                {/* Status Icon */}
                <div className="p-3 bg-muted rounded-full">
                  {getStatusIcon()}
                </div>

                {/* File Info */}
                {file ? (
                  <div className="flex items-center gap-3 bg-muted/50 rounded-md px-3 py-2">
                    <FileImage className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ) : null}

                {/* Status Message */}
                <div className="space-y-2">
                  <p className={`text-sm ${
                    uploadStatus === 'success' ? 'text-success' :
                    uploadStatus === 'error' ? 'text-destructive' :
                    'text-muted-foreground'
                  }`}>
                    {uploadStatus === 'uploading' && 'Creating immutable record and embedding watermark...'}
                    {uploadStatus === 'success' && 'Your work is now protected with an immutable digital signature!'}
                    {uploadStatus === 'error' && 'Upload failed. Please try again.'}
                    {uploadStatus === 'idle' && 'Drag and drop your image here, or click to select'}
                  </p>
                </div>

                {/* Action Buttons */}
                {uploadStatus === 'idle' && (
                  <Button className="mt-4">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                )}

                {uploadStatus === 'success' && (
                  <div className="flex gap-3 mt-4">
                    <Button variant="outline" onClick={resetUpload} size="sm">
                      Upload Another
                    </Button>
                    <Button size="sm">
                      View Certificate
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-3 mt-6 p-4 bg-muted/50 rounded-lg">
              <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-foreground mb-1">
                  Your files are secure
                </h4>
                <p className="text-xs text-muted-foreground">
                  All uploads are encrypted and processed in secure AWS infrastructure. Original files are never stored permanently.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UploadSection;