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
   * Get the first user from Jellyfin (for single-user setup)
   */
  async getFirstUserId(): Promise<string> {
    const url = `${this.baseUrl}/Users`;
    this.logger.debug(`Fetching users from: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
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
   * Fetch all video items from Jellyfin library
   */
  async getItems(): Promise<JellyfinItem[]> {
    const userId = await this.getFirstUserId();

    const params = new URLSearchParams({
      IncludeItemTypes: 'Video,Movie,Episode',
      Recursive: 'true',
      Fields: 'Path,ImageTags',
      SortBy: 'SortName',
      SortOrder: 'Ascending',
    });

    const url = `${this.baseUrl}/Users/${userId}/Items?${params.toString()}`;
    this.logger.debug(`Fetching items from: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
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
   * Build thumbnail URL for an item
   */
  getThumbnailUrl(itemId: string, hasImageTag: boolean): string | undefined {
    if (!hasImageTag) {
      return undefined;
    }
    return `${this.baseUrl}/Items/${itemId}/Images/Primary?api_key=${this.apiKey}`;
  }
}
