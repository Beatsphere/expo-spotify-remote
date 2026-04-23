import { Authenticate } from '@42techpacks/expo-spotify-sdk';
import type { SpotifyScope } from '@42techpacks/expo-spotify-sdk/build/ExpoSpotifySDK.types';
import { Platform } from 'react-native';
import { getConfig, getStorageKeys, getLogger } from './config';
import { setSecureItem } from './storage';
import { connectRemote } from './remote';
import { isSpotifyAppInstalled } from './utils';
import type { SpotifySession } from './types';

/**
 * Run the full Spotify OAuth authentication flow.
 *
 * 1. Checks if the Spotify app is installed.
 * 2. Opens Spotify for OAuth consent.
 * 3. Exchanges the code via your token swap endpoint.
 * 4. Stores tokens in SecureStore.
 * 5. Connects the App Remote.
 *
 * @returns The Spotify session with tokens.
 * @throws If Spotify is not installed ('SPOTIFY_APP_NOT_INSTALLED') or auth fails.
 */
export async function authenticate(): Promise<SpotifySession> {
  const config = getConfig();
  const keys = getStorageKeys();
  const log = getLogger();

  const isInstalled = await isSpotifyAppInstalled();
  if (!isInstalled) {
    throw new Error('SPOTIFY_APP_NOT_INSTALLED');
  }

  log.info('Starting Spotify authentication', {
    platform: Platform.OS,
    hasTokenSwapUrl: !!config.tokenSwapURL,
  });

  const authPromise = Authenticate.authenticateAsync({
    scopes: config.scopes! as SpotifyScope[],
    tokenSwapURL: config.tokenSwapURL,
    tokenRefreshURL: config.tokenRefreshURL,
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('Spotify authentication timed out')),
      config.authTimeoutMs!
    )
  );

  const session = (await Promise.race([authPromise, timeoutPromise])) as any;

  if (!session?.accessToken) {
    throw new Error('Spotify authentication returned no session');
  }

  // On iOS, add a small delay to ensure the token is fully ready
  if (Platform.OS === 'ios') {
    await new Promise(r => setTimeout(r, 500));
  }

  // Store tokens
  await setSecureItem(keys.accessToken, session.accessToken);
  if (session.refreshToken) {
    await setSecureItem(keys.refreshToken, session.refreshToken);
  }

  log.info('Spotify authentication successful');

  // Connect App Remote (non-blocking — don't fail auth if this fails)
  try {
    await connectRemote();
  } catch (e) {
    log.warn('App Remote connection failed after auth (non-fatal)', {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresIn: session.expiresIn,
    scope: session.scope,
  };
}
