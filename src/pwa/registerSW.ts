// PWA Service Worker Registration

// Register service worker
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered successfully', registration.scope);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

// Check if the app can be installed
export function checkInstallability(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Store the event so it can be triggered later
    window.deferredPrompt = e;
    
    // Update UI to notify the user they can install the PWA
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.classList.remove('hidden');
    }
  });
  
  // Handle the install completion
  window.addEventListener('appinstalled', () => {
    // Clear the deferredPrompt
    window.deferredPrompt = null;
    // Hide the install button
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.classList.add('hidden');
    }
    // Log the installation
    console.log('PWA was installed');
  });
}

// Function to handle the actual installation
export async function installApp(onDismiss?: () => void): Promise<void> {
  if (!window.deferredPrompt) {
    console.log('No installation prompt available');
    return;
  }

  // Show the installation prompt
  window.deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  const choiceResult = await window.deferredPrompt.userChoice;

  // Clear the deferredPrompt variable
  window.deferredPrompt = null;

  if (choiceResult.outcome === 'accepted') {
    console.log('User accepted the install prompt');
  } else {
    console.log('User dismissed the install prompt');
    if (onDismiss) {
      onDismiss(); // Call the dismissal callback
    }
  }
}

// Add to global window object
declare global {
  interface Window {
    deferredPrompt: any;
  }
}
