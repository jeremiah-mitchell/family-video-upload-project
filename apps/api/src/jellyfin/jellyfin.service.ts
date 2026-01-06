import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config';

/**
 * Jellyfin API item response (BaseItemDto subset)
 */
interface JellyfinItem {
  Id: string;
  Name: string;
  Path?: string;
  Type: string;
  ImageTags?: {
    Primary?: string;
  };
  /** Date the item was created/added to Jellyfin (ISO 8601) */
  DateCreated?: string;
  /** Premiere date if set via NFO (ISO 8601) */
  PremiereDate?: string;
}

/**
 * Jellyfin API items response
 */
interface JellyfinItemsResponse {
  Items: JellyfinItem[];
  TotalRecordCount: number;
}

/**
 * Jellyfin API user response
 */
interface JellyfinUser {
  Id: string;
  Name: string;
}

/**
 * Jellyfin API library/view response
 */
interface JellyfinLibrary {
  Id: string;
  Name: string;
  CollectionType?: string;
}

/**
 * Jellyfin API views (libraries) response
 */
interface JellyfinViewsResponse {
  Items: JellyfinLibrary[];
}

/**
 * Jellyfin API session response
 */
interface JellyfinSession {
  Id: string;
  UserId: string;
  UserName: string;
  NowPlayingItem?: JellyfinItem;
  PlayState?: {
    PositionTicks?: number;
    CanSeek?: boolean;
    IsPaused?: boolean;
  };
}

/** Home Videos library name (hardcoded per requirements) */
const HOME_VIDEOS_LIBRARY_NAME = 'Home Videos';

/** Default timeout for Jellyfin API requests (10 seconds) */
const FETCH_TIMEOUT_MS = 10000;

@Injectable()
export class JellyfinService {
  private readonly logger = new Logger(JellyfinService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: AppConfigService) {
    this.baseUrl = this.configService.jellyfinUrl;
    this.apiKey = this.configService.jellyfinApiKey;
  }

  /**
   * Get authorization headers for Jellyfin API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'X-Emby-Token': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create an AbortController with timeout for fetch requests
   */
  private createTimeoutSignal(timeoutMs: number = FETCH_TIMEOUT_MS): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
  }

  /**
   * Get the first user from Jellyfin (for single-user setup)
   */
  async getFirstUserId(): Promise<string> {
    const url = `${this.baseUrl}/Users`;
    this.logger.debug('Fetching Jellyfin users');

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
      signal: this.createTimeoutSignal(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jellyfin API error (${response.status}): ${errorText}`);
    }

    const users = (await response.json()) as JellyfinUser[];

    if (users.length === 0) {
      throw new Error('No users found in Jellyfin');
    }

    this.logger.debug(`Found ${users.length} users, using: ${users[0].Name}`);
    return users[0].Id;
  }

  /**
   * Get the Home Videos library ID
   * Caches the ID to avoid repeated API calls
   */
  private homeVideosLibraryId: string | null = null;

  async getHomeVideosLibraryId(): Promise<string | null> {
    if (this.homeVideosLibraryId) {
      return this.homeVideosLibraryId;
    }

    const userId = await this.getFirstUserId();
    const url = `${this.baseUrl}/Users/${userId}/Views`;
    this.logger.debug('Fetching Jellyfin libraries/views');

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
      signal: this.createTimeoutSignal(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jellyfin API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as JellyfinViewsResponse;
    const homeVideosLib = data.Items.find(
      (lib) => lib.Name === HOME_VIDEOS_LIBRARY_NAME,
    );

    if (!homeVideosLib) {
      this.logger.warn(
        `Library "${HOME_VIDEOS_LIBRARY_NAME}" not found. Available libraries: ${data.Items.map((l) => l.Name).join(', ')}`,
      );
      return null;
    }

    this.homeVideosLibraryId = homeVideosLib.Id;
    this.logger.log(
      `Found "${HOME_VIDEOS_LIBRARY_NAME}" library with ID: ${this.homeVideosLibraryId}`,
    );
    return this.homeVideosLibraryId;
  }

  /**
   * Fetch all video items from Jellyfin library
   * Filtered to Home Videos library only
   */
  async getItems(): Promise<JellyfinItem[]> {
    const userId = await this.getFirstUserId();
    const libraryId = await this.getHomeVideosLibraryId();

    const params = new URLSearchParams({
      IncludeItemTypes: 'Video',
      Recursive: 'true',
      Fields: 'Path,ImageTags,DateCreated,PremiereDate',
      SortBy: 'SortName',
      SortOrder: 'Ascending',
    });

    // Filter to Home Videos library if found
    if (libraryId) {
      params.set('ParentId', libraryId);
      this.logger.debug(`Filtering to Home Videos library (${libraryId})`);
    } else {
      this.logger.warn(
        'Home Videos library not found, returning all videos',
      );
    }

    const url = `${this.baseUrl}/Users/${userId}/Items?${params.toString()}`;
    this.logger.debug('Fetching Jellyfin items');

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
      signal: this.createTimeoutSignal(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jellyfin API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as JellyfinItemsResponse;
    this.logger.log(`Retrieved ${data.Items.length} items from Jellyfin`);

    return data.Items;
  }

  /**
   * Build internal thumbnail URL (proxied through our API to protect API key)
   * Returns a path relative to our API, not the direct Jellyfin URL
   */
  getThumbnailUrl(itemId: string, hasImageTag: boolean): string | undefined {
    if (!hasImageTag) {
      return undefined;
    }
    // Return URL to our proxy endpoint - API key stays server-side
    return `/videos/${itemId}/thumbnail`;
  }

  /**
   * Fetch thumbnail image data from Jellyfin
   * Used by the proxy endpoint to serve images without exposing API key
   */
  async getThumbnailImage(itemId: string): Promise<Buffer | null> {
    const url = `${this.baseUrl}/Items/${itemId}/Images/Primary`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: this.createTimeoutSignal(5000), // 5s timeout for images
      });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch thumbnail for ${itemId}: ${response.status}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.warn(`Error fetching thumbnail for ${itemId}`, error);
      return null;
    }
  }

  /**
   * Get a single item by ID
   */
  async getItem(itemId: string): Promise<JellyfinItem | null> {
    const userId = await this.getFirstUserId();
    const url = `${this.baseUrl}/Users/${userId}/Items/${itemId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: this.createTimeoutSignal(),
      });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch item ${itemId}: ${response.status}`);
        return null;
      }

      return (await response.json()) as JellyfinItem;
    } catch (error) {
      this.logger.warn(`Error fetching item ${itemId}`, error);
      return null;
    }
  }

  /**
   * Trigger a library refresh in Jellyfin
   * This makes Jellyfin rescan and pick up new NFO files
   */
  async refreshLibrary(): Promise<void> {
    const url = `${this.baseUrl}/Library/Refresh`;
    this.logger.debug('Triggering Jellyfin library refresh');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        signal: this.createTimeoutSignal(),
      });

      if (!response.ok) {
        this.logger.warn(`Library refresh returned ${response.status}`);
      } else {
        this.logger.log('Jellyfin library refresh triggered');
      }
    } catch (error) {
      // Log but don't throw - refresh is best-effort
      this.logger.warn('Failed to trigger library refresh', error);
    }
  }

  /**
   * Get the Jellyfin base URL for constructing web player links
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get user ID by username
   * Used for Now Playing feature to find a specific user's session
   */
  async getUserIdByName(username: string): Promise<string | null> {
    const url = `${this.baseUrl}/Users`;
    this.logger.debug(`Looking up user: ${username}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
      signal: this.createTimeoutSignal(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jellyfin API error (${response.status}): ${errorText}`);
    }

    const users = (await response.json()) as JellyfinUser[];
    const user = users.find(
      (u) => u.Name.toLowerCase() === username.toLowerCase(),
    );

    if (!user) {
      this.logger.warn(`User "${username}" not found`);
      return null;
    }

    return user.Id;
  }

  /**
   * Get currently playing item for a specific user
   * Uses Jellyfin Sessions API to find active playback
   */
  async getNowPlaying(username: string): Promise<JellyfinItem | null> {
    const url = `${this.baseUrl}/Sessions`;
    this.logger.debug(`Fetching sessions for now playing check`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: this.createTimeoutSignal(5000), // 5s timeout
      });

      if (!response.ok) {
        this.logger.warn(`Sessions API returned ${response.status}`);
        return null;
      }

      const sessions = (await response.json()) as JellyfinSession[];

      // Find session for the specified user with an active NowPlayingItem
      const userSession = sessions.find(
        (s) =>
          s.UserName?.toLowerCase() === username.toLowerCase() &&
          s.NowPlayingItem != null,
      );

      if (!userSession || !userSession.NowPlayingItem) {
        this.logger.debug(`No active playback for user "${username}"`);
        return null;
      }

      this.logger.debug(
        `Found now playing for ${username}: ${userSession.NowPlayingItem.Name}`,
      );
      return userSession.NowPlayingItem;
    } catch (error) {
      this.logger.warn(`Error fetching sessions`, error);
      return null;
    }
  }
}
