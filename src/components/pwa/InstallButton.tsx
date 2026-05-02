import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Zap } from "lucide-react";
import { installApp } from "@/pwa/registerSW";
import InstallGuide from "./InstallGuide";
import NotificationPrompt from "./NotificationPrompt";
import { isNotificationsEnabled } from "@/pwa/notificationService";

type Platform = 'ios' | 'android' | 'desktop' | 'unknown';
type Browser = 'chrome' | 'safari' | 'edge' | 'firefox' | 'other';

export function InstallButton() {
  const [canInstall, setCanInstall] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [browser, setBrowser] = useState<Browser>('other');
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const lowerUa = ua.toLowerCase();

    const installedByDisplayMode = window.matchMedia('(display-mode: standalone)').matches;
    const installedByIos = typeof (navigator as any).standalone === 'boolean' && (navigator as any).standalone;
    setIsInstalled(installedByDisplayMode || installedByIos);

    if (/iPad|iPhone|iPod/.test(ua)) {
      setPlatform('ios');
      setBrowser(lowerUa.includes('crios') ? 'chrome' : 'safari');
    } else if (/Android/.test(ua)) {
      setPlatform('android');
      if (/EdgA/.test(ua)) {
        setBrowser('edge');
      } else if (/Chrome/.test(ua)) {
        setBrowser('chrome');
      } else if (/Firefox/.test(ua)) {
        setBrowser('firefox');
      }
    } else {
      setPlatform('desktop');
      if (/Edg/.test(ua)) {
        setBrowser('edge');
      } else if (/Chrome/.test(ua)) {
        setBrowser('chrome');
      } else if (/Firefox/.test(ua)) {
        setBrowser('firefox');
      } else if (/Safari/.test(ua)) {
        setBrowser('safari');
      }
    }

    const checkInstallability = () => {
      setCanInstall(!!window.deferredPrompt);
    };

    const handleInstallReady = () => {
      setCanInstall(true);
    };

    const handleInstalled = async () => {
      setCanInstall(false);
      const notificationsEnabled = await isNotificationsEnabled();
      if (!notificationsEnabled) {
        setTimeout(() => {
          setShowNotificationPrompt(true);
        }, 1200);
      }
    };

    checkInstallability();
    window.addEventListener('beforeinstallprompt', handleInstallReady);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallReady);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const supportsManualOnly = platform === 'ios' || browser === 'safari';
  const supportsOneTap = !supportsManualOnly && (browser === 'chrome' || browser === 'edge');
  const canOneTapInstall = supportsOneTap && canInstall && !isInstalled;

  const handleInstall = async () => {
    const installReady = !!window.deferredPrompt;
    if (supportsOneTap && installReady) {
      setCanInstall(true);
      await installApp();
      setCanInstall(false);
      return;
    }
  };

  const ctaLabel = isInstalled
    ? 'Already installed'
    : canOneTapInstall
      ? 'Install now'
      : platform === 'ios'
        ? 'See iPhone install steps'
        : platform === 'android'
          ? 'See Android install steps'
          : 'See browser install steps';

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary font-semibold">Smart Install</p>
            <h3 className="text-lg font-semibold mt-1">Install Orbit in under 10 seconds</h3>
            <p className="text-sm text-muted-foreground mt-1">
              We detect your device and show the fastest path automatically.
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
        </div>

        <Button
          id="install-button"
          size="sm"
          className="mt-4 w-full sm:w-auto"
          onClick={handleInstall}
          disabled={isInstalled || !canOneTapInstall}
        >
          <Download className="h-4 w-4 mr-2" />
          {ctaLabel}
        </Button>
      </div>

      <InstallGuide
        canInstall={canOneTapInstall}
        platform={platform}
        browser={browser}
        isInstalled={isInstalled}
      />

      <NotificationPrompt 
        isOpen={showNotificationPrompt} 
        onClose={() => setShowNotificationPrompt(false)} 
      />
    </div>
  );
}

export default InstallButton;
