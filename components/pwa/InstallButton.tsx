import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { installApp } from "@/pwa/registerSW";
import InstallGuide from "./InstallGuide";
import NotificationPrompt from "./NotificationPrompt";
import { isNotificationsEnabled } from "@/pwa/notificationService";

export function InstallButton() {
  const [canInstall, setCanInstall] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    // Check if the deferredPrompt exists (set in registerSW.ts)
    const checkInstallability = () => {
      setCanInstall(!!window.deferredPrompt);
    };

    // Check initially and add event listener
    checkInstallability();
    window.addEventListener('beforeinstallprompt', () => {
      setCanInstall(true);
    });
    window.addEventListener('appinstalled', async () => {
      setCanInstall(false);
      
      // Check if notifications are enabled after PWA install
      const notificationsEnabled = await isNotificationsEnabled();
      if (!notificationsEnabled) {
        // Show notification prompt after PWA is installed
        setTimeout(() => {
          setShowNotificationPrompt(true);
        }, 2000); // Wait 2 seconds after install
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', checkInstallability);
      window.removeEventListener('appinstalled', checkInstallability);
    };
  }, []);

  const handleInstall = async () => {
    if (canInstall) {
      await installApp(() => setShowGuide(true)); // Show guide if dismissed
      setCanInstall(false);
    } else {
      setShowGuide(true);
    }
  };

  return (
    <div>
      <Button 
        id="install-button" 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-1 w-full"
        onClick={handleInstall}
      >
        <Download className="h-4 w-4" />
        {canInstall ? "Install App" : "How to Install"}
      </Button>
      {showGuide && <InstallGuide />}
      <NotificationPrompt 
        isOpen={showNotificationPrompt} 
        onClose={() => setShowNotificationPrompt(false)} 
      />
    </div>
  );
}

export default InstallButton;
