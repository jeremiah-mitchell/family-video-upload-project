/**
 * Metadata for a home video, stored in NFO format
 */
export interface VideoMetadata {
  /** User-provided title for the video */
  title: string;
  /** Date the video was filmed (ISO 8601 date string) */
  date?: string;
  /** List of people appearing in the video (short display names) */
  people: string[];
  /** List of tags for categorization (Christmas, Mexico, Family, etc.) */
  tags: string[];
  /** Rating from 1-10 */
  rating?: number;
  /** Free-text description of the video content */
  description?: string;
}

/**
 * API response structure for success
 */
export interface ApiSuccessResponse<T> {
  data: T;
  message: string;
}

/**
 * API response structure for errors
 */
export interface ApiErrorResponse {
  error: string;
  details?: string;
}
