import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Chrome, Smartphone, Apple, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { installApp } from '@/pwa/registerSW';

export function InstallGuide() {
  const { toast } = useToast();
  const [canInstall, setCanInstall] = React.useState(false);
  const [platform, setPlatform] = React.useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');
  const [browser, setBrowser] = React.useState<'chrome' | 'safari' | 'firefox' | 'other'>('other');

  React.useEffect(() => {
    console.log("InstallGuide component mounted");

    // Detect platform
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) {
      setPlatform('ios');
      setBrowser('safari');
    } else if (/Android/.test(ua)) {
      setPlatform('android');
      if (/Chrome/.test(ua)) {
        setBrowser('chrome');
      } else if (/Firefox/.test(ua)) {
        setBrowser('firefox');
      }
    } else {
      setPlatform('desktop');
      if (/Chrome/.test(ua)) {
        setBrowser('chrome');
      } else if (/Firefox/.test(ua)) {
        setBrowser('firefox');
      } else if (/Safari/.test(ua)) {
        setBrowser('safari');
      }
    }

    console.log("Detected platform:", platform);
    console.log("Detected browser:", browser);

    // Check if installable
    setCanInstall(!!window.deferredPrompt || process.env.NODE_ENV === 'development'); // Fallback for local testing

    window.addEventListener('beforeinstallprompt', () => {
      setCanInstall(true);
    });
  }, []);

  const handleInstall = async () => {
    try {
      await installApp();
      toast({
        title: "Installation Started",
        description: "Follow the prompts to complete installation"
      });
    } catch (error) {
      console.error("Installation error:", error);
      toast({
        title: "Installation Failed",
        description: "There was a problem installing the app",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Install Goal Completer App
        </CardTitle>
        <CardDescription>
          Install our app on your device for a better experience. Created by Vong Pichdaraboth.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h3 className="font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Debugging: Always Visible
          </h3>
          <p className="text-sm mt-2 text-green-600 dark:text-green-400">
            This section is now always visible for debugging purposes.
          </p>
        </div>
        {/* Render all instructions unconditionally */}
        <div className="mt-4">
          <h3 className="font-medium mb-2">Installation Instructions:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Chrome className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>Tap the three dots ⋮ in the top right of Chrome</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 flex justify-center">2.</span>
              <p>Tap "Add to Home screen"</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 flex justify-center">3.</span>
              <p>Follow the on-screen instructions</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default InstallGuide;
