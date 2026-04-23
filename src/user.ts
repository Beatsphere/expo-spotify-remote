import { AppRemote } from '@42techpacks/expo-spotify-sdk';
import { getStorageKeys, getLogger } from './config';
import { getSecureItem } from './storage';
import type { SpotifyUser } from './types';

/**
 * Get the current Spotify user's profile.
 *
 * Tries the Spotify Web API first (most reliable, returns user ID),
 * then falls back to the App Remote native user status.
 *
 * @returns User profile or null if not available.
 */
export async function getUser(): Promise<SpotifyUser | null> {
  const keys = getStorageKeys();
  const log = getLogger();

  try {
    // 1. Try Web API (most reliable for user ID)
    const token = await getSecureItem(keys.accessToken);
    if (token) {
      try {
        const response = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          return {
            id: data.id,
            name: data.display_name || null,
            email: data.email || null,
            imageUrl: data.images?.[0]?.url || null,
          };
        }
      } catch (e) {
        log.warn('Spotify Web API user fetch failed, trying native fallback', {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // 2. Fallback: Native App Remote
    try {
      const status = await (AppRemote as any).getUserStatusAsync();
      if (status?.longMessage) {
        const match = status.longMessage.match(/Logged in as (.+)/);
        if (match?.[1]) {
          return {
            id: 'unknown',
            name: match[1],
            email: null,
            imageUrl: null,
          };
        }
      }
    } catch {
      // Native fallback not available
    }

    return null;
  } catch (e) {
    log.error('Failed to fetch Spotify user', {
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}
