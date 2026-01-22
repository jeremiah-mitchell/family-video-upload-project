'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import {
  uploadVideoSmart,
  uploadDvdFolderSmart,
  uploadVfrFolderSmart,
  getUploadConfig,
  uploadRescueIso,
  getRescueJobStatus,
  getRescueClipThumbnailUrl,
  encodeRescueClips,
  cancelRescueJob,
  ApiError,
  UploadConfigResponse,
  ExtractionProgressCallback,
} from '@/lib/api';
import type { RescueProgress, RescueClip } from '@family-video/shared';

type UploadType = 'video' | 'dvd' | 'vfr' | 'rescue';
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
  // Default to 'video' as the simplest option for users
  const [uploadType, setUploadType] = useState<UploadType>('video');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderSelection | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);
  const [success, setSuccess] = useState<UploadSuccess | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [config, setConfig] = useState<UploadConfigResponse | null>(null);
  const [dvdDescription, setDvdDescription] = useState('');
  const [vfrDescription, setVfrDescription] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [rescueDescription, setRescueDescription] = useState('');
  const [progressPhase, setProgressPhase] = useState<'uploading' | 'processing' | 'refreshing'>('uploading');

  // Rescue mode state (ISO upload)
  const [selectedIso, setSelectedIso] = useState<File | null>(null);
  const [rescueJobId, setRescueJobId] = useState<string | null>(null);
  const [rescueProgress, setRescueProgress] = useState<RescueProgress | null>(null);
  const [selectedClips, setSelectedClips] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const vfrFolderInputRef = useRef<HTMLInputElement>(null);
  const isoInputRef = useRef<HTMLInputElement>(null);

  // Load upload config on mount
  useEffect(() => {
    getUploadConfig()
      .then(setConfig)
      .catch((err) => {
        console.error('Failed to load upload config:', err);
      });
  }, []);

  // Poll rescue job status when job is active
  useEffect(() => {
    if (!rescueJobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await getRescueJobStatus(rescueJobId);
        setRescueProgress(status);

        // Update progress percentage for encoding
        if (status.status === 'encoding' && status.percentComplete !== undefined) {
          setProgress(status.percentComplete);
        }

        // Stop polling when job is complete or failed
        if (status.status === 'complete' || status.status === 'failed' || status.status === 'cancelled') {
          clearInterval(pollInterval);

          if (status.status === 'complete') {
            setSuccess({ extractedFiles: status.extractedFiles });
            setUploadState('success');
          } else if (status.status === 'failed') {
            setError({ message: 'Rescue failed', details: status.error });
            setUploadState('error');
          }
        }
      } catch (err) {
        console.error('Failed to get rescue status:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [rescueJobId]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const handleFolderSelect = useCallback((files: FileList, folderType: 'dvd' | 'vfr' = 'dvd') => {
    // Convert FileList to array and find VOB/IFO files
    const fileArray = Array.from(files);

    // Check if this looks like a folder with VOB files
    const hasVobFiles = fileArray.some(f =>
      f.name.toLowerCase().endsWith('.vob') ||
      f.name.toLowerCase().endsWith('.ifo') ||
      f.name.toLowerCase().endsWith('.bup')
    );

    if (!hasVobFiles) {
      const folderTypeName = folderType === 'dvd' ? 'VIDEO_TS' : 'VFR Video Recordings';
      setError({
        message: `Invalid ${folderTypeName} folder`,
        details: `Please select a ${folderTypeName} folder containing VOB files.`,
      });
      return;
    }

    // Get folder name from first file's path
    const firstFile = fileArray[0];
    const pathParts = firstFile.webkitRelativePath.split('/');
    const folderName = pathParts[0] || (folderType === 'dvd' ? 'VIDEO_TS' : 'VFR');

    // Calculate total size
    const totalSize = fileArray.reduce((sum, f) => sum + f.size, 0);

    // Validate total size (10GB limit for DVD/VFR)
    const maxSize = 10 * 1024 * 1024 * 1024;
    if (totalSize > maxSize) {
      setError({
        message: 'Folder too large',
        details: `Maximum size is 10 GB. Your folder is ${formatFileSize(totalSize)}.`,
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
      } else if (uploadType === 'dvd') {
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
        handleFolderSelect(files, 'dvd');
      }
    },
    [handleFolderSelect]
  );

  const handleVfrFolderInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFolderSelect(files, 'vfr');
      }
    },
    [handleFolderSelect]
  );

  const handleUpload = async () => {
    if (uploadType === 'video' && !selectedFile) return;
    if (uploadType === 'dvd' && !selectedFolder) return;
    if (uploadType === 'vfr' && !selectedFolder) return;

    setUploadState('uploading');
    setProgress(0);
    setProgressPhase('uploading');
    setError(null);

    try {
      if (uploadType === 'video' && selectedFile) {
        // Use smart upload which automatically uses chunked upload for large files (>50MB)
        // Pass description and file lastModified date for NFO creation
        const result = await uploadVideoSmart(
          selectedFile,
          (p) => {
            setProgress(p);
            if (p === 100) {
              setProgressPhase('processing');
            }
          },
          videoDescription || undefined,
          selectedFile.lastModified
        );
        setProgressPhase('refreshing');
        setSuccess({ filename: result.filename });
        setUploadState('success');
      } else if (uploadType === 'dvd' && selectedFolder) {
        // Upload DVD folder files
        setUploadState('uploading');
        setExtractionProgress(0);

        // Progress callback for extraction phase
        const onExtractionProgress: ExtractionProgressCallback = (extractProgress) => {
          setExtractionProgress(extractProgress);
          if (extractProgress === 100) {
            setProgressPhase('refreshing');
          }
        };

        const extractedFiles = await uploadDvdFolderSmart(
          selectedFolder.files,
          selectedFolder.folderName,
          (p) => {
            setProgress(p);
            // Switch to processing state once upload is complete
            if (p === 100) {
              setUploadState('processing');
              setProgressPhase('processing');
            }
          },
          dvdDescription || undefined,
          onExtractionProgress
        );

        setSuccess({ extractedFiles });
        setUploadState('success');
      } else if (uploadType === 'vfr' && selectedFolder) {
        // Upload VFR folder files (similar to DVD but uses VFR endpoints)
        setUploadState('uploading');
        setExtractionProgress(0);

        // Progress callback for extraction phase
        const onExtractionProgress: ExtractionProgressCallback = (extractProgress) => {
          setExtractionProgress(extractProgress);
          if (extractProgress === 100) {
            setProgressPhase('refreshing');
          }
        };

        const extractedFiles = await uploadVfrFolderSmart(
          selectedFolder.files,
          selectedFolder.folderName,
          (p) => {
            setProgress(p);
            // Switch to processing state once upload is complete
            if (p === 100) {
              setUploadState('processing');
              setProgressPhase('processing');
            }
          },
          vfrDescription || undefined,
          onExtractionProgress
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

  // Handle ISO file selection
  const handleIsoSelect = useCallback((file: File) => {
    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.iso')) {
      setError({
        message: 'Invalid file type',
        details: 'Please select an ISO file (.iso)',
      });
      return;
    }

    // Validate file size (100MB - 10GB)
    const minSize = 100 * 1024 * 1024; // 100MB
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
    if (file.size < minSize) {
      setError({
        message: 'File too small',
        details: 'ISO file appears too small. A valid DVD ISO should be at least 100MB.',
      });
      return;
    }
    if (file.size > maxSize) {
      setError({
        message: 'File too large',
        details: 'ISO file exceeds 10GB limit.',
      });
      return;
    }

    setSelectedIso(file);
    setError(null);
    setSuccess(null);
    setUploadState('idle');
    setProgress(0);
  }, []);

  const handleIsoInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleIsoSelect(file);
      }
    },
    [handleIsoSelect]
  );

  // Rescue mode handlers - upload ISO
  const handleStartRescue = async () => {
    if (!selectedIso) return;

    setUploadState('uploading');
    setProgress(0);
    setError(null);
    setRescueProgress(null);
    setSelectedClips(new Set());

    try {
      // Pass rescueDescription to the API for NFO creation
      const result = await uploadRescueIso(selectedIso, (p) => setProgress(p), rescueDescription || undefined);
      setRescueJobId(result.jobId);
    } catch (err) {
      const apiError = err as ApiError;
      setError({
        message: apiError.message || 'Failed to upload ISO',
        details: apiError.details,
      });
      setUploadState('error');
    }
  };

  const handleToggleClip = (clipId: number) => {
    setSelectedClips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clipId)) {
        newSet.delete(clipId);
      } else {
        newSet.add(clipId);
      }
      return newSet;
    });
  };

  const handleSelectAllClips = () => {
    if (rescueProgress?.clips) {
      setSelectedClips(new Set(rescueProgress.clips.map(c => c.clipId)));
    }
  };

  const handleDeselectAllClips = () => {
    setSelectedClips(new Set());
  };

  const handleEncodeSelectedClips = async () => {
    if (!rescueJobId || selectedClips.size === 0) return;

    setUploadState('processing');
    setError(null);

    try {
      await encodeRescueClips(rescueJobId, Array.from(selectedClips));
      // The polling will handle success state
    } catch (err) {
      const apiError = err as ApiError;
      setError({
        message: apiError.message || 'Failed to encode clips',
        details: apiError.details,
      });
      setUploadState('error');
    }
  };

  const handleCancelRescue = async () => {
    if (!rescueJobId) return;

    try {
      await cancelRescueJob(rescueJobId);
      setRescueJobId(null);
      setRescueProgress(null);
      setUploadState('idle');
    } catch (err) {
      console.error('Failed to cancel rescue:', err);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setSelectedFolder(null);
    setSelectedIso(null);
    setError(null);
    setSuccess(null);
    setUploadState('idle');
    setProgress(0);
    setExtractionProgress(0);
    setDvdDescription('');
    setVfrDescription('');
    setVideoDescription('');
    setRescueDescription('');
    setProgressPhase('uploading');
    setRescueJobId(null);
    setRescueProgress(null);
    setSelectedClips(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
    if (vfrFolderInputRef.current) {
      vfrFolderInputRef.current.value = '';
    }
    if (isoInputRef.current) {
      isoInputRef.current.value = '';
    }
  };

  const handleUploadAnother = () => {
    handleRemoveFile();
  };

  const isUploading = uploadState === 'uploading' || uploadState === 'processing';
  const canUpload = (uploadType === 'video' ? selectedFile : ((uploadType === 'dvd' || uploadType === 'vfr') ? selectedFolder : true)) && !isUploading;
  const isRescueActive = rescueJobId !== null;
  const isRescueReady = rescueProgress?.status === 'ready';

  const acceptTypes = 'video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/mpeg,video/webm,.mp4,.mov,.avi,.mkv,.mpeg,.webm';

  const maxSizeText = config?.maxSizeMb
    ? `Max: ${config.maxSizeMb >= 1024 ? `${(config.maxSizeMb / 1024).toFixed(0)} GB` : `${config.maxSizeMb} MB`}`
    : 'Max: 2 GB';

  // Helper to get rescue status text
  const getRescueStatusText = (): string => {
    if (!rescueProgress) return 'Processing...';
    switch (rescueProgress.status) {
      case 'pending': return 'Processing ISO...';
      case 'analyzing': return 'Analyzing video...';
      case 'ready': return 'Ready - Select clips to encode';
      case 'encoding': return `Encoding clip ${rescueProgress.currentClip || 0} of ${rescueProgress.totalClips || 0}...`;
      case 'complete': return 'Complete!';
      case 'failed': return 'Failed';
      case 'cancelled': return 'Cancelled';
      default: return 'Processing...';
    }
  };

  return (
    <main className={styles.main}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>
          <span aria-hidden="true">&larr;</span> Home
        </Link>
        <h1 className={styles.title}>Upload Videos</h1>
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
          <button
            className={`${styles.uploadTypeButton} ${uploadType === 'vfr' ? styles.uploadTypeButtonActive : ''}`}
            onClick={() => {
              setUploadType('vfr');
              handleRemoveFile();
            }}
            disabled={isUploading}
          >
            VFR Folder
          </button>
          <button
            className={`${styles.uploadTypeButton} ${uploadType === 'rescue' ? styles.uploadTypeButtonActive : ''}`}
            onClick={() => {
              setUploadType('rescue');
              handleRemoveFile();
            }}
            disabled={isUploading}
          >
            Rescue DVD (ISO)
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
                    Successfully extracted {success.extractedFiles.length} {uploadType === 'rescue' ? 'clips' : 'chapters'}
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

              {/* Drop Zone - VFR Folder (IsoBuster recovered) */}
              {uploadType === 'vfr' && !selectedFolder && (
                <div
                  className={`${styles.dropZone} ${isDragOver ? styles.dropZoneDragOver : ''} ${isUploading ? styles.dropZoneDisabled : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => !isUploading && vfrFolderInputRef.current?.click()}
                >
                  <div className={styles.dropIcon}>📀</div>
                  <p className={styles.dropText}>
                    Select your VFR Video Recordings folder
                  </p>
                  <p className={styles.dropSubtext}>
                    Click to browse for the folder recovered by IsoBuster
                  </p>
                  <p className={styles.folderInfo}>
                    Max: 10 GB
                  </p>
                  <input
                    ref={vfrFolderInputRef}
                    type="file"
                    /* @ts-expect-error webkitdirectory is not in React types */
                    webkitdirectory=""
                    onChange={handleVfrFolderInputChange}
                    className={styles.fileInput}
                  />
                </div>
              )}

              {/* Rescue Mode - Initial State (ISO Upload) */}
              {uploadType === 'rescue' && !isRescueActive && !selectedIso && (
                <div
                  className={`${styles.dropZone} ${isDragOver ? styles.dropZoneDragOver : ''} ${isUploading ? styles.dropZoneDisabled : ''}`}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleIsoSelect(file);
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => !isUploading && isoInputRef.current?.click()}
                >
                  <div className={styles.dropIcon}>💿</div>
                  <p className={styles.dropText}>
                    Upload ISO from Unfinalized DVD
                  </p>
                  <p className={styles.dropSubtext}>
                    Use ImgBurn or IsoBuster on Windows to create an ISO from your unfinalized DVD, then upload it here.
                  </p>
                  <p className={styles.folderInfo}>
                    ISO files only · Max: 10 GB
                  </p>
                  <input
                    ref={isoInputRef}
                    type="file"
                    accept=".iso"
                    onChange={handleIsoInputChange}
                    className={styles.fileInput}
                  />
                </div>
              )}

              {/* Rescue Mode - ISO Selected, Ready to Upload */}
              {uploadType === 'rescue' && !isRescueActive && selectedIso && (
                <>
                  <div className={styles.selectedFile}>
                    <div className={styles.fileIcon}>💿</div>
                    <div className={styles.fileInfo}>
                      <p className={styles.fileName}>{selectedIso.name}</p>
                      <p className={styles.fileSize}>{formatFileSize(selectedIso.size)}</p>
                    </div>
                    {!isUploading && (
                      <button onClick={handleRemoveFile} className={styles.removeButton}>
                        ×
                      </button>
                    )}
                  </div>
                  {/* Rescue Description Field */}
                  {!isUploading && (
                    <div className={styles.descriptionContainer}>
                      <label htmlFor="rescue-description" className={styles.descriptionLabel}>
                        DVD Case Notes (optional)
                      </label>
                      <textarea
                        id="rescue-description"
                        className={styles.descriptionInput}
                        placeholder="Enter any notes from the DVD case..."
                        value={rescueDescription}
                        onChange={(e) => setRescueDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Rescue Mode - Active Job (Processing) */}
              {uploadType === 'rescue' && isRescueActive && !isRescueReady && (
                <div className={styles.rescuePanel}>
                  <div className={styles.dropIcon}>💿</div>
                  <h2 className={styles.rescueTitle}>{getRescueStatusText()}</h2>
                  {rescueProgress?.status === 'analyzing' && (
                    <p className={styles.rescueDescription}>
                      Detecting scene boundaries...
                    </p>
                  )}
                  {rescueProgress?.status === 'pending' && (
                    <p className={styles.rescueDescription}>
                      Processing uploaded ISO file...
                    </p>
                  )}
                  <button
                    onClick={handleCancelRescue}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Rescue Mode - Clip Selection */}
              {uploadType === 'rescue' && isRescueReady && rescueProgress?.clips && (
                <div className={styles.rescuePanel}>
                  <h2 className={styles.rescueTitle}>Select Clips to Encode</h2>
                  <p className={styles.rescueDescription}>
                    Found {rescueProgress.clips.length} clips. Select the ones you want to save.
                  </p>

                  <div className={styles.clipActions}>
                    <button onClick={handleSelectAllClips} className={styles.clipActionButton}>
                      Select All
                    </button>
                    <button onClick={handleDeselectAllClips} className={styles.clipActionButton}>
                      Deselect All
                    </button>
                  </div>

                  <div className={styles.clipList}>
                    {rescueProgress.clips.map((clip) => (
                      <div
                        key={clip.clipId}
                        className={`${styles.clipItem} ${selectedClips.has(clip.clipId) ? styles.clipItemSelected : ''}`}
                        onClick={() => handleToggleClip(clip.clipId)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedClips.has(clip.clipId)}
                          onChange={() => handleToggleClip(clip.clipId)}
                          className={styles.clipCheckbox}
                        />
                        <img
                          src={getRescueClipThumbnailUrl(rescueJobId!, clip.clipId)}
                          alt={`Preview of Clip ${clip.clipId + 1} - Duration: ${formatDuration(clip.durationSeconds)}`}
                          className={styles.clipThumbnail}
                        />
                        <div className={styles.clipInfo}>
                          <p className={styles.clipName}>Clip {clip.clipId + 1}</p>
                          <p className={styles.clipDuration}>{formatDuration(clip.durationSeconds)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.actions}>
                    <button
                      onClick={handleEncodeSelectedClips}
                      disabled={selectedClips.size === 0}
                      className={styles.uploadButton}
                    >
                      Encode {selectedClips.size} Clip{selectedClips.size !== 1 ? 's' : ''}
                    </button>
                    <button
                      onClick={handleCancelRescue}
                      className={styles.cancelButton}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Selected File */}
              {selectedFile && (
                <>
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
                  {/* Video Description Field */}
                  {!isUploading && (
                    <div className={styles.descriptionContainer}>
                      <label htmlFor="video-description" className={styles.descriptionLabel}>
                        Video Description (optional)
                      </label>
                      <textarea
                        id="video-description"
                        className={styles.descriptionInput}
                        placeholder="Enter any notes about this video..."
                        value={videoDescription}
                        onChange={(e) => setVideoDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                  )}
                </>
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
              {selectedFolder && !isUploading && uploadType === 'dvd' && (
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

              {/* VFR Description Field */}
              {selectedFolder && !isUploading && uploadType === 'vfr' && (
                <div className={styles.descriptionContainer}>
                  <label htmlFor="vfr-description" className={styles.descriptionLabel}>
                    DVD Case Notes (optional)
                  </label>
                  <textarea
                    id="vfr-description"
                    className={styles.descriptionInput}
                    placeholder="Enter any notes from the DVD case..."
                    value={vfrDescription}
                    onChange={(e) => setVfrDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Progress Bar - Unified End-to-End */}
              {isUploading && uploadType !== 'rescue' && (
                <div className={styles.progressContainer}>
                  {/* Progress Phase Indicators */}
                  <div className={styles.progressPhases}>
                    <div className={`${styles.progressPhase} ${progressPhase === 'uploading' ? styles.progressPhaseActive : ''} ${progressPhase !== 'uploading' ? styles.progressPhaseComplete : ''}`}>
                      <span className={styles.progressPhaseIcon}>{progressPhase === 'uploading' ? '⏳' : '✓'}</span>
                      <span>Upload</span>
                    </div>
                    <div className={`${styles.progressPhase} ${progressPhase === 'processing' ? styles.progressPhaseActive : ''} ${progressPhase === 'refreshing' ? styles.progressPhaseComplete : ''}`}>
                      <span className={styles.progressPhaseIcon}>{progressPhase === 'processing' ? '⏳' : (progressPhase === 'refreshing' ? '✓' : '○')}</span>
                      <span>{uploadType === 'video' ? 'Save' : 'Extract'}</span>
                    </div>
                    <div className={`${styles.progressPhase} ${progressPhase === 'refreshing' ? styles.progressPhaseActive : ''}`}>
                      <span className={styles.progressPhaseIcon}>{progressPhase === 'refreshing' ? '⏳' : '○'}</span>
                      <span>Refresh</span>
                    </div>
                  </div>
                  <div className={styles.progressLabel}>
                    <p className={styles.progressText}>
                      {progressPhase === 'uploading' && 'Uploading...'}
                      {progressPhase === 'processing' && (uploadType === 'video' ? 'Saving to library...' : (uploadType === 'vfr' ? 'Extracting chapters from VFR folder...' : 'Extracting chapters from DVD...'))}
                      {progressPhase === 'refreshing' && 'Refreshing library...'}
                    </p>
                    <p className={styles.progressPercent}>
                      {progressPhase === 'uploading' && `${progress}%`}
                      {progressPhase === 'processing' && (uploadType === 'video' ? '' : `${extractionProgress}%`)}
                      {progressPhase === 'refreshing' && ''}
                    </p>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: progressPhase === 'uploading'
                          ? `${progress}%`
                          : progressPhase === 'processing'
                            ? (uploadType === 'video' ? '100%' : `${extractionProgress}%`)
                            : '100%'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Actions - Video/DVD/VFR */}
              {uploadType !== 'rescue' && (
                <div className={styles.actions}>
                  <button
                    onClick={handleUpload}
                    disabled={!canUpload}
                    className={styles.uploadButton}
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              )}

              {/* Actions - Rescue (initial) */}
              {uploadType === 'rescue' && !isRescueActive && (
                <div className={styles.actions}>
                  <button
                    onClick={handleStartRescue}
                    disabled={!selectedIso || isUploading}
                    className={styles.uploadButton}
                  >
                    {isUploading ? 'Uploading...' : 'Upload & Rescue'}
                  </button>
                </div>
              )}

              {/* Progress Bar - Rescue ISO Upload */}
              {uploadType === 'rescue' && isUploading && !isRescueActive && (
                <div className={styles.progressContainer}>
                  <div className={styles.progressLabel}>
                    <p className={styles.progressText}>Uploading ISO...</p>
                    <p className={styles.progressPercent}>{progress}%</p>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
