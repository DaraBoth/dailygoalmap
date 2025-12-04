/**
 * Performance Monitor Service
 * Tracks route loading performance and provides insights
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private routeMetrics = new Map<string, RouteMetrics>()
  private navigationStart = 0

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Start tracking a route navigation
   */
  startNavigation(route: string): void {
    this.navigationStart = performance.now()
    
    if (!this.routeMetrics.has(route)) {
      this.routeMetrics.set(route, {
        route,
        totalNavigations: 0,
        averageLoadTime: 0,
        fastestLoad: Infinity,
        slowestLoad: 0,
        lastLoad: 0,
        cacheHits: 0,
        cacheMisses: 0,
      })
    }
  }

  /**
   * End tracking a route navigation
   */
  endNavigation(route: string, fromCache: boolean = false): void {
    const loadTime = performance.now() - this.navigationStart
    const metrics = this.routeMetrics.get(route)
    
    if (!metrics) return

    // Update metrics
    metrics.totalNavigations++
    metrics.lastLoad = loadTime
    metrics.fastestLoad = Math.min(metrics.fastestLoad, loadTime)
    metrics.slowestLoad = Math.max(metrics.slowestLoad, loadTime)
    
    // Update average (running average)
    metrics.averageLoadTime = (
      (metrics.averageLoadTime * (metrics.totalNavigations - 1) + loadTime) / 
      metrics.totalNavigations
    )

    // Update cache metrics
    if (fromCache) {
      metrics.cacheHits++
    } else {
      metrics.cacheMisses++
    }

    // Log performance in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Route ${route} loaded in ${loadTime.toFixed(2)}ms ${fromCache ? '(cached)' : '(fresh)'}`)
    }
  }

  /**
   * Get performance metrics for a route
   */
  getRouteMetrics(route: string): RouteMetrics | undefined {
    return this.routeMetrics.get(route)
  }

  /**
   * Get all performance metrics
   */
  getAllMetrics(): RouteMetrics[] {
    return Array.from(this.routeMetrics.values())
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): PerformanceSummary {
    const allMetrics = this.getAllMetrics()
    
    if (allMetrics.length === 0) {
      return {
        totalRoutes: 0,
        totalNavigations: 0,
        averageLoadTime: 0,
        cacheHitRate: 0,
        slowestRoute: null,
        fastestRoute: null,
      }
    }

    const totalNavigations = allMetrics.reduce((sum, m) => sum + m.totalNavigations, 0)
    const totalCacheHits = allMetrics.reduce((sum, m) => sum + m.cacheHits, 0)
    const totalCacheMisses = allMetrics.reduce((sum, m) => sum + m.cacheMisses, 0)
    
    const overallAverageLoadTime = allMetrics.reduce(
      (sum, m) => sum + (m.averageLoadTime * m.totalNavigations), 0
    ) / totalNavigations

    const slowestRoute = allMetrics.reduce((slowest, current) => 
      current.slowestLoad > slowest.slowestLoad ? current : slowest
    )

    const fastestRoute = allMetrics.reduce((fastest, current) => 
      current.fastestLoad < fastest.fastestLoad ? current : fastest
    )

    return {
      totalRoutes: allMetrics.length,
      totalNavigations,
      averageLoadTime: overallAverageLoadTime,
      cacheHitRate: totalCacheHits / (totalCacheHits + totalCacheMisses),
      slowestRoute,
      fastestRoute,
    }
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.getAllMetrics(),
      summary: this.getPerformanceSummary(),
    }, null, 2)
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.routeMetrics.clear()
  }

  /**
   * Get Web Vitals if available
   */
  getWebVitals(): WebVitals | null {
    if (!('performance' in window) || !performance.getEntriesByType) {
      return null
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paint = performance.getEntriesByType('paint')
    
    if (!navigation) return null

    const fcp = paint.find(entry => entry.name === 'first-contentful-paint')
    const lcp = paint.find(entry => entry.name === 'largest-contentful-paint')

    return {
      fcp: fcp?.startTime || 0,
      lcp: lcp?.startTime || 0,
      ttfb: navigation.responseStart - navigation.requestStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
    }
  }
}

// Types
interface RouteMetrics {
  route: string
  totalNavigations: number
  averageLoadTime: number
  fastestLoad: number
  slowestLoad: number
  lastLoad: number
  cacheHits: number
  cacheMisses: number
}

interface PerformanceSummary {
  totalRoutes: number
  totalNavigations: number
  averageLoadTime: number
  cacheHitRate: number
  slowestRoute: RouteMetrics | null
  fastestRoute: RouteMetrics | null
}

interface WebVitals {
  fcp: number // First Contentful Paint
  lcp: number // Largest Contentful Paint
  ttfb: number // Time to First Byte
  domContentLoaded: number
  loadComplete: number
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring(): void {
  // Monitor route changes
  let currentRoute = window.location.pathname
  
  const observer = new MutationObserver(() => {
    const newRoute = window.location.pathname
    if (newRoute !== currentRoute) {
      performanceMonitor.endNavigation(currentRoute)
      performanceMonitor.startNavigation(newRoute)
      currentRoute = newRoute
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  // Start monitoring current route
  performanceMonitor.startNavigation(currentRoute)

  // Log performance summary periodically in development
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const summary = performanceMonitor.getPerformanceSummary()
      if (summary.totalNavigations > 0) {
        console.group('🚀 Route Performance Summary')
        console.log(`Total Routes: ${summary.totalRoutes}`)
        console.log(`Total Navigations: ${summary.totalNavigations}`)
        console.log(`Average Load Time: ${summary.averageLoadTime.toFixed(2)}ms`)
        console.log(`Cache Hit Rate: ${(summary.cacheHitRate * 100).toFixed(1)}%`)
        if (summary.slowestRoute) {
          console.log(`Slowest Route: ${summary.slowestRoute.route} (${summary.slowestRoute.slowestLoad.toFixed(2)}ms)`)
        }
        if (summary.fastestRoute) {
          console.log(`Fastest Route: ${summary.fastestRoute.route} (${summary.fastestRoute.fastestLoad.toFixed(2)}ms)`)
        }
        console.groupEnd()
      }
    }, 300000) // Every 5 minutes (reduced CPU usage)
  }
}
