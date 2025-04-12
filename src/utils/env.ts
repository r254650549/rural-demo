const debug = import.meta.env.MODE !== 'production';

/**
 * Gets the base URL for API calls based on the current environment
 * @returns The base URL string for API endpoints
 */
export function getBaseURL(): string {
  // In development mode, use the local development server
  if (debug) {
    return 'http://106.55.149.220:8098';
  }

  // For production, use environment variable or default to production server
  const prodBaseURL =
    import.meta.env.VITE_API_BASE_URL || 'http://106.55.149.220:8098';
  return prodBaseURL;
}

export default debug;
