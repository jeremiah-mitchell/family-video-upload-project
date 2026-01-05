'use client';

import type { KeyboardEvent } from 'react';
import type { Video } from '@family-video/shared';
import styles from './video-list.module.css';

export interface VideoListProps {
  videos: Video[];
  selectedVideoId: string | null;
  onVideoSelect: (video: Video) => void;
  isLoading: boolean;
  error: string | null;
  emptyMessage?: string;
}

export function VideoList({
  videos,
  selectedVideoId,
  onVideoSelect,
  isLoading,
  error,
  emptyMessage = 'No videos found in library',
}: VideoListProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLLIElement>, video: Video) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onVideoSelect(video);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p className={styles.errorTitle}>Error loading videos</p>
          <p className={styles.errorMessage}>{error}</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ul className={styles.list} aria-label="Video library">
        {videos.map((video) => (
          <li
            key={video.id}
            role="button"
            tabIndex={0}
            className={`${styles.item} ${video.id === selectedVideoId ? styles.selected : ''} ${video.isTagged ? styles.tagged : ''}`}
            onClick={() => onVideoSelect(video)}
            onKeyDown={(e) => handleKeyDown(e, video)}
            aria-selected={video.id === selectedVideoId}
          >
            {video.isTagged && <span className={styles.taggedIcon} aria-label="Tagged">✓</span>}
            <span className={styles.filename}>{video.filename}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
