'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Video, VideoMetadata } from '@family-video/shared';
import { TaggingForm } from '../../../../components/tagging-form';
import { ToastContainer, useToasts } from '../../../../components/toast';
import { getVideos, getConfig, getVideoMetadata, saveVideoMetadata, ApiError } from '../../../../lib/api';
import styles from './page.module.css';

export default function TagVideoPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jellyfinUrl, setJellyfinUrl] = useState('');
  const [existingMetadata, setExistingMetadata] = useState<VideoMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [lastSavedMetadata, setLastSavedMetadata] = useState<VideoMetadata | null>(null);

  const { toasts, dismissToast, showSuccess, showError } = useToasts();

  // Fetch video and config on mount
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        const [videosData, configData] = await Promise.all([
          getVideos(),
          getConfig(),
        ]);

        setAllVideos(videosData);
        setJellyfinUrl(configData.jellyfinUrl);

        // Find the video by ID
        const foundVideo = videosData.find((v) => v.id === videoId);
        if (!foundVideo) {
          setError('Video not found');
        } else {
          setVideo(foundVideo);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.details || err.message);
        } else if (err instanceof TypeError) {
          setError('Could not connect to server. Please check your connection.');
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
  }, [videoId]);

  // Load existing metadata when video is found
  useEffect(() => {
    async function loadMetadata() {
      if (!video) {
        setExistingMetadata(null);
        return;
      }

      // Only load metadata if the video is tagged
      if (!video.isTagged) {
        setExistingMetadata(null);
        return;
      }

      try {
        setIsLoadingMetadata(true);
        const metadata = await getVideoMetadata(video.id);
        setExistingMetadata(metadata);
      } catch (err) {
        console.warn('Failed to load metadata:', err);
        setExistingMetadata(null);
      } finally {
        setIsLoadingMetadata(false);
      }
    }

    loadMetadata();
  }, [video?.id, video?.isTagged]);

  const handleSave = useCallback(async (vid: string, metadata: VideoMetadata) => {
    try {
      const updatedVideo = await saveVideoMetadata(vid, metadata);

      // Update video in list
      setAllVideos((prev) =>
        prev.map((v) => (v.id === vid ? updatedVideo : v))
      );

      // Update current video
      setVideo(updatedVideo);

      // Store last saved metadata for "Copy from Previous" feature
      setLastSavedMetadata(metadata);

      // Show success toast
      showSuccess(`Saved: ${metadata.title}`);

      // Find next untagged video and navigate to it
      const untaggedVideos = allVideos.filter((v) => !v.isTagged && v.id !== vid);
      if (untaggedVideos.length > 0) {
        // Small delay so user sees the success toast
        setTimeout(() => {
          router.push(`/videos/${untaggedVideos[0].id}/tag`);
        }, 800);
      }
    } catch (err) {
      let errorMessage = 'Save failed';
      if (err instanceof ApiError) {
        errorMessage = `Save failed: ${err.details || err.message}`;
      } else if (err instanceof TypeError) {
        errorMessage = 'Save failed: Could not connect to server';
      } else if (err instanceof Error) {
        errorMessage = `Save failed: ${err.message}`;
      }

      showError(errorMessage);
      throw err;
    }
  }, [allVideos, router, showSuccess, showError]);

  // Calculate stats
  const untaggedCount = allVideos.filter((v) => !v.isTagged).length;

  if (isLoading) {
    return (
      <main className={styles.main}>
        <div className={styles.loading}>Loading...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.main}>
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>{error}</p>
          <Link href="/videos" className={styles.backButton}>
            Back to Videos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/videos" className={styles.backLink}>
          <span aria-hidden="true">&larr;</span> Videos
        </Link>
        <div className={styles.headerInfo}>
          <span className={styles.remainingCount}>{untaggedCount} left to tag</span>
        </div>
      </header>

      <div className={styles.formContainer}>
        <TaggingForm
          video={video}
          jellyfinUrl={jellyfinUrl}
          onSave={handleSave}
          existingMetadata={existingMetadata}
          lastSavedMetadata={lastSavedMetadata}
          isLoading={isLoadingMetadata}
        />
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
