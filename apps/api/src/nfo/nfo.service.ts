import { Injectable, Logger } from '@nestjs/common';
import { writeFile, rename, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, basename, extname, resolve } from 'path';
import type { VideoMetadata } from '@family-video/shared';
import { AppConfigService } from '../config';

@Injectable()
export class NfoService {
  private readonly logger = new Logger(NfoService.name);
  private readonly mediaPath: string;

  constructor(private readonly configService: AppConfigService) {
    this.mediaPath = this.configService.mediaPath;
  }

  /**
   * Generate NFO XML content from metadata
   */
  generateNfoXml(metadata: VideoMetadata): string {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<movie>',
      `  <title>${this.escapeXml(metadata.title)}</title>`,
    ];

    if (metadata.date) {
      lines.push(`  <premiered>${this.escapeXml(metadata.date)}</premiered>`);
      // Extract year for the year tag
      const year = metadata.date.split('-')[0];
      if (year) {
        lines.push(`  <year>${year}</year>`);
      }
    }

    if (metadata.rating !== undefined) {
      // Jellyfin expects rating on 0-10 scale
      lines.push(`  <rating>${metadata.rating}</rating>`);
    }

    if (metadata.description) {
      lines.push(`  <plot>${this.escapeXml(metadata.description)}</plot>`);
    }

    // Add people as actors
    if (metadata.people && metadata.people.length > 0) {
      for (const person of metadata.people) {
        lines.push('  <actor>');
        lines.push(`    <name>${this.escapeXml(person)}</name>`);
        lines.push('  </actor>');
      }
    }

    // Add tags for categorization
    if (metadata.tags && metadata.tags.length > 0) {
      for (const tag of metadata.tags) {
        lines.push(`  <tag>${this.escapeXml(tag)}</tag>`);
      }
    }

    // Add genre for home videos
    lines.push('  <genre>Home Video</genre>');

    lines.push('</movie>');

    return lines.join('\n');
  }

  /**
   * Escape special XML characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Unescape XML characters
   */
  private unescapeXml(str: string): string {
    return str
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&');
  }

  /**
   * Get the NFO file path for a video
   */
  getNfoPath(videoPath: string): string {
    const containerPath = this.mapToContainerPath(videoPath);
    const dir = dirname(containerPath);
    const name = basename(containerPath, extname(containerPath));
    return join(dir, `${name}.nfo`);
  }

  /**
   * Map Jellyfin path to container path
   * Jellyfin reports paths like /home-videos/... which matches our mount
   */
  private mapToContainerPath(jellyfinPath: string): string {
    // If path already starts with our media path, use it directly
    if (jellyfinPath.startsWith(this.mediaPath)) {
      const resolved = resolve(jellyfinPath);
      // Verify path stays within media path (prevent path traversal)
      if (!resolved.startsWith(resolve(this.mediaPath))) {
        this.logger.error(`Path traversal attempt detected: ${jellyfinPath}`);
        throw new Error('Invalid path');
      }
      return resolved;
    }

    // Common pattern: Jellyfin path is /home-videos/...
    // Our container also mounts to /home-videos
    // Extract everything after /home-videos and join with our media path
    const homeVideosMatch = jellyfinPath.match(/\/home-videos\/(.+)$/);
    if (homeVideosMatch) {
      const resolved = resolve(this.mediaPath, homeVideosMatch[1]);
      // Verify path stays within media path (prevent path traversal)
      if (!resolved.startsWith(resolve(this.mediaPath))) {
        this.logger.error(`Path traversal attempt detected: ${jellyfinPath}`);
        throw new Error('Invalid path');
      }
      return resolved;
    }

    // Fallback: try to find common path segments
    // This handles cases where paths might differ in prefix
    this.logger.warn(`Path mapping fallback for: ${jellyfinPath}`);
    return jellyfinPath;
  }

  /**
   * Write NFO file atomically (write to temp, then rename)
   */
  async writeNfo(videoPath: string, metadata: VideoMetadata): Promise<string> {
    const nfoPath = this.getNfoPath(videoPath);
    const tempPath = `${nfoPath}.tmp`;
    const dir = dirname(nfoPath);

    // Ensure directory exists
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const xmlContent = this.generateNfoXml(metadata);

    this.logger.debug(`Writing NFO to: ${nfoPath}`);

    // Atomic write: write to temp file first, then rename
    await writeFile(tempPath, xmlContent, 'utf-8');
    await rename(tempPath, nfoPath);

    this.logger.log(`NFO file written: ${nfoPath}`);

    return nfoPath;
  }

  /**
   * Read existing NFO file and parse metadata
   */
  async readNfo(videoPath: string): Promise<VideoMetadata | null> {
    const nfoPath = this.getNfoPath(videoPath);

    if (!existsSync(nfoPath)) {
      return null;
    }

    try {
      const content = await readFile(nfoPath, 'utf-8');
      return this.parseNfoXml(content);
    } catch (error) {
      this.logger.warn(`Failed to read NFO: ${nfoPath}`, error);
      return null;
    }
  }

  /**
   * Parse NFO XML content into metadata
   */
  private parseNfoXml(xml: string): VideoMetadata {
    const getTagContent = (tag: string): string | undefined => {
      const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      return match ? this.unescapeXml(match[1].trim()) : undefined;
    };

    const getAllTagContents = (tag: string): string[] => {
      const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
      const results: string[] = [];
      let match;
      while ((match = regex.exec(xml)) !== null) {
        results.push(this.unescapeXml(match[1].trim()));
      }
      return results;
    };

    const title = getTagContent('title') || '';
    const date = getTagContent('premiered');
    const ratingStr = getTagContent('rating');
    const description = getTagContent('plot');

    // Extract people from actor tags
    const actorBlocks = getAllTagContents('actor');
    const people: string[] = [];
    for (const block of actorBlocks) {
      const nameMatch = block.match(/<name>([^<]*)<\/name>/);
      if (nameMatch) {
        people.push(this.unescapeXml(nameMatch[1].trim()));
      }
    }

    // Extract tags
    const tags = getAllTagContents('tag');

    // Validate rating - ensure it's a valid number
    const parsedRating = ratingStr ? parseInt(ratingStr, 10) : undefined;
    const rating =
      parsedRating !== undefined && !isNaN(parsedRating)
        ? parsedRating
        : undefined;

    return {
      title,
      date,
      people,
      tags,
      rating,
      description,
    };
  }
}
