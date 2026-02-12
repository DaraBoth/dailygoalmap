import { router } from '@/router'

/**
 * Route Preloader Service
 * Provides intelligent route preloading for better performance
 */
export class RoutePreloader {
  private static instance: RoutePreloader
  private preloadedRoutes = new Set<string>()
  private preloadQueue: string[] = []
  private isProcessing = false

  static getInstance(): RoutePreloader {
    if (!RoutePreloader.instance) {
      RoutePreloader.instance = new RoutePreloader()
    }
    return RoutePreloader.instance
  }

  /**
   * Preload a route with its data
   */
  async preloadRoute(path: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    if (this.preloadedRoutes.has(path)) {
      return // Already preloaded
    }

    if (priority === 'high') {
      this.preloadQueue.unshift(path)
    } else {
      this.preloadQueue.push(path)
    }

    this.processQueue()
  }

  /**
   * Preload critical routes for faster navigation
   */
  async preloadCriticalRoutes(): Promise<void> {
    const criticalRoutes = ['/dashboard', '/login']

    for (const route of criticalRoutes) {
      await this.preloadRoute(route, 'high')
    }
  }

  /**
   * Preload routes based on user behavior patterns
   */
  async preloadPredictiveRoutes(currentPath: string): Promise<void> {
    const predictions = this.getPredictedRoutes(currentPath)

    for (const route of predictions) {
      await this.preloadRoute(route, 'normal')
    }
  }

  /**
   * Get predicted routes based on current location
   */
  private getPredictedRoutes(currentPath: string): string[] {
    const predictions: string[] = []

    switch (currentPath) {
      case '/':
        predictions.push('/login', '/register', '/about')
        break
      case '/login':
        predictions.push('/dashboard', '/register')
        break
      case '/register':
        predictions.push('/dashboard', '/login')
        break
      case '/dashboard':
        predictions.push('/profile')
        break
      default:
        if (currentPath.startsWith('/goal/')) {
          predictions.push('/dashboard')
        }
    }

    return predictions
  }

  /**
   * Process the preload queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.preloadQueue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.preloadQueue.length > 0) {
      const path = this.preloadQueue.shift()!

      if (this.preloadedRoutes.has(path)) {
        continue
      }

      try {
        await this.performPreload(path)
        this.preloadedRoutes.add(path)
      } catch (error) {
        console.warn(`Failed to preload route ${path}:`, error)
      }

      // Small delay to prevent blocking the main thread
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    this.isProcessing = false
  }

  /**
   * Perform the actual preload
   */
  private async performPreload(path: string): Promise<void> {
    try {
      await router.preloadRoute({ to: path })
    } catch (error) {
      // Ignore preload errors for non-critical routes
      console.debug(`Preload failed for ${path}:`, error)
    }
  }

  /**
   * Clear preload cache
   */
  clearCache(): void {
    this.preloadedRoutes.clear()
    this.preloadQueue.length = 0
  }

  /**
   * Get preload statistics
   */
  getStats(): { preloaded: number; queued: number } {
    return {
      preloaded: this.preloadedRoutes.size,
      queued: this.preloadQueue.length,
    }
  }
}

// Export singleton instance
export const routePreloader = RoutePreloader.getInstance()

/**
 * Initialize route preloading
 */
export function initializeRoutePreloading(): void {
  // Preload critical routes immediately
  routePreloader.preloadCriticalRoutes()

  // Set up event delegation for link preloading
  // This is much more efficient than MutationObserver as it only fires on user interaction
  const handlePreload = (e: MouseEvent) => {
    const link = (e.target as HTMLElement).closest('a');
    if (link) {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/')) {
        routePreloader.preloadRoute(href, 'low');
      }
    }
  };

  document.addEventListener('mouseover', handlePreload, { passive: true });

  // Optional: Also observe links that enter the viewport for predictive loading
  // but only those currently in the DOM, without constant re-scanning.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement;
            const href = link.getAttribute('href');
            if (href && href.startsWith('/')) {
              routePreloader.preloadRoute(href, 'low');
              observer.unobserve(link); // Only need to preload once
            }
          }
        });
      },
      { rootMargin: '50px' }
    );

    const observeVisibleLinks = () => {
      document.querySelectorAll('a[href^="/"]').forEach((link) => {
        observer.observe(link);
      });
    };

    observeVisibleLinks();
  }

  // Preload based on current route
  const currentPath = window.location.pathname
  routePreloader.preloadPredictiveRoutes(currentPath)
}
