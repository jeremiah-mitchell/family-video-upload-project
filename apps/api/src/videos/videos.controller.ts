import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiSuccessResponse, Video } from '@family-video/shared';
import { VideosService } from './videos.service';

@Controller('videos')
export class VideosController {
  private readonly logger = new Logger(VideosController.name);

  constructor(private readonly videosService: VideosService) {}

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
}
