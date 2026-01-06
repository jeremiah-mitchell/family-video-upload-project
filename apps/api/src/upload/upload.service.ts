import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { writeFile, mkdir, unlink, readdir, stat, rm, rename, copyFile, readFile } from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import { join, extname, basename, normalize, resolve } from 'path';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { UploadResult, DvdChapter, DvdExtractionProgress } from '@family-video/shared';
import { AppConfigService } from '../config';
import { JellyfinService } from '../jellyfin';

const execFileAsync = promisify(execFile);

/** Supported video MIME types */
const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-matroska', // .mkv
  'video/mpeg',
  'video/webm',
];

/** Supported video extensions (for DVD extraction output validation) */
const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.mpeg', '.webm'];

/** DVD file patterns */
const DVD_IFO_PATTERN = /\.ifo$/i;
const DVD_VOB_PATTERN = /^vts_\d+_[1-9]\.vob$/i;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly mediaPath: string;

  constructor(
    private readonly configService: AppConfigService,
    private readonly jellyfinService: JellyfinService,
  ) {
    this.mediaPath = this.configService.mediaPath;
  }

  /**
   * Validate that a file is a supported video type
   */
  validateVideoFile(file: Express.Multer.File): void {
    if (!SUPPORTED_VIDEO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Supported types: MP4, MOV, AVI, MKV, MPEG, WebM`,
      );
    }

    const maxSize = this.configService.maxUploadSizeBytes;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large: ${Math.round(file.size / (1024 * 1024))}MB. Maximum size: ${this.configService.maxUploadSizeMb}MB`,
      );
    }
  }

  /**
   * Upload a single video file to the media directory
   * Supports both memory storage (file.buffer) and disk storage (file.path)
   * Uses atomic move/copy for safety
   * Always generates unique filename: YYYY-MM-DD_{hash}_{originalName}.ext
   */
  async uploadVideo(file: Express.Multer.File): Promise<UploadResult> {
    this.validateVideoFile(file);

    // Sanitize and generate unique filename
    // Format: YYYY-MM-DD_{shortHash}_{originalName}.ext
    // This ensures uniqueness and groups uploads by date for easy organization
    const sanitizedName = this.sanitizeFilename(file.originalname);
    const ext = extname(sanitizedName);
    const base = basename(sanitizedName, ext);
    const datePrefix = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const shortHash = Math.random().toString(36).slice(2, 8); // 6-char random
    const uniqueName = `${datePrefix}_${shortHash}_${base}${ext}`;
    const targetPath = join(this.mediaPath, uniqueName);

    return this.saveFile(file, targetPath, uniqueName);
  }

  /**
   * Save file atomically (write to temp, then rename)
   * Handles race conditions by catching EEXIST and adding unique suffix
   * Supports both disk storage (file.path) and memory storage (file.buffer)
   */
  private async saveFile(
    file: Express.Multer.File,
    targetPath: string,
    filename: string,
  ): Promise<UploadResult> {
    const tempPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
    const sourcePath = file.path; // Will be set if disk storage is used

    try {
      // Ensure directory exists
      const dir = join(this.mediaPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      // Handle disk storage (file.path is set) vs memory storage (file.buffer)
      if (sourcePath) {
        // Disk storage - move or copy the temp file
        // Try rename first (fast, same filesystem), fall back to copy+delete (cross-filesystem)
        try {
          await rename(sourcePath, tempPath);
        } catch (renameErr: unknown) {
          const err = renameErr as NodeJS.ErrnoException;
          if (err.code === 'EXDEV') {
            // Cross-device link - copy then delete
            await copyFile(sourcePath, tempPath);
            await unlink(sourcePath).catch(() => {});
          } else {
            throw renameErr;
          }
        }
      } else if (file.buffer) {
        // Memory storage - write buffer to temp file
        await writeFile(tempPath, file.buffer);
      } else {
        throw new BadRequestException('No file data available');
      }

      // Move temp file to final destination
      // Handle race condition: if file was created between check and rename
      try {
        await rename(tempPath, targetPath);
      } catch (renameError: unknown) {
        const err = renameError as NodeJS.ErrnoException;
        if (err.code === 'EEXIST') {
          // File appeared between check and rename - add timestamp suffix
          const ext = extname(filename);
          const base = basename(filename, ext);
          const timestamp = Date.now();
          const uniqueName = `${base}_${timestamp}${ext}`;
          const uniquePath = join(this.mediaPath, uniqueName);
          await rename(tempPath, uniquePath);

          this.logger.log(`Uploaded video (conflict resolved): ${uniqueName} (${Math.round(file.size / 1024)}KB)`);

          this.jellyfinService.refreshHomeVideosLibrary().catch((err) => {
            this.logger.warn('Failed to trigger library refresh', err);
          });

          return {
            filename: uniqueName,
            size: file.size,
            mimeType: file.mimetype,
          };
        }
        throw renameError;
      }

      this.logger.log(`Uploaded video: ${filename} (${Math.round(file.size / 1024)}KB)`);

      // Trigger Jellyfin Home Videos library refresh (non-blocking)
      this.jellyfinService.refreshHomeVideosLibrary().catch((err) => {
        this.logger.warn('Failed to trigger library refresh', err);
      });

      return {
        filename,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      // Clean up temp file if it exists
      try {
        if (existsSync(tempPath)) {
          await unlink(tempPath);
        }
      } catch {
        // Ignore cleanup errors
      }
      // Clean up source file if it was disk storage
      if (sourcePath) {
        try {
          if (existsSync(sourcePath)) {
            await unlink(sourcePath);
          }
        } catch {
          // Ignore cleanup errors
        }
      }
      throw error;
    }
  }

  /**
   * Sanitize filename to prevent path traversal and other issues
   */
  private sanitizeFilename(filename: string): string {
    // Remove path components
    const name = basename(filename);
    // Replace problematic characters
    return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
  }

  /**
   * Check if a directory contains DVD VIDEO_TS structure
   */
  async isDvdDirectory(dirPath: string): Promise<boolean> {
    try {
      const files = await readdir(dirPath);
      const hasIfo = files.some((f) => DVD_IFO_PATTERN.test(f));
      const hasVob = files.some((f) => DVD_VOB_PATTERN.test(f));
      return hasIfo && hasVob;
    } catch {
      return false;
    }
  }

  /**
   * Parse DVD chapter information using lsdvd
   * Returns array of chapters with timing information
   */
  async parseDvdChapters(dvdPath: string): Promise<DvdChapter[]> {
    this.logger.debug(`Parsing DVD chapters from: ${dvdPath}`);

    try {
      // Run lsdvd to get chapter info using execFile to prevent command injection
      const { stdout } = await execFileAsync('lsdvd', ['-x', '-Oy', dvdPath], {
        timeout: 30000, // 30s timeout
      });

      // Parse chapter info from lsdvd Python output
      // Look for chapter entries within track blocks
      const trackPattern = /'ix'\s*:\s*1,\s*'length'\s*:\s*([\d.]+).*?'chapter'\s*:\s*\[(.*?)\]/s;
      const trackMatch = stdout.match(trackPattern);

      if (!trackMatch) {
        throw new Error('Could not find chapter info in DVD structure');
      }

      const chaptersBlock = trackMatch[2];
      const chapterPattern = /'ix'\s*:\s*(\d+),\s*'length'\s*:\s*([\d.]+)/g;
      const chapters: DvdChapter[] = [];
      let startTime = 0;
      let match;

      while ((match = chapterPattern.exec(chaptersBlock)) !== null) {
        const index = parseInt(match[1], 10);
        const duration = parseFloat(match[2]);

        chapters.push({
          index,
          duration,
          startTime,
        });

        startTime += duration;
      }

      this.logger.log(`Parsed ${chapters.length} chapters from DVD`);
      return chapters;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to parse DVD: ${message}`);
      throw new BadRequestException(`Failed to parse DVD structure: ${message}`);
    }
  }

  /**
   * Extract chapters from DVD VIDEO_TS folder to MP4 files
   * This is a long-running operation - consider using background job in production
   */
  async extractDvdChapters(
    dvdPath: string,
    outputPrefix: string,
    onProgress?: (progress: DvdExtractionProgress) => void,
  ): Promise<string[]> {
    // Verify VIDEO_TS structure
    const videoTsPath = join(dvdPath, 'VIDEO_TS');
    if (!existsSync(videoTsPath)) {
      throw new BadRequestException('VIDEO_TS folder not found');
    }

    // Report analyzing status
    onProgress?.({
      status: 'analyzing',
    });

    // Parse chapters
    const chapters = await this.parseDvdChapters(dvdPath);
    if (chapters.length === 0) {
      throw new BadRequestException('No chapters found in DVD');
    }

    onProgress?.({
      status: 'extracting',
      totalChapters: chapters.length,
      currentChapter: 0,
    });

    // Find VOB files
    const files = await readdir(videoTsPath);
    const vobFiles = files
      .filter((f) => DVD_VOB_PATTERN.test(f))
      .sort()
      .map((f) => join(videoTsPath, f));

    if (vobFiles.length === 0) {
      throw new BadRequestException('No VOB files found in VIDEO_TS');
    }

    // Build concat input
    const concatPath = `concat:${vobFiles.join('|')}`;
    const extractedFiles: string[] = [];

    // Generate unique date prefix for this extraction batch
    const datePrefix = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const batchHash = Math.random().toString(36).slice(2, 8); // 6-char random for this batch

    // Extract each chapter
    for (const chapter of chapters) {
      const outputFilename = `${datePrefix}_${batchHash}_${outputPrefix}_ch${String(chapter.index).padStart(2, '0')}.mp4`;
      const outputPath = join(this.mediaPath, outputFilename);

      onProgress?.({
        status: 'extracting',
        totalChapters: chapters.length,
        currentChapter: chapter.index,
        currentFilename: outputFilename,
      });

      try {
        // Skip very short chapters (< 3 seconds)
        if (chapter.duration < 3) {
          this.logger.warn(`Skipping chapter ${chapter.index}: too short (${chapter.duration}s)`);
          continue;
        }

        // Extract chapter using ffmpeg with execFile to prevent command injection
        const ffmpegArgs = [
          '-y',
          '-hide_banner', '-loglevel', 'warning',
          '-analyzeduration', '100M',
          '-probesize', '100M',
          '-i', concatPath,
          '-ss', String(chapter.startTime),
          '-t', String(chapter.duration),
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
          '-c:a', 'aac', '-b:a', '192k',
          '-metadata', `title=Chapter ${String(chapter.index).padStart(2, '0')}`,
          '-metadata', `track=${chapter.index}/${chapters.length}`,
          outputPath,
        ];

        await execFileAsync('ffmpeg', ffmpegArgs, {
          timeout: 300000, // 5 minute timeout per chapter
        });

        // Verify output file exists and has reasonable size
        const stats = await stat(outputPath);
        if (stats.size > 1000) {
          extractedFiles.push(outputFilename);
          this.logger.log(
            `Extracted chapter ${chapter.index}: ${outputFilename} (${Math.round(stats.size / (1024 * 1024))}MB)`,
          );
        } else {
          this.logger.warn(`Chapter ${chapter.index} extraction produced invalid file`);
          await unlink(outputPath).catch(() => {});
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to extract chapter ${chapter.index}: ${message}`);
        // Continue with other chapters
      }
    }

    if (extractedFiles.length === 0) {
      throw new BadRequestException('Failed to extract any chapters from DVD');
    }

    // Trigger Jellyfin Home Videos library refresh
    this.jellyfinService.refreshHomeVideosLibrary().catch((err) => {
      this.logger.warn('Failed to trigger library refresh', err);
    });

    onProgress?.({
      status: 'complete',
      totalChapters: chapters.length,
      extractedFiles,
    });

    this.logger.log(`DVD extraction complete: ${extractedFiles.length}/${chapters.length} chapters`);
    return extractedFiles;
  }

  /**
   * Process an uploaded ZIP file containing VIDEO_TS
   * Extracts ZIP, processes DVD, and cleans up
   * Supports both disk storage (file.path) and memory storage (file.buffer)
   */
  async processUploadedDvdZip(
    file: Express.Multer.File,
    onProgress?: (progress: DvdExtractionProgress) => void,
  ): Promise<string[]> {
    // Create temp directory for extraction
    const tempDir = join(this.mediaPath, `.tmp_dvd_${Date.now()}`);
    const sourcePath = file.path; // Will be set if disk storage is used

    try {
      await mkdir(tempDir, { recursive: true });

      // Get the ZIP file path - either use disk storage path or write buffer
      let zipPath: string;
      if (sourcePath) {
        // Disk storage - move the uploaded file to our temp dir
        zipPath = join(tempDir, 'upload.zip');
        try {
          await rename(sourcePath, zipPath);
        } catch (renameErr: unknown) {
          const err = renameErr as NodeJS.ErrnoException;
          if (err.code === 'EXDEV') {
            // Cross-device link - copy then delete
            await copyFile(sourcePath, zipPath);
            await unlink(sourcePath).catch(() => {});
          } else {
            throw renameErr;
          }
        }
      } else if (file.buffer) {
        // Memory storage - write buffer to temp file
        zipPath = join(tempDir, 'upload.zip');
        await writeFile(zipPath, file.buffer);
      } else {
        throw new BadRequestException('No file data available');
      }

      // Extract ZIP using execFile to prevent command injection
      await execFileAsync('unzip', ['-q', zipPath, '-d', tempDir], {
        timeout: 60000, // 1 minute timeout for extraction
      });

      // Validate all extracted paths to prevent ZIP slip attacks
      const validateExtractedPaths = async (dir: string, rootDir: string): Promise<void> => {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = join(dir, entry.name);
          const resolvedPath = resolve(entryPath);
          const resolvedRoot = resolve(rootDir);

          // Check for path traversal - resolved path must be within root
          if (!resolvedPath.startsWith(resolvedRoot + '/') && resolvedPath !== resolvedRoot) {
            throw new BadRequestException(
              `ZIP file contains path traversal attempt: ${entry.name}`,
            );
          }

          if (entry.isDirectory()) {
            await validateExtractedPaths(entryPath, rootDir);
          }
        }
      };

      // Validate extracted contents
      await validateExtractedPaths(tempDir, tempDir);

      // Find VIDEO_TS directory
      const findVideoTs = async (dir: string): Promise<string | null> => {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (entry.name.toUpperCase() === 'VIDEO_TS') {
              return dir; // Return parent of VIDEO_TS
            }
            const subResult = await findVideoTs(join(dir, entry.name));
            if (subResult) return subResult;
          }
        }
        return null;
      };

      const dvdPath = await findVideoTs(tempDir);
      if (!dvdPath) {
        throw new BadRequestException('No VIDEO_TS folder found in ZIP');
      }

      // Generate output prefix from original filename
      const baseName = basename(file.originalname, extname(file.originalname));
      const sanitizedPrefix = this.sanitizeFilename(baseName);

      // Extract chapters
      const extractedFiles = await this.extractDvdChapters(dvdPath, sanitizedPrefix, onProgress);

      return extractedFiles;
    } finally {
      // Clean up temp directory
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch (err) {
        this.logger.warn(`Failed to clean up temp directory: ${tempDir}`, err);
      }
    }
  }

  /**
   * Process uploaded DVD folder files
   * Reconstructs the folder structure and extracts chapters
   */
  async processUploadedDvdFolder(
    files: Express.Multer.File[],
    folderName: string,
    onProgress?: (progress: DvdExtractionProgress) => void,
  ): Promise<string[]> {
    // Create temp directory for reconstructing DVD structure
    const tempDir = join(this.mediaPath, `.tmp_dvd_folder_${Date.now()}`);

    try {
      // Create VIDEO_TS directory
      const videoTsDir = join(tempDir, 'VIDEO_TS');
      await mkdir(videoTsDir, { recursive: true });

      this.logger.log(`Reconstructing DVD structure in ${tempDir}`);

      // Move each uploaded file to the correct location
      for (const file of files) {
        // Get the original relative path from the filename
        // Files are named like: originalname which contains the relative path
        const relativePath = file.originalname;

        // Extract just the filename (last component after any slashes)
        const fileName = basename(relativePath);

        // Determine target path - put all files in VIDEO_TS
        const targetPath = join(videoTsDir, fileName);

        // Move the uploaded file
        try {
          await rename(file.path, targetPath);
        } catch (renameErr: unknown) {
          const err = renameErr as NodeJS.ErrnoException;
          if (err.code === 'EXDEV') {
            // Cross-device - copy then delete
            await copyFile(file.path, targetPath);
            await unlink(file.path).catch(() => {});
          } else {
            throw renameErr;
          }
        }

        this.logger.debug(`Moved ${fileName} to VIDEO_TS`);
      }

      // Verify we have valid DVD structure
      const isValid = await this.isDvdDirectory(videoTsDir);
      if (!isValid) {
        throw new BadRequestException(
          'Invalid DVD folder structure: missing required VOB/IFO files',
        );
      }

      // Generate output prefix from folder name
      const sanitizedPrefix = this.sanitizeFilename(
        folderName.replace(/VIDEO_TS/i, '').replace(/[_\s]+$/, '') || 'DVD',
      );

      // Extract chapters
      const extractedFiles = await this.extractDvdChapters(
        tempDir,
        sanitizedPrefix,
        onProgress,
      );

      return extractedFiles;
    } finally {
      // Clean up temp directory
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch (err) {
        this.logger.warn(`Failed to clean up temp directory: ${tempDir}`, err);
      }

      // Also clean up any remaining uploaded temp files
      for (const file of files) {
        try {
          if (existsSync(file.path)) {
            await unlink(file.path);
          }
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Get upload configuration for frontend
   */
  getUploadConfig(): { maxSizeMb: number; supportedTypes: string[] } {
    return {
      maxSizeMb: this.configService.maxUploadSizeMb,
      supportedTypes: SUPPORTED_VIDEO_TYPES,
    };
  }
}
