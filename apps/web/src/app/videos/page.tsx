'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { Video, VideoMetadata } from '@family-video/shared';
import { VideoList } from '../../components/video-list';
import { FilterDropdown, type FilterValue } from '../../components/filter-dropdown';
import { TaggingForm } from '../../components/tagging-form';
import { ToastContainer, useToasts } from '../../components/toast';
import { NowPlaying } from '../../components/now-playing';
import { getVideos, getConfig, getVideoMetadata, saveVideoMetadata, ApiError } from '../../lib/api';
import styles from './page.module.css';

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>('untagged');
  const [jellyfinUrl, setJellyfinUrl] = useState('');
  const [existingMetadata, setExistingMetadata] = useState<VideoMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [lastSavedMetadata, setLastSavedMetadata] = useState<VideoMetadata | null>(null);
  const [isListCollapsed, setIsListCollapsed] = useState(true);

  const { toasts, dismissToast, showSuccess, showError } = useToasts();

  // Fetch videos and config on mount
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        const [videosData, configData] = await Promise.all([
          getVideos(),
          getConfig(),
        ]);

        setVideos(videosData);
        setJellyfinUrl(configData.jellyfinUrl);
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

  // Load existing metadata when a video is selected
  useEffect(() => {
    async function loadMetadata() {
      if (!selectedVideo) {
        setExistingMetadata(null);
        return;
      }

      // Only load metadata if the video is tagged
      if (!selectedVideo.isTagged) {
        setExistingMetadata(null);
        return;
      }

      try {
        setIsLoadingMetadata(true);
        const metadata = await getVideoMetadata(selectedVideo.id);
        setExistingMetadata(metadata);
      } catch (err) {
        // Non-critical error - just log and continue
        console.warn('Failed to load metadata:', err);
        setExistingMetadata(null);
      } finally {
        setIsLoadingMetadata(false);
      }
    }

    loadMetadata();
  }, [selectedVideo?.id, selectedVideo?.isTagged]);

  // Client-side filtering based on isTagged property
  const filteredVideos = useMemo(() => {
    if (filter === 'all') return videos;
    return videos.filter((v) => (filter === 'tagged' ? v.isTagged : !v.isTagged));
  }, [videos, filter]);

  // Progress counter
  const taggedCount = useMemo(() => videos.filter((v) => v.isTagged).length, [videos]);
  const totalCount = videos.length;

  const handleVideoSelect = useCallback((video: Video) => {
    setSelectedVideo(video);
    // Collapse list after selection on mobile for better UX
    if (window.innerWidth <= 768) {
      setIsListCollapsed(true);
    }
  }, []);

  const handleFilterChange = useCallback((newFilter: FilterValue) => {
    setFilter(newFilter);
    // Clear selection if selected video is not in filtered list
    if (selectedVideo) {
      const isInFiltered =
        newFilter === 'all' ||
        (newFilter === 'tagged' ? selectedVideo.isTagged : !selectedVideo.isTagged);
      if (!isInFiltered) {
        setSelectedVideo(null);
      }
    }
  }, [selectedVideo]);

  const handleSave = useCallback(async (videoId: string, metadata: VideoMetadata) => {
    try {
      const updatedVideo = await saveVideoMetadata(videoId, metadata);

      // Update video in list
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? updatedVideo : v))
      );

      // Update selected video
      setSelectedVideo(updatedVideo);

      // Store last saved metadata for "Copy from Previous" feature
      setLastSavedMetadata(metadata);

      // Show success toast
      showSuccess(`Saved: ${metadata.title}`);
    } catch (err) {
      // Show error toast with user-friendly message
      let errorMessage = 'Save failed';
      if (err instanceof ApiError) {
        errorMessage = `Save failed: ${err.details || err.message}`;
      } else if (err instanceof TypeError) {
        errorMessage = 'Save failed: Could not connect to server';
      } else if (err instanceof Error) {
        errorMessage = `Save failed: ${err.message}`;
      }

      showError(errorMessage);

      // Re-throw to let form know save failed (keeps form state)
      throw err;
    }
  }, [showSuccess, showError]);

  // Handle Now Playing selection - find video by ID and select it
  const handleNowPlayingSelect = useCallback((videoId: string) => {
    const video = videos.find((v) => v.id === videoId);
    if (video) {
      setSelectedVideo(video);
      // Also switch filter to 'all' if the video wouldn't be visible
      const isInFiltered =
        filter === 'all' ||
        (filter === 'tagged' ? video.isTagged : !video.isTagged);
      if (!isInFiltered) {
        setFilter('all');
      }
      // Expand list when selecting from Now Playing
      setIsListCollapsed(false);
    }
  }, [videos, filter]);

  const handleToggleList = useCallback(() => {
    setIsListCollapsed((prev) => !prev);
  }, []);

  return (
    <main className={styles.main}>
      <section className={styles.leftPanel}>
        <div className={styles.panelHeaderRow}>
          <div className={styles.headerLeft}>
            <Link href="/" className={styles.backLink} aria-label="Back to home">
              <span aria-hidden="true">&larr;</span>
            </Link>
            <h2 className={styles.panelHeader}>Videos</h2>
          </div>
          <Link href="/upload" className={styles.addButton}>
            + Add Video
          </Link>
        </div>
        <div className={`${styles.panelContent} ${isListCollapsed ? styles.panelContentCollapsed : ''}`}>
          <div className={`${styles.videoListWrapper} ${isListCollapsed ? styles.videoListWrapperCollapsed : ''}`}>
            <NowPlaying onSelect={handleNowPlayingSelect} />
            <div className={styles.listHeader}>
              <button
                type="button"
                className={styles.collapseToggle}
                onClick={handleToggleList}
                aria-expanded={!isListCollapsed}
                aria-controls="video-list"
              >
                <span className={styles.collapseIcon} aria-hidden="true">
                  {isListCollapsed ? '>' : 'v'}
                </span>
                <span className={styles.videoCount}>
                  {!isLoading ? `${filteredVideos.length} videos` : 'Loading...'}
                </span>
              </button>
              {!isLoading && !error && (
                <FilterDropdown value={filter} onChange={handleFilterChange} />
              )}
            </div>
            <div
              id="video-list"
              className={`${styles.collapsibleList} ${isListCollapsed ? styles.collapsed : ''}`}
            >
              <VideoList
                videos={filteredVideos}
                selectedVideoId={selectedVideo?.id ?? null}
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

      <section className={styles.rightPanel}>
        <h2 className={styles.panelHeader}>Tagging Form</h2>
        <div className={styles.panelContent}>
          <TaggingForm
            video={selectedVideo}
            jellyfinUrl={jellyfinUrl}
            onSave={handleSave}
            existingMetadata={existingMetadata}
            lastSavedMetadata={lastSavedMetadata}
            isLoading={isLoadingMetadata}
          />
        </div>
      </section>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
