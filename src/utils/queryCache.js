/**
 * QueryCache — lightweight TanStack Query-style caching for class components.
 *
 * Features:
 *   - Configurable staleTime and cacheTime (gcTime)
 *   - Background refetch when data is stale
 *   - Request deduplication (no duplicate in-flight requests)
 *   - Manual invalidation by exact key or prefix
 *   - Garbage collection of expired entries
 *
 * Usage:
 *   const cache = new QueryCache();
 *   const data = await cache.query('users-list', () => api.usersList(), { staleTime: 60000 });
 */

const DEFAULT_STALE_TIME = 30000;    // 30s — data considered fresh
const DEFAULT_CACHE_TIME = 300000;   // 5min — evict unused entries
const GC_INTERVAL = 60000;          // 1min — garbage collection sweep

class QueryCache {
  constructor() {
    this.cache = {};        // key → { data, error, updatedAt, timeout }
    this.inflight = {};     // key → Promise (deduplication)
    this.listeners = {};    // key → Set of callbacks
    this.gcTimer = setInterval(this._gc.bind(this), GC_INTERVAL);
  }

  /**
   * query — fetch with caching.
   *
   * @param {string} key         Cache key
   * @param {Function} fetchFn   Async function that returns data
   * @param {Object} [options]
   * @param {number} [options.staleTime]  ms before data is considered stale (default 30s)
   * @param {number} [options.cacheTime]  ms before unused entry is garbage collected (default 5min)
   * @param {boolean} [options.forceRefresh]  bypass cache entirely
   * @returns {Promise<any>} resolved data
   */
  async query(key, fetchFn, options) {
    const opts = options || {};
    const staleTime = opts.staleTime !== undefined ? opts.staleTime : DEFAULT_STALE_TIME;
    const cacheTime = opts.cacheTime !== undefined ? opts.cacheTime : DEFAULT_CACHE_TIME;
    const forceRefresh = opts.forceRefresh || false;

    const entry = this.cache[key];
    const now = Date.now();

    // Return fresh cached data immediately
    if (!forceRefresh && entry && (now - entry.updatedAt) < staleTime) {
      this._touch(key, cacheTime);
      return entry.data;
    }

    // Stale but cached — return stale data and refetch in background
    if (!forceRefresh && entry && entry.data !== undefined) {
      this._touch(key, cacheTime);
      this._fetchAndStore(key, fetchFn, cacheTime);
      return entry.data;
    }

    // No cache or forced — await fresh data
    return this._fetchAndStore(key, fetchFn, cacheTime);
  }

  /**
   * Deduplicated fetch — only one in-flight request per key.
   */
  async _fetchAndStore(key, fetchFn, cacheTime) {
    // Deduplicate: if already in flight, piggyback on existing promise
    if (this.inflight[key]) {
      return this.inflight[key];
    }

    const self = this;
    this.inflight[key] = fetchFn()
      .then(function (data) {
        self.cache[key] = {
          data: data,
          error: null,
          updatedAt: Date.now(),
          timeout: null,
        };
        self._touch(key, cacheTime);
        self._notify(key, data, null);
        delete self.inflight[key];
        return data;
      })
      .catch(function (err) {
        // Keep stale data on error if available
        if (self.cache[key] && self.cache[key].data !== undefined) {
          self.cache[key].error = err;
          self._notify(key, self.cache[key].data, err);
        } else {
          self.cache[key] = { data: undefined, error: err, updatedAt: Date.now(), timeout: null };
          self._notify(key, undefined, err);
        }
        delete self.inflight[key];
        throw err;
      });

    return this.inflight[key];
  }

  /**
   * Reset the GC timer for an entry.
   */
  _touch(key, cacheTime) {
    const entry = this.cache[key];
    if (!entry) return;
    if (entry.timeout) clearTimeout(entry.timeout);
    const self = this;
    entry.timeout = setTimeout(function () {
      delete self.cache[key];
    }, cacheTime);
  }

  /**
   * Garbage collect expired entries.
   */
  _gc() {
    const now = Date.now();
    const keys = Object.keys(this.cache);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const entry = this.cache[key];
      // If no timeout is set and entry is older than default cache time, remove
      if (!entry.timeout && (now - entry.updatedAt) > DEFAULT_CACHE_TIME) {
        delete this.cache[key];
      }
    }
  }

  /**
   * Get cached data synchronously (for initial render).
   * Returns undefined if not cached.
   */
  getCache(key) {
    const entry = this.cache[key];
    if (entry && entry.data !== undefined) return entry.data;
    return undefined;
  }

  /**
   * Invalidate cache entries.
   * @param {string|string[]} keys  Exact key(s) to invalidate
   */
  invalidate(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (let i = 0; i < list.length; i++) {
      delete this.cache[list[i]];
      delete this.inflight[list[i]];
    }
  }

  /**
   * Invalidate all keys starting with a prefix.
   * e.g., invalidatePrefix('conversations') clears 'conversations-list', 'conversations-C123', etc.
   */
  invalidatePrefix(prefix) {
    const keys = Object.keys(this.cache);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(prefix) === 0) {
        if (this.cache[keys[i]] && this.cache[keys[i]].timeout) {
          clearTimeout(this.cache[keys[i]].timeout);
        }
        delete this.cache[keys[i]];
        delete this.inflight[keys[i]];
      }
    }
  }

  /**
   * Set data directly (optimistic update / prefetch).
   */
  setData(key, data) {
    this.cache[key] = {
      data: data,
      error: null,
      updatedAt: Date.now(),
      timeout: null,
    };
    this._touch(key, DEFAULT_CACHE_TIME);
    this._notify(key, data, null);
  }

  /**
   * Subscribe to cache changes for a key.
   * Returns unsubscribe function.
   */
  subscribe(key, callback) {
    if (!this.listeners[key]) this.listeners[key] = new Set();
    this.listeners[key].add(callback);
    const self = this;
    return function () {
      if (self.listeners[key]) {
        self.listeners[key].delete(callback);
        if (self.listeners[key].size === 0) delete self.listeners[key];
      }
    };
  }

  _notify(key, data, error) {
    const set = this.listeners[key];
    if (!set) return;
    set.forEach(function (cb) {
      cb(data, error);
    });
  }

  /**
   * Clear everything.
   */
  clear() {
    const keys = Object.keys(this.cache);
    for (let i = 0; i < keys.length; i++) {
      if (this.cache[keys[i]] && this.cache[keys[i]].timeout) {
        clearTimeout(this.cache[keys[i]].timeout);
      }
    }
    this.cache = {};
    this.inflight = {};
    this.listeners = {};
  }

  destroy() {
    this.clear();
    if (this.gcTimer) clearInterval(this.gcTimer);
  }
}

// Singleton instance — shared across the app
const queryCache = new QueryCache();

module.exports = queryCache;
