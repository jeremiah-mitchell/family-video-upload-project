/**
 * Represents a video item from the Jellyfin library
 */
export interface Video {
  /** Jellyfin item ID */
  id: string;
  /** Original filename of the video */
  filename: string;
  /** Whether this video has been tagged (has NFO file) */
  isTagged: boolean;
  /** Full path to the video file on the server */
  path: string;
  /** Optional thumbnail URL */
  thumbnailUrl?: string;
  /** Date the video was created/filmed (ISO 8601 date string, e.g. "2024-01-15") */
  dateCreated?: string;
}

/**
 * Represents the currently playing video for a user
 */
export interface NowPlayingVideo {
  /** Jellyfin item ID */
  id: string;
  /** Video title/name */
  name: string;
  /** Optional thumbnail URL */
  thumbnailUrl?: string;
}

/**
 * Response from a successful video upload
 */
export interface UploadResult {
  /** Filename of the uploaded video */
  filename: string;
  /** Size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
}

/**
 * Progress update during DVD extraction
 */
export interface DvdExtractionProgress {
  /** Current status */
  status: 'analyzing' | 'extracting' | 'complete' | 'error';
  /** Total number of chapters */
  totalChapters?: number;
  /** Current chapter being extracted */
  currentChapter?: number;
  /** Current chapter filename */
  currentFilename?: string;
  /** Error message if status is 'error' */
  error?: string;
  /** List of extracted files when complete */
  extractedFiles?: string[];
}

/**
 * DVD chapter information parsed from IFO files
 */
export interface DvdChapter {
  /** Chapter index (1-based) */
  index: number;
  /** Duration in seconds */
  duration: number;
  /** Start time in seconds */
  startTime: number;
}
