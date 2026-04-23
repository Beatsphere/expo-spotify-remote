import { AppRemote } from '@42techpacks/expo-spotify-sdk';
import { Platform } from 'react-native';
import { getConfig, getLogger } from './config';
import { getValidAccessToken } from './tokenManager';
import { isSpotifyAd } from './adDetection';
import { parseImageUri } from './utils';
import { storeTrackHistory } from './history';
import type { SpotifyTrack } from './types';

/**
 * Unwrap the player state response from the SDK.
 * iOS sometimes wraps it in a { playerState: ... } object.
 */
function unwrapPlayerState(raw: any): any {
  if (!raw) return null;
  if ('playerState' in raw && raw.playerState) return raw.playerState;
  if ('track' in raw) return raw;
  return raw;
}

/**
 * Get the currently playing Spotify track.
 *
 * Handles:
 * - Connecting App Remote if disconnected
 * - iOS authorizeAndPlayURI fallback when Spotify is suspended
 * - Player state subscription on iOS for reliability
 * - Retry logic (5 attempts on iOS, 1 on Android)
 * - Ad detection and filtering
 * - Paused state detection
 *
 * @returns The currently playing track, or null if nothing is playing / paused / ad.
 */
export async function getNowPlaying(): Promise<SpotifyTrack | null> {
  const config = getConfig();
  const log = getLogger();

  try {
    if (!config.clientID) {
      log.warn('Spotify Client ID not configured');
      return null;
    }

    // Connect if needed
    let isConnected = false;
    try {
      isConnected = AppRemote.isAppRemoteConnected();
    } catch {
      // isAppRemoteConnected can throw if SDK not initialized
    }

    if (!isConnected) {
      try {
        const accessToken = await getValidAccessToken();
        await AppRemote.connectAppRemoteAsync({
          accessToken: accessToken || '',
        });

        // Wait for connection to stabilize on iOS
        if (Platform.OS === 'ios') {
          await new Promise(r => setTimeout(r, 1500));
        }
      } catch (connectError: any) {
        log.warn('App Remote connection failed, trying authorizeAndPlayURI fallback', {
          error: connectError?.message,
        });

        // Per Spotify SDK docs: if connect() fails (Spotify was suspended by iOS),
        // authorizeAndPlayURI("") wakes Spotify via URL scheme and resumes last track.
        if (Platform.OS === 'ios') {
          try {
            await AppRemote.authorizeAndPlayURIAsync('');
            await new Promise(r => setTimeout(r, 2000));
          } catch {
            return null;
          }
        } else {
          return null;
        }
      }
    }

    // iOS: subscribe to player state for reliability
    if (Platform.OS === 'ios') {
      try {
        await AppRemote.subscribeToPlayerStateAsync();
        await new Promise(r => setTimeout(r, 300));
      } catch {
        // Continue — getPlayerState might still work
      }
    }

    // Get player state with retry logic
    let playerState: any = null;
    const retries = Platform.OS === 'ios' ? 5 : 1;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const raw = await AppRemote.getPlayerStateAsync();
        playerState = unwrapPlayerState(raw);

        if (playerState?.track?.name) {
          break;
        }

        if (attempt < retries) {
          await new Promise(r => setTimeout(r, attempt * 300));
        }
      } catch (e) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, attempt * 300));
        } else {
          throw e;
        }
      }
    }

    if (!playerState?.track) return null;

    // Check paused
    if (playerState.isPaused || playerState.paused) return null;

    const track = playerState.track;

    // Skip ads
    if (isSpotifyAd(track)) {
      log.info('Skipping Spotify ad', { trackName: track.name });
      return null;
    }

    const imageUrl = parseImageUri(track.imageUri);

    const result: SpotifyTrack = {
      name: track.name,
      artist: track.artist?.name || 'Unknown Artist',
      imageUrl,
      uri: track.uri,
      isPlaying: true,
    };

    // Store to local history (fire-and-forget)
    storeTrackHistory(result).catch(() => {});

    return result;
  } catch (e: any) {
    log.error('Spotify player state error', {
      error: e?.message || 'Unknown error',
      platform: Platform.OS,
    });
    return null;
  }
}
