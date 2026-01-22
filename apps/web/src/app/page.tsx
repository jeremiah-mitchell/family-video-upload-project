'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Video, NowPlayingVideo } from '@family-video/shared';
import { getVideos, getConfig, getNowPlaying, ApiError } from '../lib/api';
import styles from './page.module.css';

/** Polling interval for now playing (10 seconds) */
const POLL_INTERVAL_MS = 10000;

/** API base URL for constructing full thumbnail URLs */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Build full thumbnail URL from relative path */
function buildThumbnailUrl(relativePath: string | undefined): string | undefined {
  if (!relativePath) return undefined;
  return `${API_BASE}${relativePath}`;
}

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jellyfinUrl, setJellyfinUrl] = useState('');
  const [nowPlaying, setNowPlaying] = useState<NowPlayingVideo | null>(null);
  const [isNowPlayingLoading, setIsNowPlayingLoading] = useState(true);

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

  // Fetch now playing status
  const fetchNowPlaying = useCallback(async () => {
    try {
      const result = await getNowPlaying();
      setNowPlaying(result);
    } catch (error) {
      console.warn('Failed to fetch now playing:', error);
      setNowPlaying(null);
    } finally {
      setIsNowPlayingLoading(false);
    }
  }, []);

  // Initial fetch and polling for now playing
  useEffect(() => {
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNowPlaying]);

  // Calculate stats
  const taggedCount = videos.filter((v) => v.isTagged).length;
  const untaggedCount = videos.filter((v) => !v.isTagged).length;
  const totalCount = videos.length;
  const progressPercent = totalCount > 0 ? Math.round((taggedCount / totalCount) * 100) : 0;

  // Check if something is playing
  const hasNowPlaying = nowPlaying !== null && !isNowPlayingLoading;

  return (
    <main className={styles.main}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>Family Videos</div>
      </header>

      {/* Welcome Message */}
      <section className={styles.welcome}>
        <h1 className={styles.greeting}>Hola Santiago y Armida!</h1>
        <p className={styles.subtitle}>Let's preserve some memories today</p>
      </section>

      {/* Now Playing Section - Hero when active */}
      {hasNowPlaying && (
        <section className={styles.nowPlayingSection}>
          <div className={styles.nowPlayingLabel}>Now Playing</div>
          <div className={styles.nowPlayingCard}>
            {nowPlaying.thumbnailUrl && (
              <img
                src={buildThumbnailUrl(nowPlaying.thumbnailUrl)}
                alt=""
                className={styles.nowPlayingThumbnail}
              />
            )}
            <div className={styles.nowPlayingInfo}>
              <h2 className={styles.nowPlayingTitle}>{nowPlaying.name}</h2>
              {nowPlaying.deviceName && (
                <p className={styles.nowPlayingDevice}>
                  Playing on: {nowPlaying.deviceName}
                </p>
              )}
            </div>
            <Link
              href={`/videos?select=${nowPlaying.id}`}
              className={styles.tagButton}
            >
              Tag This Video
            </Link>
          </div>
        </section>
      )}

      {/* Start Watching Section - Only show when nothing is playing */}
      {!hasNowPlaying && !isNowPlayingLoading && (
        <section className={styles.startWatchingSection}>
          <h2 className={styles.sectionTitle}>Start Watching</h2>
          <div className={styles.startWatchingCard}>
            <div className={styles.steps}>
              <div className={styles.step}>
                <span className={styles.stepNumber}>1</span>
                <span className={styles.stepText}>Open Jellyfin on your TV</span>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNumber}>2</span>
                <span className={styles.stepText}>Pick a video from Home Videos</span>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNumber}>3</span>
                <span className={styles.stepText}>Come back here to tag it!</span>
              </div>
            </div>
            {jellyfinUrl && (
              <a
                href={jellyfinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.jellyfinButton}
              >
                Open Jellyfin
                <span className={styles.externalIcon} aria-hidden="true">&#8599;</span>
              </a>
            )}
            <div className={styles.divider}>
              <span>or</span>
            </div>
            <Link href="/videos" className={styles.browseButton}>
              Browse Videos to Tag
            </Link>
          </div>
        </section>
      )}

      {/* Progress Section */}
      <section className={styles.progressSection}>
        <h2 className={styles.sectionTitle}>Your Progress</h2>
        <div className={styles.progressCard}>
          {isLoading ? (
            <div className={styles.loadingText}>Loading...</div>
          ) : error ? (
            <div className={styles.errorText}>{error}</div>
          ) : (
            <>
              <div className={styles.statsRow}>
                <div className={styles.statBlock}>
                  <span className={styles.statNumber}>{untaggedCount}</span>
                  <span className={styles.statLabel}>videos ready to tag</span>
                </div>
                <div className={styles.statBlock}>
                  <span className={styles.statNumber}>{taggedCount}</span>
                  <span className={styles.statLabel}>tagged</span>
                </div>
              </div>
              <div className={styles.progressBarContainer}>
                <div
                  className={styles.progressBar}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className={styles.progressPercent}>{progressPercent}% complete</div>
              <Link href="/videos" className={styles.browseVideosButton}>
                Browse Videos
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Upload Section */}
      <section className={styles.uploadSection}>
        <h2 className={styles.sectionTitle}>Add New Videos</h2>
        <div className={styles.uploadCard}>
          <p className={styles.uploadText}>
            Have DVDs to add to the collection?
          </p>
          <Link href="/upload" className={styles.uploadButton}>
            Upload Videos
          </Link>
        </div>
      </section>
    </main>
  );
}
