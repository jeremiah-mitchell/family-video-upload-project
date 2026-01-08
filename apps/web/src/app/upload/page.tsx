'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { uploadVideo, uploadDvdFolder, getUploadConfig, ApiError, UploadConfigResponse } from '@/lib/api';

type UploadType = 'video' | 'dvd';
type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface UploadSuccess {
  filename?: string;
  extractedFiles?: string[];
}

interface FolderSelection {
  files: File[];
  folderName: string;
  totalSize: number;
}

export default function UploadPage() {
  // Default to 'dvd' as it's the most commonly used option
  const [uploadType, setUploadType] = useState<UploadType>('dvd');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderSelection | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);
  const [success, setSuccess] = useState<UploadSuccess | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [config, setConfig] = useState<UploadConfigResponse | null>(null);
  const [dvdDescription, setDvdDescription] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Load upload config on mount
  useEffect(() => {
    getUploadConfig()
      .then(setConfig)
      .catch((err) => {
        console.error('Failed to load upload config:', err);
      });
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleFileSelect = useCallback((file: File) => {
    // Validate file size before selecting (if config is loaded)
    if (config) {
      const maxSizeBytes = config.maxSizeMb * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        const maxSizeStr = config.maxSizeMb >= 1024
          ? `${(config.maxSizeMb / 1024).toFixed(0)} GB`
          : `${config.maxSizeMb} MB`;
        setError({
          message: 'File too large',
          details: `Maximum file size is ${maxSizeStr}. Your file is ${formatFileSize(file.size)}.`,
        });
        return;
      }
    }

    setSelectedFile(file);
    setSelectedFolder(null);
    setError(null);
    setSuccess(null);
    setUploadState('idle');
    setProgress(0);
  }, [config]);

  const handleFolderSelect = useCallback((files: FileList) => {
    // Convert FileList to array and find VIDEO_TS files
    const fileArray = Array.from(files);

    // Check if this looks like a VIDEO_TS folder
    const hasVobFiles = fileArray.some(f =>
      f.name.toLowerCase().endsWith('.vob') ||
      f.name.toLowerCase().endsWith('.ifo') ||
      f.name.toLowerCase().endsWith('.bup')
    );

    if (!hasVobFiles) {
      setError({
        message: 'Invalid DVD folder',
        details: 'Please select a VIDEO_TS folder containing VOB and IFO files.',
      });
      return;
    }

    // Get folder name from first file's path
    const firstFile = fileArray[0];
    const pathParts = firstFile.webkitRelativePath.split('/');
    const folderName = pathParts[0] || 'VIDEO_TS';

    // Calculate total size
    const totalSize = fileArray.reduce((sum, f) => sum + f.size, 0);

    // Validate total size (10GB limit for DVD)
    const maxDvdSize = 10 * 1024 * 1024 * 1024;
    if (totalSize > maxDvdSize) {
      setError({
        message: 'Folder too large',
        details: `Maximum DVD size is 10 GB. Your folder is ${formatFileSize(totalSize)}.`,
      });
      return;
    }

    setSelectedFolder({
      files: fileArray,
      folderName,
      totalSize,
    });
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
    setUploadState('idle');
    setProgress(0);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (uploadType === 'video') {
        const file = e.dataTransfer.files[0];
        if (file) {
          handleFileSelect(file);
        }
      } else {
        // For folder drops, we need to use the items API
        // Note: Folder drag-drop has limited browser support
        const items = e.dataTransfer.items;
        if (items && items.length > 0) {
          const item = items[0];
          if (item.webkitGetAsEntry) {
            const entry = item.webkitGetAsEntry();
            if (entry && entry.isDirectory) {
              setError({
                message: 'Folder drop not supported',
                details: 'Please use the "Select Folder" button to choose a VIDEO_TS folder.',
              });
              return;
            }
          }
        }
        // Fallback: treat as file
        const file = e.dataTransfer.files[0];
        if (file) {
          setError({
            message: 'Please select a folder',
            details: 'For DVD upload, click "Select Folder" and choose your VIDEO_TS folder.',
          });
        }
      }
    },
    [uploadType, handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleFolderInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFolderSelect(files);
      }
    },
    [handleFolderSelect]
  );

  const handleUpload = async () => {
    if (uploadType === 'video' && !selectedFile) return;
    if (uploadType === 'dvd' && !selectedFolder) return;

    setUploadState('uploading');
    setProgress(0);
    setError(null);

    try {
      if (uploadType === 'video' && selectedFile) {
        const result = await uploadVideo(selectedFile, (p) => setProgress(p));
        setSuccess({ filename: result.filename });
        setUploadState('success');
      } else if (uploadType === 'dvd' && selectedFolder) {
        // Upload DVD folder files
        setUploadState('uploading');

        const extractedFiles = await uploadDvdFolder(
          selectedFolder.files,
          selectedFolder.folderName,
          (p) => {
            setProgress(p);
            // Switch to processing state once upload is complete
            if (p === 100) {
              setUploadState('processing');
            }
          },
          dvdDescription || undefined
        );

        setSuccess({ extractedFiles });
        setUploadState('success');
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError({
        message: apiError.message || 'Upload failed',
        details: apiError.details,
      });
      setUploadState('error');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setSelectedFolder(null);
    setError(null);
    setSuccess(null);
    setUploadState('idle');
    setProgress(0);
    setDvdDescription('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const handleUploadAnother = () => {
    handleRemoveFile();
  };

  const isUploading = uploadState === 'uploading' || uploadState === 'processing';
  const canUpload = (uploadType === 'video' ? selectedFile : selectedFolder) && !isUploading;

  const acceptTypes = 'video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/mpeg,video/webm,.mp4,.mov,.avi,.mkv,.mpeg,.webm';

  const maxSizeText = config?.maxSizeMb
    ? `Max: ${config.maxSizeMb >= 1024 ? `${(config.maxSizeMb / 1024).toFixed(0)} GB` : `${config.maxSizeMb} MB`}`
    : 'Max: 2 GB';

  return (
    <main className={styles.main}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Upload Videos</h1>
        <Link href="/" className={styles.backLink}>
          Back to Tagging
        </Link>
      </div>

      <div className={styles.container}>
        {/* Upload Type Toggle */}
        <div className={styles.uploadTypeToggle}>
          <button
            className={`${styles.uploadTypeButton} ${uploadType === 'video' ? styles.uploadTypeButtonActive : ''}`}
            onClick={() => {
              setUploadType('video');
              handleRemoveFile();
            }}
            disabled={isUploading}
          >
            Video File
          </button>
          <button
            className={`${styles.uploadTypeButton} ${uploadType === 'dvd' ? styles.uploadTypeButtonActive : ''}`}
            onClick={() => {
              setUploadType('dvd');
              handleRemoveFile();
            }}
            disabled={isUploading}
          >
            DVD Folder
          </button>
        </div>

        <div className={styles.panel}>
          {/* Success State */}
          {uploadState === 'success' && success && (
            <div className={styles.successState}>
              <div className={styles.successIcon}>✓</div>
              <h2 className={styles.successTitle}>Upload Complete!</h2>
              {success.filename && (
                <p className={styles.successMessage}>
                  Successfully uploaded &quot;{success.filename}&quot;
                </p>
              )}
              {success.extractedFiles && (
                <>
                  <p className={styles.successMessage}>
                    Successfully extracted {success.extractedFiles.length} chapters from DVD
                  </p>
                  <div className={styles.extractedFiles}>
                    <p className={styles.extractedFilesTitle}>Extracted Files</p>
                    <ul className={styles.extractedFilesList}>
                      {success.extractedFiles.map((file) => (
                        <li key={file} className={styles.extractedFileItem}>
                          {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
              <div className={styles.successActions}>
                <Link href="/" className={styles.tagButton}>
                  Go to Tagging
                </Link>
                <button onClick={handleUploadAnother} className={styles.uploadAnotherButton}>
                  Upload Another
                </button>
              </div>
            </div>
          )}

          {/* Upload Form */}
          {uploadState !== 'success' && (
            <>
              {/* Error Message */}
              {error && (
                <div className={styles.errorMessage}>
                  <p className={styles.errorText}>{error.message}</p>
                  {error.details && <p className={styles.errorDetails}>{error.details}</p>}
                </div>
              )}

              {/* Drop Zone - Video */}
              {uploadType === 'video' && !selectedFile && (
                <div
                  className={`${styles.dropZone} ${isDragOver ? styles.dropZoneDragOver : ''} ${isUploading ? styles.dropZoneDisabled : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                  <div className={styles.dropIcon}>🎬</div>
                  <p className={styles.dropText}>
                    Drag and drop a video file here
                  </p>
                  <p className={styles.dropSubtext}>
                    MP4, MOV, AVI, MKV, MPEG, WebM · {maxSizeText}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptTypes}
                    onChange={handleFileInputChange}
                    className={styles.fileInput}
                  />
                </div>
              )}

              {/* Drop Zone - DVD Folder */}
              {uploadType === 'dvd' && !selectedFolder && (
                <div
                  className={`${styles.dropZone} ${isDragOver ? styles.dropZoneDragOver : ''} ${isUploading ? styles.dropZoneDisabled : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => !isUploading && folderInputRef.current?.click()}
                >
                  <div className={styles.dropIcon}>📀</div>
                  <p className={styles.dropText}>
                    Select your VIDEO_TS folder
                  </p>
                  <p className={styles.dropSubtext}>
                    Click to browse for the VIDEO_TS folder from your DVD
                  </p>
                  <p className={styles.folderInfo}>
                    Max: 10 GB
                  </p>
                  <input
                    ref={folderInputRef}
                    type="file"
                    /* @ts-expect-error webkitdirectory is not in React types */
                    webkitdirectory=""
                    onChange={handleFolderInputChange}
                    className={styles.fileInput}
                  />
                </div>
              )}

              {/* Selected File */}
              {selectedFile && (
                <div className={styles.selectedFile}>
                  <div className={styles.fileIcon}>🎬</div>
                  <div className={styles.fileInfo}>
                    <p className={styles.fileName}>{selectedFile.name}</p>
                    <p className={styles.fileSize}>{formatFileSize(selectedFile.size)}</p>
                  </div>
                  {!isUploading && (
                    <button onClick={handleRemoveFile} className={styles.removeButton}>
                      ×
                    </button>
                  )}
                </div>
              )}

              {/* Selected Folder */}
              {selectedFolder && (
                <div className={styles.selectedFile}>
                  <div className={styles.fileIcon}>📀</div>
                  <div className={styles.fileInfo}>
                    <p className={styles.fileName}>{selectedFolder.folderName}</p>
                    <p className={styles.fileSize}>
                      {selectedFolder.files.length} files · {formatFileSize(selectedFolder.totalSize)}
                    </p>
                  </div>
                  {!isUploading && (
                    <button onClick={handleRemoveFile} className={styles.removeButton}>
                      ×
                    </button>
                  )}
                </div>
              )}

              {/* DVD Description Field */}
              {selectedFolder && !isUploading && (
                <div className={styles.descriptionContainer}>
                  <label htmlFor="dvd-description" className={styles.descriptionLabel}>
                    DVD Case Notes (optional)
                  </label>
                  <textarea
                    id="dvd-description"
                    className={styles.descriptionInput}
                    placeholder="Enter any notes from the DVD case..."
                    value={dvdDescription}
                    onChange={(e) => setDvdDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Progress Bar */}
              {isUploading && (
                <div className={styles.progressContainer}>
                  <div className={styles.progressLabel}>
                    <p className={styles.progressText}>
                      {uploadState === 'processing'
                        ? 'Processing DVD...'
                        : 'Uploading...'}
                    </p>
                    <p className={styles.progressPercent}>
                      {uploadState === 'processing' ? 'Please wait' : `${progress}%`}
                    </p>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: uploadState === 'processing' ? '100%' : `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className={styles.actions}>
                <button
                  onClick={handleUpload}
                  disabled={!canUpload}
                  className={styles.uploadButton}
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
