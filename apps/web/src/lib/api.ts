import type { Video, VideoMetadata, ApiSuccessResponse, ApiErrorResponse, NowPlayingVideo, UploadResult } from '@family-video/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Default timeout for API requests (10 seconds) */
const FETCH_TIMEOUT_MS = 10000;

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public details?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Create an AbortController with timeout for fetch requests
 */
function createTimeoutSignal(timeoutMs: number = FETCH_TIMEOUT_MS): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

/**
 * Fetch all videos from the API
 * @returns Array of Video objects
 * @throws ApiError if the request fails
 */
export async function getVideos(): Promise<Video[]> {
  const response = await fetch(`${API_BASE}/videos`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: createTimeoutSignal(),
  });

  if (!response.ok) {
    // Try to parse error response
    try {
      const errorData = await response.json() as ApiErrorResponse;
      throw new ApiError(
        errorData.error || 'Failed to fetch videos',
        errorData.details,
        response.status
      );
    } catch (parseError) {
      // If parsing fails, throw generic error
      if (parseError instanceof ApiError) {
        throw parseError;
      }
      throw new ApiError(
        'Failed to fetch videos',
        `Server returned ${response.status}`,
        response.status
      );
    }
  }

  const data = await response.json() as ApiSuccessResponse<Video[]>;
  return data.data;
}

/**
 * Configuration response type
 */
interface ConfigResponse {
  jellyfinUrl: string;
}

/**
 * Get configuration from the API (including Jellyfin URL)
 */
export async function getConfig(): Promise<ConfigResponse> {
  const response = await fetch(`${API_BASE}/videos/config`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: createTimeoutSignal(),
  });

  if (!response.ok) {
    throw new ApiError(
      'Failed to get configuration',
      `Server returned ${response.status}`,
      response.status
    );
  }

  const data = await response.json() as ApiSuccessResponse<ConfigResponse>;
  return data.data;
}

/**
 * Get existing metadata for a video
 */
export async function getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
  const response = await fetch(`${API_BASE}/videos/${videoId}/metadata`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: createTimeoutSignal(),
  });

  if (!response.ok) {
    try {
      const errorData = await response.json() as ApiErrorResponse;
      throw new ApiError(
        errorData.error || 'Failed to get metadata',
        errorData.details,
        response.status
      );
    } catch (parseError) {
      if (parseError instanceof ApiError) {
        throw parseError;
      }
      throw new ApiError(
        'Failed to get metadata',
        `Server returned ${response.status}`,
        response.status
      );
    }
  }

  const data = await response.json() as ApiSuccessResponse<VideoMetadata | null>;
  return data.data;
}

/**
 * Save metadata for a video
 */
export async function saveVideoMetadata(
  videoId: string,
  metadata: VideoMetadata
): Promise<Video> {
  const response = await fetch(`${API_BASE}/videos/${videoId}/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
    signal: createTimeoutSignal(),
  });

  if (!response.ok) {
    try {
      const errorData = await response.json() as ApiErrorResponse;
      throw new ApiError(
        errorData.error || 'Failed to save',
        errorData.details,
        response.status
      );
    } catch (parseError) {
      if (parseError instanceof ApiError) {
        throw parseError;
      }
      throw new ApiError(
        'Failed to save',
        `Server returned ${response.status}`,
        response.status
      );
    }
  }

  const data = await response.json() as ApiSuccessResponse<Video>;
  return data.data;
}

/**
 * Get currently playing video for the configured user
 * Returns null if nothing is playing
 */
export async function getNowPlaying(): Promise<NowPlayingVideo | null> {
  const response = await fetch(`${API_BASE}/videos/now-playing`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: createTimeoutSignal(5000), // 5s timeout - non-critical
  });

  if (!response.ok) {
    // Now playing is non-critical - return null on error
    console.warn('Failed to fetch now playing:', response.status);
    return null;
  }

  const data = await response.json() as ApiSuccessResponse<NowPlayingVideo | null>;
  return data.data;
}

/**
 * Upload configuration response
 */
export interface UploadConfigResponse {
  maxSizeMb: number;
  supportedTypes: string[];
}

/**
 * Get upload configuration from the API
 */
export async function getUploadConfig(): Promise<UploadConfigResponse> {
  const response = await fetch(`${API_BASE}/upload/config`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: createTimeoutSignal(),
  });

  if (!response.ok) {
    throw new ApiError(
      'Failed to get upload configuration',
      `Server returned ${response.status}`,
      response.status
    );
  }

  const data = await response.json() as ApiSuccessResponse<UploadConfigResponse>;
  return data.data;
}

/**
 * Upload a video file with progress tracking
 * @param file The file to upload
 * @param onProgress Callback for upload progress (0-100)
 * @returns Upload result with filename
 */
export async function uploadVideo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as ApiSuccessResponse<UploadResult>;
          resolve(response.data);
        } catch {
          reject(new ApiError('Invalid response from server'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText) as ApiErrorResponse;
          reject(new ApiError(errorData.error || 'Upload failed', errorData.details, xhr.status));
        } catch {
          reject(new ApiError('Upload failed', `Server returned ${xhr.status}`, xhr.status));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new ApiError('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new ApiError('Upload cancelled'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new ApiError('Upload timed out'));
    });

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Send request
    xhr.open('POST', `${API_BASE}/upload/video`);
    xhr.timeout = 600000; // 10 minute timeout for large files
    xhr.send(formData);
  });
}

/**
 * Upload a DVD ZIP file and extract chapters
 * @param file The ZIP file containing VIDEO_TS
 * @param onProgress Callback for upload progress (0-100)
 * @returns Array of extracted filenames
 */
export async function uploadDvd(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as ApiSuccessResponse<{ extractedFiles: string[] }>;
          resolve(response.data.extractedFiles);
        } catch {
          reject(new ApiError('Invalid response from server'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText) as ApiErrorResponse;
          reject(new ApiError(errorData.error || 'DVD upload failed', errorData.details, xhr.status));
        } catch {
          reject(new ApiError('DVD upload failed', `Server returned ${xhr.status}`, xhr.status));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new ApiError('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new ApiError('Upload cancelled'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new ApiError('Upload timed out'));
    });

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Send request
    xhr.open('POST', `${API_BASE}/upload/dvd`);
    xhr.timeout = 1800000; // 30 minute timeout for DVD processing
    xhr.send(formData);
  });
}

/**
 * Upload a DVD VIDEO_TS folder and extract chapters
 * @param files Array of files from the VIDEO_TS folder
 * @param folderName Name of the folder being uploaded
 * @param onProgress Callback for upload progress (0-100)
 * @returns Array of extracted filenames
 */
export async function uploadDvdFolder(
  files: File[],
  folderName: string,
  onProgress?: (progress: number) => void
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as ApiSuccessResponse<{ extractedFiles: string[] }>;
          resolve(response.data.extractedFiles);
        } catch {
          reject(new ApiError('Invalid response from server'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText) as ApiErrorResponse;
          reject(new ApiError(errorData.error || 'DVD folder upload failed', errorData.details, xhr.status));
        } catch {
          reject(new ApiError('DVD folder upload failed', `Server returned ${xhr.status}`, xhr.status));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new ApiError('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new ApiError('Upload cancelled'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new ApiError('Upload timed out'));
    });

    // Create form data with all files
    const formData = new FormData();
    for (const file of files) {
      // Use webkitRelativePath if available, otherwise just the filename
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      formData.append('files', file, relativePath);
    }
    formData.append('folderName', folderName);

    // Send request
    xhr.open('POST', `${API_BASE}/upload/dvd-folder`);
    xhr.timeout = 1800000; // 30 minute timeout for DVD processing
    xhr.send(formData);
  });
}
