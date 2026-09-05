/**
 * Application Cache Service
 * Provides centralized, safe, resilient local/session storage caching
 * with automatic serialization, in-memory fallback, TTL support, and domain helpers.
 */

const MEMORY_FALLBACK = new Map();

export const CACHE_KEYS = {
  MENU_ITEMS: "menu_items_cache",
  USER_PROFILE: "cached_user_profile",
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  SIDEBAR_COLLAPSED: "sidebar_collapsed",
  MODULES_CONFIG: "modules_config_cache",
  ROLE_PERMISSIONS: "role_permissions_cache",
};

const isStorageAvailable = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const hasLocalStorage = isStorageAvailable();

export const cacheService = {
  /**
   * Generic get item with optional default value & auto JSON parsing
   * @param {string} key
   * @param {any} defaultValue
   * @returns {any}
   */
  get(key, defaultValue = null) {
    try {
      let raw = null;
      if (hasLocalStorage) {
        raw = window.localStorage.getItem(key);
      } else {
        raw = MEMORY_FALLBACK.get(key) || null;
      }

      if (raw === null || raw === undefined) {
        return defaultValue;
      }

      const parsed = JSON.parse(raw);

      // Support TTL wrapper if present
      if (parsed && typeof parsed === "object" && parsed.__isCacheWrapper && parsed.expiresAt) {
        if (Date.now() > parsed.expiresAt) {
          this.remove(key);
          return defaultValue;
        }
        return parsed.data;
      }

      return parsed;
    } catch {
      // If parsing fails (e.g. raw string stored), return raw string or default
      try {
        const rawString = hasLocalStorage ? window.localStorage.getItem(key) : MEMORY_FALLBACK.get(key);
        return rawString !== null && rawString !== undefined ? rawString : defaultValue;
      } catch {
        return defaultValue;
      }
    }
  },

  /**
   * Generic set item with JSON serialization and optional TTL (ms)
   * @param {string} key
   * @param {any} value
   * @param {number|null} ttlMs
   * @returns {boolean}
   */
  set(key, value, ttlMs = null) {
    try {
      let payload = value;
      if (ttlMs && typeof ttlMs === "number" && ttlMs > 0) {
        payload = {
          __isCacheWrapper: true,
          data: value,
          cachedAt: Date.now(),
          expiresAt: Date.now() + ttlMs,
        };
      }

      const serialized = JSON.stringify(payload);
      if (hasLocalStorage) {
        window.localStorage.setItem(key, serialized);
      }
      MEMORY_FALLBACK.set(key, serialized);
      return true;
    } catch (err) {
      console.warn(`[CacheService] Failed to set cache key "${key}":`, err);
      try {
        MEMORY_FALLBACK.set(key, JSON.stringify(value));
      } catch {
        // ignore
      }
      return false;
    }
  },

  /**
   * Remove a specific cache key
   * @param {string} key
   */
  remove(key) {
    try {
      if (hasLocalStorage) {
        window.localStorage.removeItem(key);
      }
      MEMORY_FALLBACK.delete(key);
    } catch (err) {
      console.warn(`[CacheService] Failed to remove cache key "${key}":`, err);
    }
  },

  /**
   * Remove multiple cache keys
   * @param {string[]} keys
   */
  removeMany(keys = []) {
    keys.forEach((key) => this.remove(key));
  },

  /**
   * Check if a key exists and is non-empty
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const val = this.get(key);
    return val !== null && val !== undefined;
  },

  /**
   * Clear all matching keys or entire storage
   * @param {string} prefix
   */
  clear(prefix = "") {
    try {
      if (hasLocalStorage) {
        if (!prefix) {
          window.localStorage.clear();
        } else {
          const keysToRemove = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && k.startsWith(prefix)) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => window.localStorage.removeItem(k));
        }
      }
      if (!prefix) {
        MEMORY_FALLBACK.clear();
      } else {
        for (const k of MEMORY_FALLBACK.keys()) {
          if (k.startsWith(prefix)) {
            MEMORY_FALLBACK.delete(k);
          }
        }
      }
    } catch (err) {
      console.warn("[CacheService] Failed to clear cache:", err);
    }
  },

  // ---------------------------------------------------------------------------
  // Domain-Specific Convenience Methods
  // ---------------------------------------------------------------------------

  /**
   * Menu Items Cache
   */
  getMenuItems() {
    const items = this.get(CACHE_KEYS.MENU_ITEMS, []);
    return Array.isArray(items) ? items : [];
  },

  setMenuItems(items) {
    return this.set(CACHE_KEYS.MENU_ITEMS, items);
  },

  clearMenuItems() {
    this.remove(CACHE_KEYS.MENU_ITEMS);
  },

  /**
   * User Profile Cache
   */
  getUserProfile() {
    return this.get(CACHE_KEYS.USER_PROFILE, null);
  },

  setUserProfile(profile) {
    return this.set(CACHE_KEYS.USER_PROFILE, profile);
  },

  clearUserProfile() {
    this.remove(CACHE_KEYS.USER_PROFILE);
  },

  /**
   * Auth Session Clearance
   */
  clearAuthSession() {
    this.removeMany([
      CACHE_KEYS.ACCESS_TOKEN,
      CACHE_KEYS.REFRESH_TOKEN,
      CACHE_KEYS.USER_PROFILE,
      CACHE_KEYS.MENU_ITEMS,
      CACHE_KEYS.ROLE_PERMISSIONS,
    ]);
  },
};

export default cacheService;
