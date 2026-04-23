// Configuration
export { configure } from './config';

// Authentication
export { authenticate } from './auth';

// App Remote
export { connectRemote, disconnectRemote, isRemoteConnected, initLifecycle, destroyLifecycle } from './remote';

// Now Playing
export { getNowPlaying } from './nowPlaying';

// Listening Status
export { getListeningStatus } from './listeningStatus';

// User
export { getUser } from './user';

// History
export { storeTrackHistory, getRecentHistory, clearHistory } from './history';

// Token Management
export { getValidAccessToken, clearTokenCache } from './tokenManager';

// Utilities
export { isSpotifyAppInstalled, openSpotifyStore, parseImageUri } from './utils';
export { isSpotifyAd } from './adDetection';

// Storage (for advanced use cases)
export { getSecureItem, setSecureItem, deleteSecureItem } from './storage';

// Types
export type {
  SpotifyRemoteConfig,
  SpotifySession,
  SpotifyTrack,
  SpotifyPlayerState,
  SpotifyHistoryEntry,
  SpotifyListeningStatus,
  SpotifyUser,
  Logger,
} from './types';
