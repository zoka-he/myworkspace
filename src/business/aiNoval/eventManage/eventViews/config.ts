// Timeline visualization configuration
export const TIMELINE_CONFIG = {
  // Number of seconds per pixel in the timeline
  SECONDS_PER_PIXEL: 100000000,
  // Padding above and below the timeline points (in pixels)
  TIMELINE_PADDING: 20,
  // Minimum height of the timeline container (in pixels)
  MIN_CONTAINER_HEIGHT: 600,
  // Fixed time range padding in seconds
  TIME_RANGE_PADDING: 1000,
  // Scale range configuration
  SCALE_RANGE: {
    MIN: 1,  // 1 pixel per 1 seconds
    MAX: 200000000  // 1 pixel per 1000000000 seconds
  }
} as const 