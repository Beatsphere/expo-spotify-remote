import { isAvailable } from '@42techpacks/expo-spotify-sdk';
import { Platform, Linking } from 'react-native';

const SPOTIFY_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.spotify.music';
const SPOTIFY_APP_STORE_URL = 'https://apps.apple.com/app/spotify-music/id324684580';

/**
 * Check if the Spotify app is installed on the device.
 */
export async function isSpotifyAppInstalled(): Promise<boolean> {
  try {
    return isAvailable();
  } catch {
    return false;
  }
}

/**
 * Open the appropriate app store to install Spotify.
 */
export async function openSpotifyStore(): Promise<void> {
  const url = Platform.OS === 'ios' ? SPOTIFY_APP_STORE_URL : SPOTIFY_PLAY_STORE_URL;
  await Linking.openURL(url);
}

/**
 * Extract a CDN image URL from a Spotify image URI.
 * Spotify SDK returns URIs like "spotify:image:ab67616d00001e02..."
 * which map to "https://i.scdn.co/image/ab67616d00001e02..."
 */
export function parseImageUri(imageUri: string | undefined | null): string | null {
  if (!imageUri || typeof imageUri !== 'string') return null;
  const parts = imageUri.split(':');
  if (parts.length >= 3) {
    return `https://i.scdn.co/image/${parts[2]}`;
  }
  return null;
}
