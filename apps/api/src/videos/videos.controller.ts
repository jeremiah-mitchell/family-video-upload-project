import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiSuccessResponse,
  Video,
  VideoMetadata,
  videoMetadataSchema,
  NowPlayingVideo,
} from '@family-video/shared';
import { VideosService } from './videos.service';
import { JellyfinService } from '../jellyfin';
import { AppConfigService } from '../config';

/** Response type for config endpoint */
interface ConfigResponse {
  jellyfinUrl: string;
}

@Controller('videos')
export class VideosController {
  private readonly logger = new Logger(VideosController.name);

  constructor(
    private readonly videosService: VideosService,
    private readonly jellyfinService: JellyfinService,
    private readonly configService: AppConfigService,
  ) {}

  @Get()
  async getAllVideos(): Promise<ApiSuccessResponse<Video[]>> {
    try {
      const videos = await this.videosService.getAllVideos();

      return {
        data: videos,
        message: `Retrieved ${videos.length} videos from Jellyfin`,
      };
    } catch (error) {
      this.logger.error('Failed to fetch videos', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Determine if this is a connection error
      const isConnectionError =
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ENOTFOUND');

      if (isConnectionError) {
        throw new HttpException(
          {
            error: 'Failed to connect to Jellyfin',
            details: 'Could not connect to Jellyfin server. Check your connection.',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Authentication or other API errors
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        throw new HttpException(
          {
            error: 'Jellyfin authentication failed',
            details: 'Invalid API key or insufficient permissions.',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Generic error
      throw new HttpException(
        {
          error: 'Failed to fetch videos',
          details: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get the Jellyfin URL for the frontend to construct web player links
   */
  @Get('config')
  getConfig(): ApiSuccessResponse<ConfigResponse> {
    return {
      data: {
        jellyfinUrl: this.videosService.getJellyfinUrl(),
      },
      message: 'Configuration retrieved',
    };
  }

  /**
   * Get currently playing video for the configured user
   * Used by the Now Playing indicator
   * Note: Must be defined before :id routes to avoid route conflicts
   */
  @Get('now-playing')
  async getNowPlaying(): Promise<ApiSuccessResponse<NowPlayingVideo | null>> {
    const username = this.configService.jellyfinUser;

    try {
      const nowPlaying = await this.jellyfinService.getNowPlaying(username);

      if (!nowPlaying) {
        return {
          data: null,
          message: 'No video currently playing',
        };
      }

      const hasImage = !!nowPlaying.ImageTags?.Primary;

      return {
        data: {
          id: nowPlaying.Id,
          name: nowPlaying.Name,
          thumbnailUrl: this.jellyfinService.getThumbnailUrl(
            nowPlaying.Id,
            hasImage,
          ),
        },
        message: `Now playing: ${nowPlaying.Name}`,
      };
    } catch (error) {
      this.logger.error('Failed to get now playing', error);

      // Return null instead of throwing - now playing is non-critical
      return {
        data: null,
        message: 'Could not check now playing status',
      };
    }
  }

  /**
   * Get existing metadata for a video
   */
  @Get(':id/metadata')
  async getMetadata(
    @Param('id') id: string,
  ): Promise<ApiSuccessResponse<VideoMetadata | null>> {
    try {
      const metadata = await this.videosService.getVideoMetadata(id);
      return {
        data: metadata,
        message: metadata ? 'Metadata retrieved' : 'No metadata found',
      };
    } catch (error) {
      this.logger.error(`Failed to get metadata for ${id}`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          error: 'Failed to get metadata',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Save metadata for a video
   */
  @Post(':id/metadata')
  async saveMetadata(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ApiSuccessResponse<Video>> {
    // Validate request body
    const parseResult = videoMetadataSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        {
          error: 'Invalid metadata',
          details: parseResult.error.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', '),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const video = await this.videosService.saveVideoMetadata(
        id,
        parseResult.data,
      );

      return {
        data: video,
        message: `Saved metadata for "${parseResult.data.title}"`,
      };
    } catch (error) {
      this.logger.error(`Failed to save metadata for ${id}`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Check for file system errors
      if (
        errorMessage.includes('EACCES') ||
        errorMessage.includes('EPERM')
      ) {
        throw new HttpException(
          {
            error: 'Permission denied',
            details: 'Cannot write to media directory. Check file permissions.',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      if (errorMessage.includes('ENOSPC')) {
        throw new HttpException(
          {
            error: 'Disk full',
            details: 'No space left on device.',
          },
          507, // 507 Insufficient Storage
        );
      }

      throw new HttpException(
        {
          error: 'Failed to save metadata',
          details: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Proxy endpoint for video thumbnails
   * Fetches images from Jellyfin without exposing API key to frontend
   */
  @Get(':id/thumbnail')
  async getThumbnail(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const imageData = await this.jellyfinService.getThumbnailImage(id);

    if (!imageData) {
      res.status(HttpStatus.NOT_FOUND).send();
      return;
    }

    // Set appropriate headers for image response
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': imageData.length,
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    });

    res.send(imageData);
  }
}
