import type { SpotifyRemoteConfig, StorageKeys, Logger } from './types';

const DEFAULT_SCOPES = [
  'user-read-recently-played',
  'user-top-read',
  'user-read-email',
  'user-read-private',
  'streaming',
  'app-remote-control',
];

let _config: SpotifyRemoteConfig | null = null;

/**
 * Configure the Spotify Remote module. Must be called before using any other function.
 */
export function configure(config: SpotifyRemoteConfig): void {
  if (!config.clientID) throw new Error('[expo-spotify-remote] clientID is required');
  if (!config.redirectURL) throw new Error('[expo-spotify-remote] redirectURL is required');
  if (!config.tokenSwapURL) throw new Error('[expo-spotify-remote] tokenSwapURL is required');
  if (!config.tokenRefreshURL) throw new Error('[expo-spotify-remote] tokenRefreshURL is required');

  _config = {
    scopes: DEFAULT_SCOPES,
    maxHistorySize: 50,
    recentThresholdSeconds: 1200,
    authTimeoutMs: 30000,
    storageKeyPrefix: 'spotify_remote_',
    ...config,
  };
}

/**
 * Get the current configuration. Throws if not configured.
 */
export function getConfig(): Required<Pick<SpotifyRemoteConfig, 'clientID' | 'redirectURL' | 'tokenSwapURL' | 'tokenRefreshURL' | 'scopes' | 'maxHistorySize' | 'recentThresholdSeconds' | 'authTimeoutMs' | 'storageKeyPrefix'>> & SpotifyRemoteConfig {
  if (!_config) {
    throw new Error(
      '[expo-spotify-remote] Not configured. Call configure() before using any Spotify function.'
    );
  }
  return _config as any;
}

/**
 * Get resolved storage keys with prefix applied.
 */
export function getStorageKeys(): StorageKeys {
  const prefix = getConfig().storageKeyPrefix;
  return {
    accessToken: `${prefix}access_token`,
    refreshToken: `${prefix}refresh_token`,
    history: `${prefix}play_history`,
  };
}

/**
 * Get the logger, or a no-op logger if none configured.
 */
export function getLogger(): Required<Logger> {
  const logger = _config?.logger;
  const noop = () => {};
  return {
    info: logger?.info ?? noop,
    warn: logger?.warn ?? noop,
    error: logger?.error ?? noop,
  };
}
