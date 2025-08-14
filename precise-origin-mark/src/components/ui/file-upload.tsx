import { useState, useCallback } from "react";
import { Upload, Image as ImageIcon, FileImage } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  className?: string;
  children?: React.ReactNode;
}

export function FileUpload({ onFileSelect, accept = "image/*", className, children }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  return (
    <div
      className={cn(
        "relative group cursor-pointer transition-all duration-300",
        "border-2 border-dashed rounded-lg p-8",
        "hover:border-primary/50 hover:bg-primary/5",
        isDragOver && "border-primary bg-primary/10 scale-[1.02]",
        "bg-gradient-to-br from-muted/30 to-background",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      
      {children || (
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className={cn(
            "p-4 rounded-full transition-all duration-300",
            "bg-gradient-to-br from-primary/10 to-accent/10",
            "group-hover:from-primary/20 group-hover:to-accent/20",
            isDragOver && "scale-110 animate-pulse-glow"
          )}>
            <Upload className={cn(
              "h-8 w-8 transition-colors duration-300",
              isDragOver ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {isDragOver ? "Drop your file here" : "Drag & drop or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground">
              Supports images (PNG, JPG, GIF, WebP)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface ImagePreviewProps {
  file: File;
  onRemove?: () => void;
  className?: string;
}

export function ImagePreview({ file, onRemove, className }: ImagePreviewProps) {
  const [preview, setPreview] = useState<string>("");

  useState(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  });

  return (
    <div className={cn("relative group animate-scale-in", className)}>
      <div className="relative overflow-hidden rounded-lg border bg-card shadow-glass">
        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 p-1 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-destructive"
          >
            ×
          </button>
        )}
      </div>
      
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2">
          <FileImage className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{file.name}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
    </div>
  );
}