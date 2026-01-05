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
