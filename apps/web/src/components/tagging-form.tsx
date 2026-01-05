'use client';

import { useState, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react';
import type { Video, VideoMetadata } from '@family-video/shared';
import styles from './tagging-form.module.css';

// Predefined list of family members - can be extended via config later
const FAMILY_MEMBERS = [
  'Santiago',
  'Armida',
  'Jeremiah',
  'David',
  'Sarah',
  'Mom',
  'Dad',
  'Grandma',
  'Grandpa',
];

export interface TaggingFormProps {
  video: Video | null;
  jellyfinUrl: string;
  onSave: (videoId: string, metadata: VideoMetadata) => Promise<void>;
  existingMetadata?: VideoMetadata | null;
  isLoading?: boolean;
}

export function TaggingForm({
  video,
  jellyfinUrl,
  onSave,
  existingMetadata,
  isLoading = false,
}: TaggingFormProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [rating, setRating] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  // Reset form when video changes or load existing metadata
  useEffect(() => {
    if (existingMetadata) {
      setTitle(existingMetadata.title || '');
      setDate(existingMetadata.date || '');
      setPeople(existingMetadata.people || []);
      setRating(existingMetadata.rating?.toString() || '');
      setDescription(existingMetadata.description || '');
    } else if (video) {
      // Pre-fill title with filename (without extension)
      const nameWithoutExt = video.filename.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
      setDate('');
      setPeople([]);
      setRating('');
      setDescription('');
    }
    setTitleError(null);
  }, [video?.id, existingMetadata]);

  const handleWatchClick = useCallback(() => {
    if (!video) return;
    // Open video in Jellyfin web player
    const watchUrl = `${jellyfinUrl}/web/index.html#!/details?id=${video.id}`;
    window.open(watchUrl, '_blank', 'noopener,noreferrer');
  }, [video, jellyfinUrl]);

  const handlePersonToggle = useCallback((person: string) => {
    setPeople((prev) =>
      prev.includes(person)
        ? prev.filter((p) => p !== person)
        : [...prev, person]
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
      const metadata: VideoMetadata = {
        title: title.trim(),
        date: date || undefined,
        people,
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
        <button
          type="button"
          className={styles.watchButton}
          onClick={handleWatchClick}
        >
          <span aria-hidden="true">▶</span>
          Watch in Jellyfin
        </button>
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
            {FAMILY_MEMBERS.map((person) => (
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
