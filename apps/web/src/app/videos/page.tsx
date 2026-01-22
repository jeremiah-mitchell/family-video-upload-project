'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Video } from '@family-video/shared';
import { VideoList } from '../../components/video-list';
import { FilterDropdown, type FilterValue } from '../../components/filter-dropdown';
import { NowPlaying } from '../../components/now-playing';
import { getVideos, ApiError } from '../../lib/api';
import styles from './page.module.css';

export default function VideosPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>('untagged');

  // Fetch videos on mount
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        const videosData = await getVideos();
        setVideos(videosData);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.details || err.message);
        } else if (err instanceof TypeError) {
          setError('Could not connect to server. Please check your connection.');
        } else if (err instanceof DOMException && err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  // Client-side filtering based on isTagged property
  const filteredVideos = useMemo(() => {
    if (filter === 'all') return videos;
    return videos.filter((v) => (filter === 'tagged' ? v.isTagged : !v.isTagged));
  }, [videos, filter]);

  // Progress counter
  const taggedCount = useMemo(() => videos.filter((v) => v.isTagged).length, [videos]);
  const totalCount = videos.length;

  // Navigate to tag page when video is selected
  const handleVideoSelect = useCallback((video: Video) => {
    router.push(`/videos/${video.id}/tag`);
  }, [router]);

  const handleFilterChange = useCallback((newFilter: FilterValue) => {
    setFilter(newFilter);
  }, []);

  // Navigate to tag page when Now Playing is clicked
  const handleNowPlayingSelect = useCallback((videoId: string) => {
    router.push(`/videos/${videoId}/tag`);
  }, [router]);

  return (
    <main className={styles.main}>
      <section className={styles.listPanel}>
        <div className={styles.panelHeaderRow}>
          <Link href="/" className={styles.backLink}>
            <span aria-hidden="true">&larr;</span> Home
          </Link>
        </div>
        <div className={styles.panelContent}>
          <div className={styles.videoListWrapper}>
            <NowPlaying onSelect={handleNowPlayingSelect} />
            <div className={styles.listHeader}>
              <span className={styles.videoCount}>
                {!isLoading ? `${filteredVideos.length} videos` : 'Loading...'}
              </span>
              {!isLoading && !error && (
                <FilterDropdown value={filter} onChange={handleFilterChange} />
              )}
            </div>
            <div className={styles.videoListContainer}>
              <VideoList
                videos={filteredVideos}
                selectedVideoId={null}
                onVideoSelect={handleVideoSelect}
                isLoading={isLoading}
                error={error}
                emptyMessage={
                  filter === 'untagged'
                    ? 'All videos have been tagged!'
                    : filter === 'tagged'
                      ? 'No tagged videos yet'
                      : 'No videos found in library'
                }
              />
            </div>
          </div>
        </div>
        {!isLoading && !error && totalCount > 0 && (
          <div className={styles.progressCounter}>
            Tagged: {taggedCount} / {totalCount}
          </div>
        )}
      </section>
    </main>
  );
}
