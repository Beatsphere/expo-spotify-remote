import { AppRemote } from '@42techpacks/expo-spotify-sdk';
import { getConfig, getLogger } from './config';
import { getValidAccessToken } from './tokenManager';
import { isSpotifyAd } from './adDetection';
import { parseImageUri } from './utils';
import { storeTrackHistory, getRecentHistory } from './history';
import type { SpotifyTrack, SpotifyListeningStatus } from './types';

/**
 * Get the current Spotify listening status.
 *
 * Returns a track with a status of:
 * - 'live' — currently playing via App Remote
 * - 'recent' — played within the configured threshold (from local history)
 * - null — nothing playing or no recent history
 *
 * This is useful for "what are you listening to" features like map markers.
 */
export async function getListeningStatus(): Promise<SpotifyListeningStatus | null> {
  const config = getConfig();
  const log = getLogger();

  try {
    // 1. Try to connect App Remote if disconnected
    if (!AppRemote.isAppRemoteConnected()) {
      try {
        const accessToken = await getValidAccessToken();
        await AppRemote.connectAppRemoteAsync({
          accessToken: accessToken || '',
        });
      } catch {
        // Fall through to check local history
      }
    }

    // 2. Check App Remote for live playback
    if (AppRemote.isAppRemoteConnected()) {
      const playerState = (await AppRemote.getPlayerStateAsync()) as any;

      if (playerState?.track && !playerState.isPaused && !playerState.paused) {
        const track = playerState.track;

        if (!isSpotifyAd(track)) {
          const imageUrl = parseImageUri(track.imageUri);

          const spotifyTrack: SpotifyTrack = {
            name: track.name,
            artist: track.artist?.name || 'Unknown Artist',
            imageUrl,
            uri: track.uri,
            isPlaying: true,
          };

          // Store to local history
          await storeTrackHistory(spotifyTrack);

          return { track: spotifyTrack, status: 'live' };
        }
      }
    }

    // 3. Check local history for recent playback
    return await getRecentListeningStatus();
  } catch (e) {
    log.warn('Spotify listening status error, checking history fallback', {
      error: e instanceof Error ? e.message : String(e),
    });

    // Fallback to history
    try {
      return await getRecentListeningStatus();
    } catch {
      return null;
    }
  }
}

async function getRecentListeningStatus(): Promise<SpotifyListeningStatus | null> {
  const config = getConfig();
  const history = await getRecentHistory();

  if (history.length === 0) return null;

  const latest = history[0];
  const timeSincePlayedMs = Date.now() - latest.playedAt;
  const thresholdMs = config.recentThresholdSeconds! * 1000;

  if (timeSincePlayedMs < thresholdMs) {
    return {
      track: {
        name: latest.track.name,
        artist: latest.track.artist,
        imageUrl: latest.track.imageUrl,
        uri: latest.track.uri,
        isPlaying: false,
      },
      status: 'recent',
    };
  }

  return null;
}
