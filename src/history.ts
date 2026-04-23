import { getConfig, getStorageKeys, getLogger } from './config';
import { isSpotifyAd } from './adDetection';
import type { SpotifyTrack, SpotifyHistoryEntry } from './types';

let AsyncStorage: any = null;

function getAsyncStorage() {
  if (!AsyncStorage) {
    try {
      AsyncStorage = require('@react-native-async-storage/async-storage').default;
    } catch {
      throw new Error(
        '[expo-spotify-remote] @react-native-async-storage/async-storage is required for history features. Install it as a dependency.'
      );
    }
  }
  return AsyncStorage;
}

/**
 * Store a track in the local play history.
 * Maintains a FIFO queue capped at config.maxHistorySize.
 * Skips ads and deduplicates consecutive plays of the same track.
 */
export async function storeTrackHistory(track: SpotifyTrack): Promise<void> {
  const config = getConfig();
  const keys = getStorageKeys();
  const storage = getAsyncStorage();

  try {
    if (isSpotifyAd({ name: track.name, uri: track.uri, artist: { name: track.artist } })) {
      return;
    }

    const raw = await storage.getItem(keys.history);
    let history: SpotifyHistoryEntry[] = raw ? JSON.parse(raw) : [];

    const newEntry: SpotifyHistoryEntry = {
      track: {
        name: track.name,
        artist: track.artist,
        imageUrl: track.imageUrl,
        uri: track.uri,
      },
      playedAt: Date.now(),
    };

    // Deduplicate: if same track is playing, just update timestamp
    if (history.length > 0 && history[0].track.name === newEntry.track.name) {
      history[0].playedAt = newEntry.playedAt;
    } else {
      history.unshift(newEntry);
    }

    // Trim to max size
    if (history.length > config.maxHistorySize!) {
      history = history.slice(0, config.maxHistorySize!);
    }

    await storage.setItem(keys.history, JSON.stringify(history));
  } catch (e) {
    getLogger().warn('Failed to store Spotify history', {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Get the local Spotify play history.
 */
export async function getRecentHistory(): Promise<SpotifyHistoryEntry[]> {
  const keys = getStorageKeys();

  try {
    const storage = getAsyncStorage();
    const raw = await storage.getItem(keys.history);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear the local play history.
 */
export async function clearHistory(): Promise<void> {
  const keys = getStorageKeys();

  try {
    const storage = getAsyncStorage();
    await storage.removeItem(keys.history);
  } catch {
    // Ignore
  }
}
