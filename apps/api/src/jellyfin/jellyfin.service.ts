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
  DeviceName?: string;
  NowPlayingItem?: JellyfinItem;
  PlayState?: {
    PositionTicks?: number;
    CanSeek?: boolean;
    IsPaused?: boolean;
  };
}

/**
 * Now playing result with device info
 */
export interface NowPlayingResult {
  item: JellyfinItem;
  deviceName?: string;
}

/**
 * Jellyfin BaseItemDto for updating items
 * Partial - only include fields we want to update
 */
interface JellyfinItemUpdate {
  Id: string;
  Name?: string;
  PremiereDate?: string;
  Overview?: string;
  Tags?: string[];
  People?: Array<{ Name: string; Type: string }>;
  CommunityRating?: number;
  Genres?: string[];
}

/** Default timeout for Jellyfin API requests (10 seconds) */
const FETCH_TIMEOUT_MS = 10000;

@Injectable()
export class JellyfinService {
  private readonly logger = new Logger(JellyfinService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly libraryName: string;

  constructor(private readonly configService: AppConfigService) {
    this.baseUrl = this.configService.jellyfinUrl;
    this.apiKey = this.configService.jellyfinApiKey;
    this.libraryName = this.configService.jellyfinLibraryName;
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
      (lib) => lib.Name === this.libraryName,
    );

    if (!homeVideosLib) {
      this.logger.warn(
        `Library "${this.libraryName}" not found. Available libraries: ${data.Items.map((l) => l.Name).join(', ')}`,
      );
      return null;
    }

    this.homeVideosLibraryId = homeVideosLib.Id;
    this.logger.log(
      `Found "${this.libraryName}" library with ID: ${this.homeVideosLibraryId}`,
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
   * @deprecated Use refreshHomeVideosLibrary() for targeted refresh instead
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
   * Refresh only the Home Videos library
   * Much faster than full library refresh for post-upload discovery
   * Used after video uploads to make new files visible in Jellyfin
   */
  async refreshHomeVideosLibrary(): Promise<void> {
    const libraryId = await this.getHomeVideosLibraryId();

    if (!libraryId) {
      // Fall back to full refresh if library not found
      this.logger.warn(
        'Home Videos library not found, falling back to full refresh',
      );
      return this.refreshLibrary();
    }

    // Use full metadata refresh to pick up NFO files for new items
    const params = new URLSearchParams({
      MetadataRefreshMode: 'FullRefresh',
      ImageRefreshMode: 'Default',
      ReplaceAllMetadata: 'false', // Only replace for items without metadata
    });
    const url = `${this.baseUrl}/Items/${libraryId}/Refresh?${params.toString()}`;
    this.logger.debug(`Triggering Home Videos library refresh (${libraryId})`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        signal: this.createTimeoutSignal(),
      });

      if (!response.ok) {
        this.logger.warn(`Library refresh returned ${response.status}`);
      } else {
        this.logger.log('Home Videos library refresh triggered with FullRefresh');
      }
    } catch (error) {
      // Log but don't throw - refresh is best-effort
      this.logger.warn('Failed to trigger library refresh', error);
    }
  }

  /**
   * Refresh metadata for a single item in Jellyfin
   * Much faster than full library refresh - only rescans the specified item
   * Uses MetadataRefreshMode=FullRefresh to pick up NFO changes
   * @deprecated NFO refresh has known issues - use updateItemMetadata() instead
   */
  async refreshItem(itemId: string): Promise<void> {
    const params = new URLSearchParams({
      MetadataRefreshMode: 'FullRefresh',
      ImageRefreshMode: 'Default',
      ReplaceAllMetadata: 'true',
    });
    const url = `${this.baseUrl}/Items/${itemId}/Refresh?${params.toString()}`;
    this.logger.debug(`Triggering Jellyfin item refresh for: ${itemId}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        signal: this.createTimeoutSignal(),
      });

      if (!response.ok) {
        this.logger.warn(`Item refresh returned ${response.status} for ${itemId}`);
      } else {
        this.logger.log(`Jellyfin item refresh triggered for: ${itemId}`);
      }
    } catch (error) {
      // Log but don't throw - refresh is best-effort
      this.logger.warn(`Failed to trigger item refresh for ${itemId}`, error);
    }
  }

  /**
   * Update item metadata directly via Jellyfin API
   * This bypasses NFO file parsing issues in Jellyfin 10.9+
   * @see https://github.com/jellyfin/jellyfin/issues/13655
   */
  async updateItemMetadata(
    itemId: string,
    metadata: {
      title?: string;
      date?: string;
      description?: string;
      tags?: string[];
      people?: string[];
      rating?: number;
    },
  ): Promise<boolean> {
    const url = `${this.baseUrl}/Items/${itemId}`;
    this.logger.debug(`Updating Jellyfin item metadata for: ${itemId}`);

    // Build the update payload
    const updatePayload: JellyfinItemUpdate = {
      Id: itemId,
    };

    if (metadata.title) {
      updatePayload.Name = metadata.title;
    }

    if (metadata.date) {
      // Convert YYYY-MM-DD to Eastern Time noon to avoid date shift
      // Without timezone, Jellyfin interprets as UTC midnight, which becomes
      // the previous day in Eastern Time. Setting to noon EST ensures the
      // date is correct regardless of server timezone.
      updatePayload.PremiereDate = `${metadata.date}T12:00:00-05:00`;
    }

    if (metadata.description) {
      updatePayload.Overview = metadata.description;
    }

    if (metadata.tags && metadata.tags.length > 0) {
      updatePayload.Tags = metadata.tags;
    }

    if (metadata.people && metadata.people.length > 0) {
      updatePayload.People = metadata.people.map((name) => ({
        Name: name,
        Type: 'Actor',
      }));
    }

    if (metadata.rating !== undefined) {
      updatePayload.CommunityRating = metadata.rating;
    }

    // Always set Home Video genre
    updatePayload.Genres = ['Home Video'];

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(updatePayload),
        signal: this.createTimeoutSignal(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(
          `Item update returned ${response.status} for ${itemId}: ${errorText}`,
        );
        return false;
      }

      this.logger.log(`Jellyfin item metadata updated for: ${itemId}`);
      return true;
    } catch (error) {
      this.logger.warn(`Failed to update item metadata for ${itemId}`, error);
      return false;
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
  async getNowPlaying(username: string): Promise<NowPlayingResult | null> {
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
        `Found now playing for ${username}: ${userSession.NowPlayingItem.Name} on ${userSession.DeviceName}`,
      );
      return {
        item: userSession.NowPlayingItem,
        deviceName: userSession.DeviceName,
      };
    } catch (error) {
      this.logger.warn(`Error fetching sessions`, error);
      return null;
    }
  }
}
