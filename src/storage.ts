import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const MAX_RETRIES = 3;
const RETRY_DELAY = 100;

const IOS_KEYCHAIN_OPTIONS = Platform.OS === 'ios' ? {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
} : {};

function isRetryableError(error: unknown): boolean {
  const msg = (error as any)?.message || '';
  return (
    msg.includes('User interaction is not allowed') ||
    msg.includes('user interaction') ||
    msg.includes('keychain')
  );
}

function isAndroidEncryptionError(error: unknown): boolean {
  if (Platform.OS !== 'android') return false;
  const msg = (error as any)?.message || '';
  return (
    msg.includes('Could not encrypt') ||
    msg.includes('Could not decrypt') ||
    msg.includes('keychain') ||
    msg.includes('Keystore') ||
    msg.includes('has been rejected')
  );
}

/**
 * Get an item from SecureStore with retry logic.
 * Handles iOS Keychain and Android Keystore errors.
 */
export async function getSecureItem(key: string): Promise<string | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await SecureStore.getItemAsync(key, IOS_KEYCHAIN_OPTIONS);
    } catch (error) {
      if (isAndroidEncryptionError(error) && attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
        continue;
      }
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * Set an item in SecureStore with retry logic.
 * Handles Android Keystore corruption by deleting and retrying.
 */
export async function setSecureItem(key: string, value: string): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await SecureStore.setItemAsync(key, value, IOS_KEYCHAIN_OPTIONS);
      return true;
    } catch (error) {
      if (isAndroidEncryptionError(error)) {
        try { await SecureStore.deleteItemAsync(key); } catch {}
        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
        continue;
      }
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
        continue;
      }
      return false;
    }
  }
  return false;
}

/**
 * Delete an item from SecureStore.
 */
export async function deleteSecureItem(key: string): Promise<boolean> {
  try {
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch {
    return true;
  }
}
