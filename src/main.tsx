
import React from 'react'
import { createRoot } from 'react-dom/client'
import { AppRouter } from './router'
import './index.css'
import { registerServiceWorker, checkInstallability } from './pwa/registerSW'
import { initializeClientApi } from './utils/clientApi'
import { initializeRoutePreloading } from './services/routePreloader'
import { initializeRouteCache } from './services/routeCache'
import { initializePerformanceMonitoring } from './services/performanceMonitor'

const shouldRegisterServiceWorker =
  'serviceWorker' in navigator &&
  (import.meta.env.PROD || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

window.addEventListener('load', async () => {
  try {
    if (shouldRegisterServiceWorker) {
      await registerServiceWorker()
      console.log('Service Worker registered successfully')
    }

    initializeClientApi()

    const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
    if (favicon) {
      favicon.href = `/logo/newlogo.png?${new Date().getTime()}`
    }

    checkInstallability()
    initializeRoutePreloading()
    initializeRouteCache()
    initializePerformanceMonitoring()
  } catch (error) {
    console.error('App bootstrap failed:', error)
  }
})

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
