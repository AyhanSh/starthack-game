/**
 * Feature flags for multiplayer rollout.
 *
 * Priority order:
 *  1. URL query param   ?mp=1  or  ?mp=0
 *  2. localStorage key  wma_feature_mp
 *  3. Vite env var      VITE_FEATURE_MULTIPLAYER=true
 *  4. Default: false (multiplayer is behind flag by default)
 */
export function isMultiplayerEnabled(): boolean {
  // 1. URL override (for testing / beta invite links)
  const urlParam = new URLSearchParams(window.location.search).get('mp');
  if (urlParam === '1' || urlParam === 'true') return true;
  if (urlParam === '0' || urlParam === 'false') return false;

  // 2. localStorage override (persisted opt-in)
  try {
    const stored = localStorage.getItem('wma_feature_mp');
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {
    // ignore
  }

  // 3. Build-time env
  if (import.meta.env.VITE_FEATURE_MULTIPLAYER === 'true') return true;

  // 4. Default
  return false;
}

/** Enable multiplayer for this session (stored to localStorage). */
export function enableMultiplayer(): void {
  try {
    localStorage.setItem('wma_feature_mp', '1');
  } catch {
    // ignore
  }
}

/** Disable multiplayer for this session. */
export function disableMultiplayer(): void {
  try {
    localStorage.setItem('wma_feature_mp', '0');
  } catch {
    // ignore
  }
}
