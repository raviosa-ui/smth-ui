import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { FileRow } from './components/FileRow';
import { HowToUse } from './components/HowToUse';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import { RelatedTools } from './components/RelatedTools';
import { ShareButton } from './components/ShareButton';
import { FileItem, ImageFormat } from './types';

declare const imageCompression: any;
declare const JSZip: any;

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const App: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const handleFilesAdded = (newFiles: File[]) => {
    const fileItems: FileItem[] = newFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      originalSize: file.size,
      compressedSize: null,
      compressedBlob: null,
      progress: 0,
      status: 'pending',
      quality: 80,
      format: 'image/jpeg',
      targetSizeKb: 'auto',
    }));
    setFiles((prev) => [...prev, ...fileItems]);
  };

  const updateFileSettings = (id: string, updates: Partial<FileItem>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates, status: 'pending', progress: 0 } : f))
    );
  };

  const compressFile = async (item: FileItem) => {
    try {
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'processing', progress: 0 } : f))
      );

      const options: any = {
        useWebWorker: true,
        onProgress: (progress: number) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, progress } : f))
          );
        },
      };

      if (item.targetSizeKb !== 'auto') {
        options.maxSizeMB = (item.targetSizeKb as number) / 1024;
      } else {
        options.initialQuality = item.quality / 100;
      }

      const compressedFile = await imageCompression(item.file, options);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                status: 'completed',
                progress: 100,
                compressedSize: compressedFile.size,
                compressedBlob: compressedFile,
              }
            : f
        )
      );
    } catch (error) {
      console.error('Compression failed:', error);
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'error', progress: 0 } : f))
      );
    }
  };

  const compressAll = async () => {
    setIsProcessingAll(true);
    const pending = files.filter((f) => f.status === 'pending');
    for (const item of pending) {
      await compressFile(item);
    }
    setIsProcessingAll(false);
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    const completed = files.filter((f) => f.status === 'completed' && f.compressedBlob);
    
    if (completed.length === 0) return;

    completed.forEach((item) => {
      zip.file(`tinypixel-${item.name}`, item.compressedBlob!);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tinypixel-bulk.zip';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Calculate aggregate stats
  const stats = useMemo(() => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.compressedSize !== null);
    if (completedFiles.length === 0) return null;

    const totalOriginal = completedFiles.reduce((acc, f) => acc + f.originalSize, 0);
    const totalCompressed = completedFiles.reduce((acc, f) => acc + (f.compressedSize || 0), 0);
    const savings = totalOriginal - totalCompressed;
    const percentage = ((savings / totalOriginal) * 100).toFixed(1);

    return {
      totalOriginal,
      totalCompressed,
      savings,
      percentage
    };
  }, [files]);

  return (
    <div className="container">
      <Header />

      <main>
        <section className="hero">
          <div className="hero-inner">
            <div style={{ flex: 1 }}>
              <h1>TinyPixel: Bulk Image Compressor</h1>
              <p className="lead">
                Optimized for Social Media. Shrink multiple images instantly in your browser with no quality loss. 
                Everything stays 100% private.
              </p>
            </div>
          </div>
        </section>

        <DropZone onFilesAdded={handleFilesAdded} />

        {files.length > 0 && (
          <div className="processing-container">
            <div className="processing-header">
              <h2>Processing Queue ({files.length})</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  className="btn-secondary"
                  onClick={() => setFiles([])}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                >
                  Clear Queue
                </button>
                <button 
                  className="btn-cta" 
                  onClick={compressAll}
                  disabled={isProcessingAll}
                >
                  {isProcessingAll ? 'Working...' : 'Compress All 🚀'}
                </button>
                {files.some(f => f.status === 'completed') && (
                   <button 
                     className="btn-cta btn-success" 
                     onClick={downloadZip}
                   >
                     Download ZIP 📦
                   </button>
                )}
              </div>
            </div>

            {stats && (
              <div className="stats-dashboard">
                <div className="stat-card">
                  <span className="stat-label">Total Original</span>
                  <span className="stat-value">{formatSize(stats.totalOriginal)}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Optimized Size</span>
                  <span className="stat-value">{formatSize(stats.totalCompressed)}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Total Savings</span>
                  <span className="stat-value highlight">{formatSize(stats.savings)} ({stats.percentage}%)</span>
                </div>
              </div>
            )}

            <div className="queue-list">
              {files.map((item) => (
                <FileRow
                  key={item.id}
                  item={item}
                  onUpdate={(updates) => updateFileSettings(item.id, updates)}
                  onRemove={() => setFiles(prev => prev.filter(f => f.id !== item.id))}
                  onCompress={() => compressFile(item)}
                />
              ))}
            </div>
          </div>
        )}

        <ShareButton />

        <div className="content-area">
          <HowToUse />
          
          <div className="tools">
            <h2>Explore More Creator Tools</h2>
            <RelatedTools />
          </div>

          <FAQ />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default App;