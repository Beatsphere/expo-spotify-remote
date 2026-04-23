import { getConfig, getStorageKeys, getLogger } from './config';
import { getSecureItem, setSecureItem } from './storage';

const TOKEN_REFRESH_MARGIN = 5 * 60 * 1000; // Refresh 5 minutes before expiry

let cachedAccessToken: string | null = null;
let cachedTokenExpiry = 0;

/**
 * Clear the in-memory token cache. Useful after logout.
 */
export function clearTokenCache(): void {
  cachedAccessToken = null;
  cachedTokenExpiry = 0;
}

/**
 * Get a valid (non-expired) Spotify access token.
 *
 * 1. Returns cached token if still valid.
 * 2. Calls config.onTokenRefresh() if provided.
 * 3. Falls back to the stored access token from initial auth.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const config = getConfig();
  const keys = getStorageKeys();
  const log = getLogger();

  // Return cached token if still valid
  if (cachedAccessToken && Date.now() < cachedTokenExpiry) {
    return cachedAccessToken;
  }

  // Try custom refresh callback
  if (config.onTokenRefresh) {
    try {
      const result = await config.onTokenRefresh();
      if (result?.accessToken) {
        await setSecureItem(keys.accessToken, result.accessToken);
        if (result.refreshToken) {
          await setSecureItem(keys.refreshToken, result.refreshToken);
        }

        const expiresInMs = ((result.expiresIn || 3600) * 1000) - TOKEN_REFRESH_MARGIN;
        cachedAccessToken = result.accessToken;
        cachedTokenExpiry = Date.now() + expiresInMs;

        log.info('Token refreshed via onTokenRefresh callback');
        return result.accessToken;
      }
    } catch (err) {
      log.error('onTokenRefresh callback failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Fallback to stored token
  return getSecureItem(keys.accessToken);
}
