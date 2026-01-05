'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NowPlayingVideo } from '@family-video/shared';
import { getNowPlaying } from '../lib/api';
import styles from './now-playing.module.css';

/** Polling interval for now playing (10 seconds) */
const POLL_INTERVAL_MS = 10000;

/** API base URL for constructing full thumbnail URLs */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Build full thumbnail URL from relative path */
function buildThumbnailUrl(relativePath: string | undefined): string | undefined {
  if (!relativePath) return undefined;
  return `${API_BASE}${relativePath}`;
}

interface NowPlayingProps {
  /** Callback when user clicks to select the now playing video */
  onSelect: (videoId: string) => void;
}

/**
 * Now Playing indicator component
 * Shows the currently playing video for the configured Jellyfin user
 * Polls the API every 10 seconds to detect playback changes
 */
export function NowPlaying({ onSelect }: NowPlayingProps) {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const result = await getNowPlaying();
      setNowPlaying(result);
    } catch (error) {
      // Non-critical - just log and continue
      console.warn('Failed to fetch now playing:', error);
      setNowPlaying(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchNowPlaying();

    const interval = setInterval(fetchNowPlaying, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchNowPlaying]);

  const handleClick = useCallback(() => {
    if (nowPlaying) {
      onSelect(nowPlaying.id);
    }
  }, [nowPlaying, onSelect]);

  // Don't render anything while loading initially
  if (isLoading) {
    return null;
  }

  // Don't render if nothing is playing
  if (!nowPlaying) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.label}>Now Playing</div>
      <button
        type="button"
        className={styles.nowPlaying}
        onClick={handleClick}
        title={`Click to select: ${nowPlaying.name}`}
      >
        {nowPlaying.thumbnailUrl && (
          <img
            src={buildThumbnailUrl(nowPlaying.thumbnailUrl)}
            alt=""
            className={styles.thumbnail}
          />
        )}
        <span className={styles.name}>{nowPlaying.name}</span>
      </button>
    </div>
  );
}
