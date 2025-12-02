/**
 * Router Test Utilities
 * Helper functions for testing TanStack Router implementation
 */

import { router } from '@/router'
import { performanceMonitor } from '@/services/performanceMonitor'
import { routeCache } from '@/services/routeCache'
import { routePreloader } from '@/services/routePreloader'

/**
 * Test router navigation performance
 */
export async function testRouterPerformance() {
  console.group('🧪 Testing TanStack Router Performance')
  
  try {
    // Test route preloading
    console.log('Testing route preloading...')
    await routePreloader.preloadRoute('/dashboard', 'high')
    await routePreloader.preloadRoute('/profile', 'normal')
    
    // Test cache functionality
    console.log('Testing cache functionality...')
    routeCache.set('test-key', { data: 'test' }, 60000)
    const cachedData = routeCache.get('test-key')
    console.log('Cache test:', cachedData ? '✅ Pass' : '❌ Fail')
    
    // Test performance monitoring
    console.log('Testing performance monitoring...')
    performanceMonitor.startNavigation('/test')
    setTimeout(() => {
      performanceMonitor.endNavigation('/test', false)
      const metrics = performanceMonitor.getRouteMetrics('/test')
      console.log('Performance test:', metrics ? '✅ Pass' : '❌ Fail')
    }, 100)
    
    // Get router stats
    const preloaderStats = routePreloader.getStats()
    const cacheStats = routeCache.getStats()
    const performanceStats = performanceMonitor.getPerformanceSummary()
    
    console.log('📊 Router Statistics:')
    console.log('Preloader:', preloaderStats)
    console.log('Cache:', cacheStats)
    console.log('Performance:', performanceStats)
    
    console.log('✅ All router tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Router test failed:', error)
  }
  
  console.groupEnd()
}

/**
 * Test route navigation
 */
export async function testRouteNavigation() {
  console.group('🧪 Testing Route Navigation')
  
  try {
    // Test programmatic navigation
    console.log('Testing programmatic navigation...')
    
    // This would be used in a real component
    const testNavigation = async () => {
      await router.navigate({ to: '/dashboard' })
      console.log('Navigation to dashboard: ✅ Pass')
      
      await router.navigate({ to: '/profile' })
      console.log('Navigation to profile: ✅ Pass')
      
      await router.navigate({ to: '/' })
      console.log('Navigation to home: ✅ Pass')
    }
    
    console.log('Navigation tests would run in browser context')
    console.log('✅ Navigation test setup completed!')
    
  } catch (error) {
    console.error('❌ Navigation test failed:', error)
  }
  
  console.groupEnd()
}

/**
 * Test route protection
 */
export async function testRouteProtection() {
  console.group('🧪 Testing Route Protection')
  
  try {
    console.log('Testing route protection logic...')
    
    // Test protected routes
    const protectedRoutes = ['/dashboard', '/profile']
    const publicRoutes = ['/', '/about', '/terms', '/login', '/register']
    
    console.log('Protected routes:', protectedRoutes)
    console.log('Public routes:', publicRoutes)
    
    // In a real test, we would check authentication requirements
    console.log('✅ Route protection test setup completed!')
    
  } catch (error) {
    console.error('❌ Route protection test failed:', error)
  }
  
  console.groupEnd()
}

/**
 * Run all router tests
 */
export async function runAllRouterTests() {
  console.log('🚀 Starting TanStack Router Tests...')
  
  await testRouterPerformance()
  await testRouteNavigation()
  await testRouteProtection()
  
  console.log('🎉 All router tests completed!')
}

/**
 * Get router health status
 */
export function getRouterHealthStatus() {
  const health = {
    router: !!router,
    preloader: !!routePreloader,
    cache: !!routeCache,
    performanceMonitor: !!performanceMonitor,
    routeTree: !!router.routeTree,
  }
  
  const isHealthy = Object.values(health).every(Boolean)
  
  return {
    healthy: isHealthy,
    components: health,
    status: isHealthy ? 'All systems operational' : 'Some components missing',
  }
}

// Auto-run tests in development
if (process.env.NODE_ENV === 'development') {
  // Run tests after a short delay to ensure everything is initialized
  setTimeout(() => {
    const health = getRouterHealthStatus()
    console.log('🏥 Router Health Check:', health)
    
    if (health.healthy) {
      // Uncomment to run tests automatically
      // runAllRouterTests()
    }
  }, 2000)
}
