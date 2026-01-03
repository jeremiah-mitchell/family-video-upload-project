import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { Video } from '@family-video/shared';
import { JellyfinService } from '../jellyfin';
import { AppConfigService } from '../config';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);
  private readonly mediaPath: string;

  constructor(
    private readonly jellyfinService: JellyfinService,
    private readonly configService: AppConfigService,
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
   */
  private checkIfTagged(videoPath: string): boolean {
    if (!videoPath) {
      return false;
    }

    // Construct NFO path by replacing video extension with .nfo
    const dir = dirname(videoPath);
    const name = basename(videoPath, extname(videoPath));
    const nfoPath = join(dir, `${name}.nfo`);

    // Check if NFO file exists
    // Note: In container, paths are relative to mounted media volume
    const exists = existsSync(nfoPath);

    if (exists) {
      this.logger.debug(`NFO found: ${nfoPath}`);
    }

    return exists;
  }
}
