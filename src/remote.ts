import { AppRemote } from '@42techpacks/expo-spotify-sdk';
import { Platform, AppState, type AppStateStatus } from 'react-native';
import { getConfig, getLogger } from './config';
import { getValidAccessToken } from './tokenManager';

let lifecycleSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let lastAppState: AppStateStatus = AppState.currentState;

/**
 * Connect the Spotify App Remote with the current access token.
 *
 * @returns true if connected successfully.
 * @throws If connection fails.
 */
export async function connectRemote(): Promise<boolean> {
  const log = getLogger();

  log.info('Connecting App Remote...');
  const accessToken = await getValidAccessToken();

  await AppRemote.connectAppRemoteAsync({
    accessToken: accessToken || '',
  });

  log.info('App Remote connected');
  return true;
}

/**
 * Disconnect the Spotify App Remote.
 */
export async function disconnectRemote(): Promise<void> {
  try {
    if (AppRemote.isAppRemoteConnected()) {
      await AppRemote.disconnectAppRemoteAsync();
    }
  } catch {
    // Ignore disconnect errors
  }
}

/**
 * Check if the App Remote is currently connected.
 */
export function isRemoteConnected(): boolean {
  try {
    return AppRemote.isAppRemoteConnected();
  } catch {
    return false;
  }
}

/**
 * Initialize the App Remote lifecycle manager.
 *
 * Per Spotify SDK docs: you MUST disconnect in willResignActive and
 * reconnect in didBecomeActive on iOS to prevent stale sockets.
 *
 * Call this once in your app root (e.g. _layout.tsx).
 * Safe to call multiple times — only the first call has effect.
 *
 * @param isSpotifyUser - Optional callback that returns whether the
 * current user is a Spotify user. If not provided, lifecycle management
 * runs for all users.
 */
export function initLifecycle(isSpotifyUser?: () => Promise<boolean>): void {
  if (lifecycleSubscription) return;

  const log = getLogger();

  lifecycleSubscription = AppState.addEventListener('change', async (nextState) => {
    if (Platform.OS !== 'ios') {
      lastAppState = nextState;
      return;
    }

    // Check if this is a Spotify user (if guard provided)
    if (isSpotifyUser) {
      const isSpotify = await isSpotifyUser();
      if (!isSpotify) {
        lastAppState = nextState;
        return;
      }
    }

    // App going to background -> disconnect
    if (lastAppState === 'active' && nextState.match(/inactive|background/)) {
      try {
        if (AppRemote.isAppRemoteConnected()) {
          await AppRemote.disconnectAppRemoteAsync();
        }
      } catch {}
    }

    // App coming to foreground -> reconnect
    if (lastAppState.match(/inactive|background/) && nextState === 'active') {
      try {
        if (!AppRemote.isAppRemoteConnected()) {
          const token = await getValidAccessToken();
          if (token) {
            await AppRemote.connectAppRemoteAsync({
              accessToken: token,
            });
          }
        }
      } catch {
        log.warn('App Remote reconnect on foreground failed (will retry on next poll)');
      }
    }

    lastAppState = nextState;
  });
}

/**
 * Tear down the lifecycle listener. Call on logout or cleanup.
 */
export function destroyLifecycle(): void {
  if (lifecycleSubscription) {
    lifecycleSubscription.remove();
    lifecycleSubscription = null;
  }
}
