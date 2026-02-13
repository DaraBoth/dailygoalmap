
import React from 'react'
import { createRoot } from 'react-dom/client'
import { AppRouter } from './router'
import './index.css'
import { registerServiceWorker, checkInstallability } from './pwa/registerSW'
import { initializeClientApi } from './utils/clientApi'
import { initializeRoutePreloading } from './services/routePreloader'
import { initializeRouteCache } from './services/routeCache'
import { initializePerformanceMonitoring } from './services/performanceMonitor'

let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener("beforeinstallprompt", (event: Event) => {
  // Prevent the default mini-infobar from appearing
  event.preventDefault();

  if (!deferredPrompt) {
    // Cast the event to BeforeInstallPromptEvent
    deferredPrompt = event as BeforeInstallPromptEvent;
    console.log("beforeinstallprompt event captured");

    // Optionally, show a custom install button
    const installButton = document.getElementById("install-button");
    if (installButton) {
      installButton.style.display = "block";
      installButton.addEventListener("click", async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const choiceResult = await deferredPrompt.userChoice;
          console.log("User choice:", choiceResult.outcome);
          deferredPrompt = null; // Reset the prompt
        }
      });
    }
  }
});

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await registerServiceWorker();
      console.log('Service Worker registered successfully');

      // Initialize client API for offline support
      initializeClientApi();

      // Force reload favicon
      const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (favicon) {
        favicon.href = `/logo/newlogo.png?${new Date().getTime()}`;
      }

      // Check if app can be installed
      checkInstallability();

      // Initialize route preloading for better performance
      initializeRoutePreloading();

      // Initialize route caching
      initializeRouteCache();

      // Initialize performance monitoring
      initializePerformanceMonitoring();
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
