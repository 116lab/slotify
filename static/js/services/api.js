/**
 * api.js
 * Data service layer for fetching JSON output from Headless Hugo.
 * Endpoint construction (base path + "{path}/index.json") is owned by the
 * route module (config/routes.js) — this layer never builds URLs by hand.
 */
import { toJsonEndpoint, withBase } from '../config/routes.js';
import { STORAGE_KEYS } from '../utils/storage.js';

/**
 * Universal internal helper to handle fetch requests, caching, and error logging.
 * Content JSON is cached and revalidated by the browser (ETag / 304); no cache
 * buster is appended. The optional sessionStorage layer is used only for the
 * search index, which is large and stable within a session.
 *
 * @param {string} url - Target endpoint.
 * @param {Object} config - { storageKey: string }
 * @returns {Promise<{ data: Object|null, error: boolean }>}
 */
async function request(url, { storageKey = null } = {}) {
  // 1. Check persistent cache if storageKey provided
  if (storageKey) {
    try {
      const cached = sessionStorage.getItem(storageKey);
      if (cached) return { error: false, data: JSON.parse(cached) };
    } catch (e) { /* silent fail on parse */ }
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    // 3. Update persistent cache (best-effort: a quota/serialization
    // failure must not turn a successful fetch into an error result).
    if (storageKey && data) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(data));
      } catch (e) { /* silent fail on quota/serialization */ }
    }

    return { error: false, data };
  } catch (err) {
    console.error(`[API] ${err.message} (${url})`);
    return { error: true, data: null };
  }
}

const contentCache = new Map();

/**
 * Fetches Hugo content JSON (posts, pages, taxonomies) for a router path.
 * Vue Router strips the deployment base from route.path; toJsonEndpoint
 * re-adds it and applies the "{path}/index.json" convention.
 */
export async function fetchContentData(path) {
  const endpoint = toJsonEndpoint(path);
  if (contentCache.has(endpoint)) {
    return contentCache.get(endpoint);
  }
  const promise = request(endpoint);
  contentCache.set(endpoint, promise);
  return promise;
}

/**
 * Prefetches Hugo content JSON for a path on hover/focus to cache it.
 */
export function prefetchContentData(path) {
  if (!path) return;
  const endpoint = toJsonEndpoint(path);
  if (!contentCache.has(endpoint)) {
    contentCache.set(endpoint, request(endpoint));
  }
}

/**
 * Fetches the search index JSON with session caching.
 */
export async function fetchSearchIndex() {
  return request(withBase('search-index.json'), { storageKey: STORAGE_KEYS.searchIndex });
}
