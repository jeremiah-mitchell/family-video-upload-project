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
      };
    });

    this.logger.log(
      `Processed ${videos.length} videos (${videos.filter((v) => v.isTagged).length} tagged)`,
    );

    return videos;
  }

  /**
   * Check if a video has an associated NFO file
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

    const exists = existsSync(nfoPath);

    if (exists) {
      this.logger.debug(`NFO found: ${nfoPath}`);
    }

    return exists;
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

    // Extract filename and try to construct path under MEDIA_PATH
    // This handles cases where Jellyfin path is /mnt/NAS/Videos/sub/file.mp4
    // and container has /media mounted to the same content
    const filename = basename(jellyfinPath);
    const parentDir = basename(dirname(jellyfinPath));

    // Try to find the file by walking up and matching structure
    // For simplicity in MVP, we use the filename directly under mediaPath subdirectories
    // This is a best-effort mapping - in production, consider storing path mappings
    const relativePath = jellyfinPath.split('/').slice(-2).join('/');
    const mappedPath = join(this.mediaPath, relativePath);

    return mappedPath;
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

    // Write NFO file
    await this.nfoService.writeNfo(video.path, metadata);

    // Trigger Jellyfin library refresh (best-effort, non-blocking)
    this.jellyfinService.refreshLibrary().catch((err) => {
      this.logger.warn('Failed to trigger library refresh', err);
    });

    // Return updated video (now tagged)
    return {
      ...video,
      isTagged: true,
    };
  }

  /**
   * Get Jellyfin base URL for constructing web player links
   */
  getJellyfinUrl(): string {
    return this.jellyfinService.getBaseUrl();
  }
}
