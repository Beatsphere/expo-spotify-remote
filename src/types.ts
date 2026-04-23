/**
 * Configuration for initializing the Spotify Remote module.
 */
export interface SpotifyRemoteConfig {
  /** Your Spotify application Client ID */
  clientID: string;

  /** Deep link redirect URL (e.g. "myapp://spotify-callback") */
  redirectURL: string;

  /**
   * Backend URL for Spotify token swap.
   * Your server must implement POST /auth/spotify/swap
   * See README for the expected request/response format.
   */
  tokenSwapURL: string;

  /**
   * Backend URL for Spotify token refresh.
   * Your server must implement POST /auth/spotify/refresh
   * See README for the expected request/response format.
   */
  tokenRefreshURL: string;

  /**
   * Spotify OAuth scopes to request.
   * @default ['user-read-recently-played', 'user-top-read', 'user-read-email', 'user-read-private', 'streaming', 'app-remote-control']
   */
  scopes?: string[];

  /**
   * Optional callback to refresh the Spotify access token server-side.
   * Called when the cached token expires. If not provided, falls back to
   * the stored access token from initial authentication.
   *
   * Return the new access token string, or null if refresh failed.
   */
  onTokenRefresh?: () => Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number } | null>;

  /**
   * Optional logger for debug output.
   * Pass `console` for basic logging, or a Sentry-compatible object.
   * @default undefined (silent)
   */
  logger?: Logger;

  /**
   * Maximum number of tracks to keep in local play history.
   * Requires @react-native-async-storage/async-storage as a peer dependency.
   * @default 50
   */
  maxHistorySize?: number;

  /**
   * Threshold in seconds for considering a track as "recently played".
   * Used by `getListeningStatus()` to return 'recent' vs null.
   * @default 1200 (20 minutes)
   */
  recentThresholdSeconds?: number;

  /**
   * Authentication timeout in milliseconds.
   * @default 30000
   */
  authTimeoutMs?: number;

  /** Storage key prefix to avoid collisions. @default 'spotify_remote_' */
  storageKeyPrefix?: string;
}

/**
 * Logger interface — compatible with console and Sentry.
 */
export interface Logger {
  info?: (message: string, data?: Record<string, unknown>) => void;
  warn?: (message: string, data?: Record<string, unknown>) => void;
  error?: (message: string, data?: Record<string, unknown>) => void;
}

/**
 * Spotify authentication session returned after successful auth.
 */
export interface SpotifySession {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
}

/**
 * A Spotify track with normalized fields.
 */
export interface SpotifyTrack {
  /** Track name */
  name: string;
  /** Artist name */
  artist: string;
  /** Album artwork URL (highest resolution available), or null */
  imageUrl: string | null;
  /** Spotify URI (e.g. "spotify:track:xxx") */
  uri: string;
  /** Whether the track is currently playing */
  isPlaying: boolean;
}

/**
 * Raw player state from the Spotify App Remote SDK.
 */
export interface SpotifyPlayerState {
  track: {
    name: string;
    uri: string;
    artist?: { name: string; uri?: string };
    album?: { name: string; uri?: string };
    imageUri?: string;
    duration?: number;
  } | null;
  isPaused?: boolean;
  paused?: boolean;
  playbackPosition?: number;
}

/**
 * Entry in the local track history.
 */
export interface SpotifyHistoryEntry {
  track: {
    name: string;
    artist: string;
    imageUrl: string | null;
    uri: string;
  };
  playedAt: number;
}

/**
 * Listening status result.
 */
export interface SpotifyListeningStatus {
  /** The track being played or recently played */
  track: SpotifyTrack;
  /** 'live' = currently playing via App Remote, 'recent' = played within threshold */
  status: 'live' | 'recent';
}

/**
 * Spotify user profile.
 */
export interface SpotifyUser {
  id: string;
  name: string | null;
  email?: string | null;
  imageUrl: string | null;
}

/**
 * Storage keys used internally. Prefixed with config.storageKeyPrefix.
 */
export interface StorageKeys {
  accessToken: string;
  refreshToken: string;
  history: string;
}
