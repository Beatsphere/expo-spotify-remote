const AD_PHRASES = [
  'ad-free',
  'advertisement',
  'spotify premium',
  'upgrade to premium',
  'listen to music, ad-free',
  'get premium',
  'try premium',
];

/**
 * Check if a player state track is a Spotify ad.
 * Checks URI pattern, track name, and artist name.
 */
export function isSpotifyAd(track: {
  name?: string;
  uri?: string;
  artist?: { name?: string };
} | null): boolean {
  if (!track) return false;

  const name = (track.name || '').toLowerCase();
  const artistName = (track.artist?.name || '').toLowerCase();
  const uri = (track.uri || '').toLowerCase();

  if (uri.startsWith('spotify:ad:')) return true;

  for (const phrase of AD_PHRASES) {
    if (name.includes(phrase)) return true;
  }

  if (artistName === 'spotify' || artistName === 'advertisement') return true;

  return false;
}
