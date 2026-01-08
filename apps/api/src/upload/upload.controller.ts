import {
  Controller,
  Post,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Body,
  OnModuleInit,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiSuccessResponse, UploadResult } from '@family-video/shared';
import { UploadService } from './upload.service';
import { AppConfigService } from '../config';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

/** Response type for upload config endpoint */
interface UploadConfigResponse {
  maxSizeMb: number;
  supportedTypes: string[];
}

// Ensure upload temp directories exist at module load time
const uploadTempDir = join(tmpdir(), 'family-video-uploads');
const dvdFolderTempDir = join(uploadTempDir, 'dvd-folder');

if (!existsSync(uploadTempDir)) {
  mkdirSync(uploadTempDir, { recursive: true });
}
if (!existsSync(dvdFolderTempDir)) {
  mkdirSync(dvdFolderTempDir, { recursive: true });
}

@Controller('upload')
export class UploadController implements OnModuleInit {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly uploadService: UploadService,
    private readonly configService: AppConfigService,
  ) {}

  onModuleInit() {
    // Log temp directory paths for debugging
    this.logger.log(`Upload temp directory: ${uploadTempDir}`);
    this.logger.log(`DVD folder temp directory: ${dvdFolderTempDir}`);
  }

  /**
   * Get upload configuration (max size, supported types)
   */
  @Get('config')
  getConfig(): ApiSuccessResponse<UploadConfigResponse> {
    return {
      data: this.uploadService.getUploadConfig(),
      message: 'Upload configuration retrieved',
    };
  }

  /**
   * Upload a single video file
   * Accepts multipart/form-data with 'file' field
   * Uses disk storage to avoid memory issues with large files
   */
  @Post('video')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(tmpdir(), 'family-video-uploads'),
        filename: (_req, file, cb) => {
          // Use timestamp + random suffix to avoid collisions
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `upload-${uniqueSuffix}-${file.originalname}`);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB max (validated more precisely in service)
      },
    }),
  )
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiSuccessResponse<UploadResult>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const result = await this.uploadService.uploadVideo(file);
      return {
        data: result,
        message: `Successfully uploaded "${result.filename}"`,
      };
    } catch (error) {
      this.logger.error('Upload failed', error);

      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check for specific filesystem errors
      if (errorMessage.includes('EACCES') || errorMessage.includes('EPERM')) {
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
          507, // Insufficient Storage
        );
      }

      throw new HttpException(
        {
          error: 'Upload failed',
          details: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Upload a DVD VIDEO_TS as ZIP file and extract chapters
   * This is a long-running operation
   * Uses disk storage to avoid memory issues with large DVD ISOs
   */
  @Post('dvd')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(tmpdir(), 'family-video-uploads'),
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `dvd-${uniqueSuffix}-${file.originalname}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024 * 1024, // 10GB max for DVDs
      },
    }),
  )
  async uploadDvd(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiSuccessResponse<{ extractedFiles: string[] }>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate it's a ZIP file
    const isZip =
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.originalname.toLowerCase().endsWith('.zip');

    if (!isZip) {
      throw new BadRequestException('DVD upload must be a ZIP file containing VIDEO_TS folder');
    }

    try {
      this.logger.log(`Processing DVD upload: ${file.originalname} (${Math.round(file.size / (1024 * 1024))}MB)`);

      // TODO: In production, this should use a background job queue
      // For MVP, we process synchronously with a long timeout
      const extractedFiles = await this.uploadService.processUploadedDvdZip(file);

      return {
        data: { extractedFiles },
        message: `Successfully extracted ${extractedFiles.length} chapters from DVD`,
      };
    } catch (error) {
      this.logger.error('DVD extraction failed', error);

      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check for missing tools
      if (errorMessage.includes('lsdvd') || errorMessage.includes('command not found')) {
        throw new HttpException(
          {
            error: 'DVD tools not available',
            details: 'Server is missing required tools (lsdvd, ffmpeg) for DVD processing.',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        {
          error: 'DVD extraction failed',
          details: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Upload a VIDEO_TS folder as multiple files
   * Accepts multipart/form-data with 'files' field (array) and 'folderName' field
   * Each file should include its relative path in originalname
   */
  @Post('dvd-folder')
  @UseInterceptors(
    FilesInterceptor('files', 500, {
      storage: diskStorage({
        destination: join(tmpdir(), 'family-video-uploads', 'dvd-folder'),
        filename: (_req, file, cb) => {
          // Preserve the relative path structure by encoding slashes
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const safeName = file.originalname.replace(/\//g, '__SLASH__');
          cb(null, `${uniqueSuffix}-${safeName}`);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB max per file
      },
    }),
  )
  async uploadDvdFolder(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folderName') folderName: string,
    @Body('description') description?: string,
  ): Promise<ApiSuccessResponse<{ extractedFiles: string[] }>> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    if (!folderName) {
      throw new BadRequestException('Folder name is required');
    }

    // Validate that the files look like DVD content
    const hasVobFiles = files.some(
      (f) =>
        f.originalname.toLowerCase().endsWith('.vob') ||
        f.originalname.toLowerCase().endsWith('.ifo') ||
        f.originalname.toLowerCase().endsWith('.bup'),
    );

    if (!hasVobFiles) {
      throw new BadRequestException(
        'Invalid DVD folder: missing VOB/IFO files. Please select a VIDEO_TS folder.',
      );
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    this.logger.log(
      `Processing DVD folder upload: ${folderName} (${files.length} files, ${Math.round(totalSize / (1024 * 1024))}MB)`,
    );

    try {
      const extractedFiles = await this.uploadService.processUploadedDvdFolder(
        files,
        folderName,
        undefined, // onProgress callback
        description, // optional description for NFO files
      );

      return {
        data: { extractedFiles },
        message: `Successfully extracted ${extractedFiles.length} chapters from DVD`,
      };
    } catch (error) {
      this.logger.error('DVD folder extraction failed', error);

      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('lsdvd') || errorMessage.includes('command not found')) {
        throw new HttpException(
          {
            error: 'DVD tools not available',
            details: 'Server is missing required tools (lsdvd, ffmpeg) for DVD processing.',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        {
          error: 'DVD extraction failed',
          details: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
