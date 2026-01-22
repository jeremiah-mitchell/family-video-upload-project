'use client';

import { useState, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react';
import type { Video, VideoMetadata } from '@family-video/shared';
import styles from './tagging-form.module.css';

// Family member name mapping: UI display name -> NFO full name
const FAMILY_MEMBERS: Record<string, string> = {
  'Santiago': 'Santiago Arcaraz',
  'Armida': 'Armida Arcaraz',
  'Fernanda': 'Fernanda Arcaraz Mitchell',
  'Mariana': 'Mariana Arcaraz',
  'Tita': 'Armida Perez de Vázquez',
  'Tito': 'Juan Vázquez Lombera',
  'Abue S': 'Santiago Arcaraz Barragán',
  'Abue G': 'Gabriela Castillo Hernández',
  'Jeremiah': 'Jeremiah Arcaraz Mitchell',
  'Eric': 'Eric Peyton',
  'Lucia': 'Lucia Arcaraz',
  'Sofia': 'Sofia Arcaraz Mitchell',
};

// Reverse mapping: NFO full name -> UI display name
const FULL_NAME_TO_DISPLAY: Record<string, string> = Object.fromEntries(
  Object.entries(FAMILY_MEMBERS).map(([display, full]) => [full, display])
);

// Display names for UI
const FAMILY_MEMBER_NAMES = Object.keys(FAMILY_MEMBERS);

// Predefined tags for categorizing home videos
const VIDEO_TAGS = [
  'Christmas',
  'Mexico',
  'Family',
  'Birthday',
  'Vacation',
  'Holiday',
  'School',
  'Sports',
];

export interface TaggingFormProps {
  video: Video | null;
  jellyfinUrl: string;
  onSave: (videoId: string, metadata: VideoMetadata) => Promise<void>;
  existingMetadata?: VideoMetadata | null;
  lastSavedMetadata?: VideoMetadata | null;
  isLoading?: boolean;
  /** Hide "Watch in Browser" button when video is currently playing on TV */
  isNowPlaying?: boolean;
}

/**
 * Increment the number at the end of a title, or add " 2" if none exists
 * Examples:
 *   "Christmas 2024" -> "Christmas 2024 2"
 *   "Video 1" -> "Video 2"
 *   "Video 10" -> "Video 11"
 */
function incrementTitle(title: string): string {
  const match = title.match(/^(.+?)(\s+)(\d+)$/);
  if (match) {
    const [, prefix, space, numStr] = match;
    const nextNum = parseInt(numStr, 10) + 1;
    return `${prefix}${space}${nextNum}`;
  }
  return `${title} 2`;
}

export function TaggingForm({
  video,
  jellyfinUrl,
  onSave,
  existingMetadata,
  lastSavedMetadata,
  isLoading = false,
  isNowPlaying = false,
}: TaggingFormProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [rating, setRating] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  // Reset form when video changes or load existing metadata
  useEffect(() => {
    if (existingMetadata) {
      setTitle(existingMetadata.title || '');
      setDate(existingMetadata.date || '');
      // Map full names from NFO back to display names for UI
      const displayNames = (existingMetadata.people || []).map(
        (fullName) => FULL_NAME_TO_DISPLAY[fullName] || fullName
      );
      setPeople(displayNames);
      setTags(existingMetadata.tags || []);
      setRating(existingMetadata.rating?.toString() || '');
      setDescription(existingMetadata.description || '');
    } else if (video) {
      // Pre-fill title with filename (without extension)
      const nameWithoutExt = video.filename.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
      // Pre-fill date from video's creation date if available
      setDate(video.dateCreated || '');
      setPeople([]);
      setTags([]);
      setRating('');
      setDescription('');
    }
    setTitleError(null);
  }, [video?.id, video?.dateCreated, existingMetadata]);

  const handleWatchClick = useCallback(() => {
    if (!video) return;
    // Open video in Jellyfin web player
    const watchUrl = `${jellyfinUrl}/web/index.html#!/details?id=${video.id}`;
    window.open(watchUrl, '_blank', 'noopener,noreferrer');
  }, [video, jellyfinUrl]);

  const handleCopyFromPrevious = useCallback(() => {
    if (!lastSavedMetadata) return;

    // Copy all fields, incrementing the title
    setTitle(incrementTitle(lastSavedMetadata.title));
    setDate(lastSavedMetadata.date || '');
    // Map full names from NFO back to display names for UI
    const displayNames = (lastSavedMetadata.people || []).map(
      (fullName) => FULL_NAME_TO_DISPLAY[fullName] || fullName
    );
    setPeople(displayNames);
    setTags(lastSavedMetadata.tags || []);
    setRating(lastSavedMetadata.rating?.toString() || '');
    setDescription(lastSavedMetadata.description || '');
    setTitleError(null);
  }, [lastSavedMetadata]);

  const handlePersonToggle = useCallback((person: string) => {
    setPeople((prev) =>
      prev.includes(person)
        ? prev.filter((p) => p !== person)
        : [...prev, person]
    );
  }, []);

  const handleTagToggle = useCallback((tag: string) => {
    setTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!video) return;

    // Validate title
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }

    setTitleError(null);
    setIsSaving(true);

    try {
      // Map display names to full names for NFO storage
      const mappedPeople = people.map((name) => FAMILY_MEMBERS[name] || name);

      const metadata: VideoMetadata = {
        title: title.trim(),
        date: date || undefined,
        people: mappedPeople,
        tags: tags,
        rating: rating ? parseInt(rating, 10) : undefined,
        description: description.trim() || undefined,
      };

      await onSave(video.id, metadata);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRatingChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setRating('');
      return;
    }
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= 10) {
      setRating(value);
    }
  };

  if (!video) {
    return (
      <div className={styles.placeholder}>
        Select a video to start tagging
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.placeholder}>
        Loading metadata...
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <div className={styles.videoTitle}>{video.filename}</div>
        <div className={styles.headerButtons}>
          {lastSavedMetadata && (
            <button
              type="button"
              className={styles.copyButton}
              onClick={handleCopyFromPrevious}
            >
              Copy Previous
            </button>
          )}
          {!isNowPlaying && (
            <button
              type="button"
              className={styles.watchButton}
              onClick={handleWatchClick}
            >
              <span aria-hidden="true">▶</span>
              Watch in Browser
            </button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.fieldGroup}>
          <label htmlFor="title" className={`${styles.label} ${styles.required}`}>
            Title
          </label>
          <input
            id="title"
            type="text"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            aria-required="true"
            aria-invalid={!!titleError}
          />
          {titleError && (
            <div className={styles.errorMessage} role="alert">
              {titleError}
            </div>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="date" className={styles.label}>
            Date Filmed
          </label>
          <input
            id="date"
            type="date"
            className={styles.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>People</label>
          <div className={styles.peopleList} role="group" aria-label="Select people in video">
            {FAMILY_MEMBER_NAMES.map((person) => (
              <button
                key={person}
                type="button"
                className={`${styles.personTag} ${people.includes(person) ? styles.selected : ''}`}
                onClick={() => handlePersonToggle(person)}
                aria-pressed={people.includes(person)}
              >
                {person}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Tags</label>
          <div className={styles.peopleList} role="group" aria-label="Select tags for video">
            {VIDEO_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`${styles.personTag} ${tags.includes(tag) ? styles.selected : ''}`}
                onClick={() => handleTagToggle(tag)}
                aria-pressed={tags.includes(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="rating" className={styles.label}>
            Rating
          </label>
          <div className={styles.ratingGroup}>
            <input
              id="rating"
              type="number"
              min="1"
              max="10"
              className={`${styles.input} ${styles.ratingInput}`}
              value={rating}
              onChange={handleRatingChange}
              placeholder="1-10"
            />
            <span className={styles.ratingLabel}>(1-10)</span>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="description" className={styles.label}>
            Description
          </label>
          <textarea
            id="description"
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what's in the video..."
            rows={4}
          />
        </div>
      </div>

      <div className={styles.footer}>
        <button
          type="submit"
          className={`${styles.saveButton} ${isSaving ? styles.saving : ''}`}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
