
import React from 'react'
import { createRoot } from 'react-dom/client'
import { AppRouter } from './router'
import './index.css'
import { initializeRoutePreloading } from './services/routePreloader'
import { initializeRouteCache } from './services/routeCache'
import { initializePerformanceMonitoring } from './services/performanceMonitor'

// Initialize optimizations
window.addEventListener('load', () => {
  // Initialize route preloading for better performance
  initializeRoutePreloading();

  // Initialize route caching
  initializeRouteCache();

  // Initialize performance monitoring
  initializePerformanceMonitoring();
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
