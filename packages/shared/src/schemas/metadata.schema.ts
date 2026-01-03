import { z } from 'zod';

/**
 * Zod schema for video metadata validation
 * Used by both frontend and backend for consistent validation
 */
export const videoMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().optional(),
  people: z.array(z.string()).default([]),
  rating: z.number().min(1).max(10).optional(),
  description: z.string().optional(),
});

export type VideoMetadataInput = z.infer<typeof videoMetadataSchema>;
