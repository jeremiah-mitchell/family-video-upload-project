import type { Video, VideoMetadata, ApiSuccessResponse, ApiErrorResponse } from '@family-video/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * API client for communicating with the backend
 * All fetch functions will be added here as features are implemented
 */

// Placeholder - will be implemented in Epic 2
export async function getVideos(): Promise<Video[]> {
  throw new Error('Not implemented - see Story 2.1');
}

// Placeholder - will be implemented in Epic 4
export async function saveVideoMetadata(
  videoId: string,
  metadata: VideoMetadata
): Promise<ApiSuccessResponse<Video>> {
  throw new Error('Not implemented - see Story 4.2');
}
