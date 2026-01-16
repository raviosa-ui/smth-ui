
export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export interface FileItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  compressedSize: number | null;
  compressedBlob: Blob | null;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  quality: number;
  format: ImageFormat;
  targetSizeKb: number | 'auto';
}

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  maxIteration?: number;
  initialQuality?: number;
  onProgress?: (progress: number) => void;
  fileType?: string;
}
