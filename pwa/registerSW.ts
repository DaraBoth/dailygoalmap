// Extend the Window interface to include deferredPrompt
declare global {
  interface Window {
    deferredPrompt: BeforeInstallPromptEvent | null;
  }

  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
    prompt(): Promise<void>;
  }
}

/**
 * Register the service worker for PWA functionality
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service Workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New service worker available');
            // Optionally notify user about update
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

/**
 * Install the PWA app
 * @param onDismiss - Callback function to execute if user dismisses the install prompt
 */
export const installApp = async (onDismiss?: () => void): Promise<boolean> => {
  if (!window.deferredPrompt) {
    console.log('Install prompt is not available');
    if (onDismiss) {
      onDismiss();
    }
    return false;
  }

  try {
    // Show the install prompt
    await window.deferredPrompt.prompt();

    // Wait for the user's response
    const choiceResult = await window.deferredPrompt.userChoice;

    console.log('User choice:', choiceResult.outcome);

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
      window.deferredPrompt = null;
      return true;
    } else {
      console.log('User dismissed the install prompt');
      if (onDismiss) {
        onDismiss();
      }
      return false;
    }
  } catch (error) {
    console.error('Error during app installation:', error);
    if (onDismiss) {
      onDismiss();
    }
    return false;
  }
};

/**
 * Check if the app is already installed
 */
export const isAppInstalled = (): boolean => {
  // Check if running as standalone PWA
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check if running as iOS PWA
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) {
    return true;
  }

  return false;
};

/**
 * Listen for the beforeinstallprompt event
 */
if (typeof window !== 'undefined') {
  // Initialize deferredPrompt
  window.deferredPrompt = null;
  
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    
    // Store the event so it can be triggered later
    window.deferredPrompt = e as BeforeInstallPromptEvent;
    
    console.log('beforeinstallprompt event captured');
    
    // Dispatch a custom event to notify components
    window.dispatchEvent(new CustomEvent('installable'));
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    window.deferredPrompt = null;
    
    // Dispatch a custom event to notify components
    window.dispatchEvent(new CustomEvent('appinstalled'));
  });
}

// Auto-register service worker on load (with safeguards)
if (typeof window !== 'undefined') {
  let registrationInProgress = false;
  
  window.addEventListener('load', () => {
    // Prevent multiple simultaneous registrations
    if (registrationInProgress) {
      console.log('Service worker registration already in progress');
      return;
    }
    
    registrationInProgress = true;
    registerServiceWorker().finally(() => {
      registrationInProgress = false;
    });
  });
}
