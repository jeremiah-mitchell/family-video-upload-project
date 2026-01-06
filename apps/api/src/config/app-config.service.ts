import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from './env.validation';

/**
 * Typed configuration service for accessing environment variables
 * Provides type-safe access to all configuration values
 */
@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService<EnvConfig, true>) {}

  /**
   * Jellyfin server URL
   */
  get jellyfinUrl(): string {
    return this.configService.get('JELLYFIN_URL', { infer: true });
  }

  /**
   * Jellyfin API key for authentication
   * NOTE: Never log this value
   */
  get jellyfinApiKey(): string {
    return this.configService.get('JELLYFIN_API_KEY', { infer: true });
  }

  /**
   * Path to media files for NFO writing
   */
  get mediaPath(): string {
    return this.configService.get('MEDIA_PATH', { infer: true });
  }

  /**
   * API server port
   */
  get port(): number {
    return this.configService.get('PORT', { infer: true });
  }

  /**
   * Frontend URL for CORS configuration
   */
  get corsOrigin(): string {
    return this.configService.get('CORS_ORIGIN', { infer: true });
  }

  /**
   * Jellyfin username for Now Playing feature
   */
  get jellyfinUser(): string {
    return this.configService.get('JELLYFIN_USER', { infer: true });
  }

  /**
   * Maximum upload file size in bytes
   */
  get maxUploadSizeBytes(): number {
    const sizeMb = this.configService.get('MAX_UPLOAD_SIZE_MB', { infer: true });
    return sizeMb * 1024 * 1024;
  }

  /**
   * Maximum upload file size in MB (for display)
   */
  get maxUploadSizeMb(): number {
    return this.configService.get('MAX_UPLOAD_SIZE_MB', { infer: true });
  }

  /**
   * Jellyfin library name to use for video listing
   */
  get jellyfinLibraryName(): string {
    return this.configService.get('JELLYFIN_LIBRARY_NAME', { infer: true });
  }
}
