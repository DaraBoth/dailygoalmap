/**
 * Route Cache Service
 * Provides intelligent caching for route data and components
 */
export class RouteCache {
  private static instance: RouteCache
  private cache = new Map<string, CacheEntry>()
  private maxSize = 50 // Maximum number of cached entries
  private defaultTTL = 5 * 60 * 1000 // 5 minutes default TTL

  static getInstance(): RouteCache {
    if (!RouteCache.instance) {
      RouteCache.instance = new RouteCache()
    }
    return RouteCache.instance
  }

  /**
   * Set cache entry
   */
  set(key: string, data: any, ttl?: number): void {
    // Clean up expired entries if cache is getting full
    if (this.cache.size >= this.maxSize) {
      this.cleanup()
    }

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      accessCount: 0,
      lastAccess: Date.now(),
    }

    this.cache.set(key, entry)
  }

  /**
   * Get cache entry
   */
  get(key: string): any | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccess = Date.now()

    return entry.data
  }

  /**
   * Check if cache has valid entry
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    return entry ? !this.isExpired(entry) : false
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values())
    const expired = entries.filter(entry => this.isExpired(entry)).length
    const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0)

    return {
      totalEntries: this.cache.size,
      expiredEntries: expired,
      totalAccess,
      hitRate: totalAccess > 0 ? (this.cache.size - expired) / this.cache.size : 0,
      memoryUsage: this.estimateMemoryUsage(),
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    
    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
      }
    })

    // If still too many entries, remove least recently used
    if (this.cache.size >= this.maxSize) {
      const sortedEntries = entries
        .filter(([, entry]) => !this.isExpired(entry))
        .sort((a, b) => a[1].lastAccess - b[1].lastAccess)

      const toRemove = sortedEntries.slice(0, Math.floor(this.maxSize * 0.2))
      toRemove.forEach(([key]) => this.cache.delete(key))
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private estimateMemoryUsage(): number {
    let size = 0
    this.cache.forEach((entry, key) => {
      size += key.length * 2 // String characters are 2 bytes
      size += JSON.stringify(entry.data).length * 2
      size += 64 // Overhead for entry metadata
    })
    return size
  }

  /**
   * Preload cache with critical data
   */
  async preloadCriticalData(): Promise<void> {
    // This would be implemented based on your specific needs
    // For example, preload user profile, dashboard data, etc.
    console.log('Preloading critical cache data...')
  }

  /**
   * Export cache for debugging
   */
  exportCache(): string {
    const cacheData = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      timestamp: entry.timestamp,
      ttl: entry.ttl,
      accessCount: entry.accessCount,
      lastAccess: entry.lastAccess,
      expired: this.isExpired(entry),
      dataSize: JSON.stringify(entry.data).length,
    }))

    return JSON.stringify({
      stats: this.getStats(),
      entries: cacheData,
    }, null, 2)
  }
}

// Types
interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
  accessCount: number
  lastAccess: number
}

interface CacheStats {
  totalEntries: number
  expiredEntries: number
  totalAccess: number
  hitRate: number
  memoryUsage: number
}

// Export singleton instance
export const routeCache = RouteCache.getInstance()

/**
 * Cache key generators for different types of data
 */
export const CacheKeys = {
  userGoals: (userId: string, sortOption: string) => `goals:${userId}:${sortOption}`,
  goalDetail: (goalId: string) => `goal:${goalId}`,
  goalMembers: (goalId: string) => `members:${goalId}`,
  goalTasks: (goalId: string) => `tasks:${goalId}`,
  userProfile: (userId: string) => `profile:${userId}`,
  goalAccess: (goalId: string, userId?: string) => `access:${goalId}:${userId || 'anonymous'}`,
}

/**
 * Initialize route caching
 */
export function initializeRouteCache(): void {
  // Preload critical data
  routeCache.preloadCriticalData()

  // Set up periodic cleanup
  setInterval(() => {
    const stats = routeCache.getStats()
    if (stats.expiredEntries > 10) {
      console.log('Cleaning up route cache...')
      // Trigger cleanup by trying to set a dummy entry
      routeCache.set('__cleanup__', null)
      routeCache.delete('__cleanup__')
    }
  }, 60000) // Every minute

  // Log cache stats in development
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const stats = routeCache.getStats()
      if (stats.totalEntries > 0) {
        console.log('📦 Route Cache Stats:', {
          entries: stats.totalEntries,
          expired: stats.expiredEntries,
          hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
          memory: `${(stats.memoryUsage / 1024).toFixed(1)}KB`,
        })
      }
    }, 30000) // Every 30 seconds
  }
}
