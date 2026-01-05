import { z } from 'zod';

/**
 * Environment variable validation schema using Zod
 * Validates all required and optional environment variables at startup
 */
export const envSchema = z.object({
  // Required variables
  JELLYFIN_URL: z
    .string()
    .url('JELLYFIN_URL must be a valid URL')
    .describe('Jellyfin server URL (e.g., http://jellyfin:8096)'),

  JELLYFIN_API_KEY: z
    .string()
    .min(1, 'JELLYFIN_API_KEY is required')
    .describe('Jellyfin API key for authentication'),

  MEDIA_PATH: z
    .string()
    .min(1, 'MEDIA_PATH is required')
    .describe('Path to media files for NFO writing'),

  // Optional variables with defaults
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('3001')
    .describe('API server port'),

  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .describe('Frontend URL for CORS'),

  JELLYFIN_USER: z
    .string()
    .default('jeremiah')
    .describe('Jellyfin username for Now Playing feature'),
});

/**
 * Type-safe environment configuration
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate environment variables at startup
 * Throws descriptive error if validation fails
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');

    throw new Error(
      `Environment validation failed:\n${errors}\n\nPlease check your .env file.`
    );
  }

  return result.data;
}
