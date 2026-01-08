import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { existsSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { Video, VideoMetadata } from '@family-video/shared';
import { JellyfinService } from '../jellyfin';
import { AppConfigService } from '../config';
import { NfoService } from '../nfo';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);
  private readonly mediaPath: string;

  constructor(
    private readonly jellyfinService: JellyfinService,
    private readonly configService: AppConfigService,
    private readonly nfoService: NfoService,
  ) {
    this.mediaPath = this.configService.mediaPath;
  }

  /**
   * Get all videos from Jellyfin with tagged status
   */
  async getAllVideos(): Promise<Video[]> {
    const items = await this.jellyfinService.getItems();

    const videos: Video[] = items.map((item) => {
      const path = item.Path || '';
      const isTagged = this.checkIfTagged(path);
      const hasImage = !!item.ImageTags?.Primary;

      return {
        id: item.Id,
        filename: item.Name,
        path,
        isTagged,
        thumbnailUrl: this.jellyfinService.getThumbnailUrl(item.Id, hasImage),
        dateCreated: this.extractDateCreated(item.DateCreated, item.PremiereDate),
      };
    });

    this.logger.log(
      `Processed ${videos.length} videos (${videos.filter((v) => v.isTagged).length} tagged)`,
    );

    return videos;
  }

  /**
   * Extract the best available date for a video
   * Prefers PremiereDate (from NFO) over DateCreated (file creation)
   * Returns date in YYYY-MM-DD format for HTML date input
   */
  private extractDateCreated(
    dateCreated?: string,
    premiereDate?: string,
  ): string | undefined {
    // Prefer premiere date (set via NFO) over file creation date
    const dateStr = premiereDate || dateCreated;
    if (!dateStr) {
      return undefined;
    }

    // Parse and format to YYYY-MM-DD for HTML date input
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return undefined;
      }
      // Format as YYYY-MM-DD
      return date.toISOString().split('T')[0];
    } catch {
      return undefined;
    }
  }

  /**
   * Check if a video is fully tagged (has NFO with required fields)
   * Required fields: title (non-empty), date, and at least one person
   * Maps Jellyfin paths to container-relative paths using MEDIA_PATH
   */
  private checkIfTagged(videoPath: string): boolean {
    if (!videoPath) {
      return false;
    }

    // Map Jellyfin absolute path to container-relative path
    // Jellyfin might return paths like /mnt/NAS/Videos/file.mp4
    // We need to find the file relative to our mounted MEDIA_PATH
    const containerPath = this.mapToContainerPath(videoPath);
    if (!containerPath) {
      this.logger.debug(`Could not map path to container: ${videoPath}`);
      return false;
    }

    // Construct NFO path by replacing video extension with .nfo
    const dir = dirname(containerPath);
    const name = basename(containerPath, extname(containerPath));
    const nfoPath = join(dir, `${name}.nfo`);

    if (!existsSync(nfoPath)) {
      return false;
    }

    // NFO exists - now check if it has required fields
    try {
      const metadata = this.nfoService.readNfoSync(nfoPath);
      if (!metadata) {
        return false;
      }

      // Required: non-empty title, date, and at least one person
      const hasTitle = !!(metadata.title && metadata.title.trim().length > 0);
      const hasDate = !!metadata.date;
      const hasPeople = !!(metadata.people && metadata.people.length > 0);

      const isComplete = hasTitle && hasDate && hasPeople;

      if (isComplete) {
        this.logger.debug(`NFO complete: ${nfoPath}`);
      } else {
        this.logger.debug(`NFO incomplete: ${nfoPath} (title: ${hasTitle}, date: ${hasDate}, people: ${hasPeople})`);
      }

      return isComplete;
    } catch (error) {
      this.logger.warn(`Failed to read NFO for tagging check: ${nfoPath}`, error);
      return false;
    }
  }

  /**
   * Map a Jellyfin path to a container-accessible path
   * Extracts the relative path and prepends MEDIA_PATH
   */
  private mapToContainerPath(jellyfinPath: string): string | null {
    // If the path is already under mediaPath, return as-is
    if (jellyfinPath.startsWith(this.mediaPath)) {
      return jellyfinPath;
    }

    // Extract filename from Jellyfin's path
    const jellyfinFilename = basename(jellyfinPath);

    // Check if file exists directly under MEDIA_PATH (flat structure)
    const flatPath = join(this.mediaPath, jellyfinFilename);
    if (existsSync(flatPath) || existsSync(flatPath.replace(/\.[^/.]+$/, '.nfo'))) {
      return flatPath;
    }

    // Try with parent directory preserved (for nested structure)
    const jellyfinDir = dirname(jellyfinPath);
    const jellyfinParentDir = basename(jellyfinDir);
    const nestedPath = join(this.mediaPath, jellyfinParentDir, jellyfinFilename);
    if (existsSync(nestedPath) || existsSync(nestedPath.replace(/\.[^/.]+$/, '.nfo'))) {
      return nestedPath;
    }

    // Common pattern: Skip the first directory component (library root) and use the rest
    const pathParts = jellyfinPath.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      const relativePath = pathParts.slice(1).join('/');
      return join(this.mediaPath, relativePath);
    }

    // Fallback: use filename directly under MEDIA_PATH
    return flatPath;
  }

  /**
   * Get a single video by ID
   */
  async getVideoById(id: string): Promise<Video | null> {
    const item = await this.jellyfinService.getItem(id);
    if (!item) {
      return null;
    }

    const path = item.Path || '';
    const isTagged = this.checkIfTagged(path);
    const hasImage = !!item.ImageTags?.Primary;

    return {
      id: item.Id,
      filename: item.Name,
      path,
      isTagged,
      thumbnailUrl: this.jellyfinService.getThumbnailUrl(item.Id, hasImage),
    };
  }

  /**
   * Get existing metadata for a video from its NFO file
   */
  async getVideoMetadata(id: string): Promise<VideoMetadata | null> {
    const video = await this.getVideoById(id);
    if (!video) {
      throw new NotFoundException(`Video not found: ${id}`);
    }

    return this.nfoService.readNfo(video.path);
  }

  /**
   * Save metadata for a video to an NFO file
   */
  async saveVideoMetadata(
    id: string,
    metadata: VideoMetadata,
  ): Promise<Video> {
    const video = await this.getVideoById(id);
    if (!video) {
      throw new NotFoundException(`Video not found: ${id}`);
    }

    // Write NFO file (for persistence/backup)
    await this.nfoService.writeNfo(video.path, metadata);

    // Update Jellyfin metadata directly via API
    // This bypasses NFO refresh issues in Jellyfin 10.9+
    // NFO file is still written for backup/portability
    this.jellyfinService
      .updateItemMetadata(id, {
        title: metadata.title,
        date: metadata.date,
        description: metadata.description,
        tags: metadata.tags,
        people: metadata.people,
        rating: metadata.rating,
      })
      .catch((err) => {
        this.logger.warn(`Failed to update Jellyfin metadata for ${id}`, err);
      });

    // Return updated video (now tagged)
    return {
      ...video,
      isTagged: true,
    };
  }

  /**
   * Get Jellyfin public URL for constructing web player links
   * Uses JELLYFIN_PUBLIC_URL if set, otherwise falls back to internal URL
   */
  getJellyfinUrl(): string {
    return this.configService.jellyfinPublicUrl;
  }
}
