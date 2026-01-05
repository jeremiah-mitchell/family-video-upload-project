import type { Video, VideoMetadata, ApiSuccessResponse, ApiErrorResponse, NowPlayingVideo } from '@family-video/shared';

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
