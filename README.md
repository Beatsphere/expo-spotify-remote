# @beatsphere/expo-spotify-remote

High-level Spotify App Remote wrapper for Expo/React Native. Battle-tested in [BeatSphere](https://beatsphere.live).

Built on top of [`@42techpacks/expo-spotify-sdk`](https://github.com/nichochar/expo-spotify-sdk), this package adds:

- **OAuth authentication** with token swap/refresh
- **Now playing detection** with retry logic and platform-specific handling
- **App Remote lifecycle management** (iOS background/foreground)
- **Token caching** with automatic refresh
- **Ad detection** and filtering
- **Local play history** with dedup and FIFO eviction
- **Listening status** — live vs recently played
- **SecureStore wrapper** with iOS Keychain and Android Keystore error recovery
- **User profile** fetching (Web API + native fallback)

## Install

```bash
npm install @beatsphere/expo-spotify-remote @42techpacks/expo-spotify-sdk expo-secure-store
```

Optional (for play history):
```bash
npm install @react-native-async-storage/async-storage
```

### Android App Remote Setup

The base `@42techpacks/expo-spotify-sdk` doesn't include Android App Remote support. This package ships the Spotify App Remote AAR and a patch to enable it.

1. Install [patch-package](https://github.com/ds300/patch-package):
   ```bash
   npm install patch-package --save-dev
   ```

2. Copy the patch to your project:
   ```bash
   cp node_modules/@beatsphere/expo-spotify-remote/patches/@42techpacks+expo-spotify-sdk+0.5.6.patch patches/
   ```

3. Add to your `package.json` scripts:
   ```json
   {
     "scripts": {
       "postinstall": "patch-package"
     }
   }
   ```

4. Run: `npx patch-package`

### Expo Plugin

Add the Spotify SDK plugin to your `app.config.js` or `app.json`:

```js
// app.config.js
export default {
  plugins: [
    [
      '@42techpacks/expo-spotify-sdk',
      {
        scheme: 'myapp',
        host: 'spotify-callback',
        clientID: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID,
      },
    ],
  ],
};
```

## Quick Start

### 1. Configure (once, in app root)

```tsx
// app/_layout.tsx
import { configure, initLifecycle } from '@beatsphere/expo-spotify-remote';
import { useEffect } from 'react';

configure({
  clientID: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!,
  redirectURL: 'myapp://spotify-callback',
  tokenSwapURL: 'https://api.myapp.com/auth/spotify/swap',
  tokenRefreshURL: 'https://api.myapp.com/auth/spotify/refresh',
});

export default function RootLayout() {
  useEffect(() => {
    initLifecycle();
  }, []);

  return <Slot />;
}
```

### 2. Authenticate

```tsx
import { authenticate, isSpotifyAppInstalled, openSpotifyStore } from '@beatsphere/expo-spotify-remote';

async function login() {
  const installed = await isSpotifyAppInstalled();
  if (!installed) {
    await openSpotifyStore();
    return;
  }

  try {
    const session = await authenticate();
    console.log('Authenticated!', session.accessToken);
  } catch (err) {
    if (err.message === 'SPOTIFY_APP_NOT_INSTALLED') {
      await openSpotifyStore();
    }
  }
}
```

### 3. Get Now Playing

```tsx
import { getNowPlaying } from '@beatsphere/expo-spotify-remote';

const track = await getNowPlaying();
if (track) {
  console.log(`${track.name} by ${track.artist}`);
  console.log(`Art: ${track.imageUrl}`);
}
```

### 4. Listening Status (live + recent)

```tsx
import { getListeningStatus } from '@beatsphere/expo-spotify-remote';

const status = await getListeningStatus();
if (status) {
  console.log(`${status.track.name} — ${status.status}`); // 'live' or 'recent'
}
```

### 5. User Profile

```tsx
import { getUser } from '@beatsphere/expo-spotify-remote';

const user = await getUser();
// { id: 'spotify_user_id', name: 'Display Name', email: '...', imageUrl: '...' }
```

## Configuration Options

```ts
configure({
  // Required
  clientID: string;
  redirectURL: string;
  tokenSwapURL: string;
  tokenRefreshURL: string;

  // Optional
  scopes?: string[];                // Default: standard playback + user scopes
  authTimeoutMs?: number;           // Default: 30000
  maxHistorySize?: number;          // Default: 50
  recentThresholdSeconds?: number;  // Default: 1200 (20 min)
  storageKeyPrefix?: string;        // Default: 'spotify_remote_'

  // Custom token refresh (e.g. via your backend with JWT auth)
  onTokenRefresh?: () => Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  } | null>;

  // Logging (pass `console` for basic output)
  logger?: {
    info?: (msg: string, data?: object) => void;
    warn?: (msg: string, data?: object) => void;
    error?: (msg: string, data?: object) => void;
  };
});
```

## Backend Requirements

Your server must implement two endpoints for Spotify's token exchange:

### POST `/auth/spotify/swap`

Called during initial authentication. Receives the authorization code and exchanges it for tokens.

**Request body:**
```json
{ "code": "<authorization_code>" }
```

**Response:**
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600
}
```

### POST `/auth/spotify/refresh`

Called when the access token expires.

**Request body:**
```json
{ "refresh_token": "<refresh_token>" }
```

**Response:**
```json
{
  "access_token": "...",
  "expires_in": 3600
}
```

See the [Spotify Authorization Guide](https://developer.spotify.com/documentation/web-api/tutorials/code-flow) for implementation details. The key requirement is that your **client secret** stays server-side.

## API Reference

### Authentication
| Function | Description |
|----------|-------------|
| `configure(config)` | Initialize the module (call once) |
| `authenticate()` | Run full OAuth flow, returns `SpotifySession` |
| `isSpotifyAppInstalled()` | Check if Spotify is on the device |
| `openSpotifyStore()` | Open App Store / Play Store |

### Playback
| Function | Description |
|----------|-------------|
| `getNowPlaying()` | Get currently playing track (or null) |
| `getListeningStatus()` | Get live or recent listening status |
| `isSpotifyAd(track)` | Check if a track is an ad |

### App Remote
| Function | Description |
|----------|-------------|
| `connectRemote()` | Connect App Remote manually |
| `disconnectRemote()` | Disconnect App Remote |
| `isRemoteConnected()` | Check connection status |
| `initLifecycle(isSpotifyUser?)` | Start iOS lifecycle management |
| `destroyLifecycle()` | Stop lifecycle management |

### User & History
| Function | Description |
|----------|-------------|
| `getUser()` | Get Spotify user profile |
| `getRecentHistory()` | Get local play history |
| `storeTrackHistory(track)` | Manually add to history |
| `clearHistory()` | Clear local history |

### Token Management
| Function | Description |
|----------|-------------|
| `getValidAccessToken()` | Get a non-expired token |
| `clearTokenCache()` | Clear in-memory token cache |

### Storage Utilities
| Function | Description |
|----------|-------------|
| `getSecureItem(key)` | Read from SecureStore with retry |
| `setSecureItem(key, value)` | Write to SecureStore with retry |
| `deleteSecureItem(key)` | Delete from SecureStore |
| `parseImageUri(uri)` | Convert Spotify image URI to CDN URL |

## Platform Notes

### iOS
- App Remote requires the Spotify app to be installed
- Lifecycle management (disconnect on background, reconnect on foreground) is handled automatically via `initLifecycle()`
- If Spotify is suspended, `getNowPlaying()` uses `authorizeAndPlayURI("")` as a fallback to wake it
- Player state fetching uses 5 retry attempts with increasing delays

### Android
- Requires the App Remote AAR + patch (see setup above)
- Player state fetching uses 1 attempt (more reliable than iOS)
- Android Keystore encryption errors are handled with automatic retry

## License

MIT
