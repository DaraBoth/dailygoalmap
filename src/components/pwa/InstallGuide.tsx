import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Chrome, Smartphone, Apple, Monitor, CheckCircle2, Info } from 'lucide-react';

type Platform = 'ios' | 'android' | 'desktop' | 'unknown';
type Browser = 'chrome' | 'safari' | 'edge' | 'firefox' | 'other';

interface InstallGuideProps {
  canInstall?: boolean;
  platform?: Platform;
  browser?: Browser;
  isInstalled?: boolean;
}

interface ManualStepData {
  title: string;
  steps: string[];
}

export function InstallGuide({ canInstall = false, platform = 'unknown', browser = 'other', isInstalled = false }: InstallGuideProps) {
  const [isLocalhost, setIsLocalhost] = React.useState(false);

  React.useEffect(() => {
    setIsLocalhost(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  }, []);

  const getManualInstructions = (): ManualStepData => {
    if (platform === 'ios') {
      return {
        title: 'iPhone and iPad (Safari)',
        steps: [
          'Tap the Share icon in Safari.',
          'Select Add to Home Screen.',
          'Tap Add to finish install.'
        ]
      };
    }

    if (platform === 'android') {
      if (browser === 'chrome' || browser === 'edge') {
        return {
          title: 'Android (Chrome or Edge)',
          steps: [
            'Open the browser menu (three dots).',
            'Tap Install app or Add to Home screen.',
            'Confirm Install.'
          ]
        };
      }

      return {
        title: 'Android (Other browsers)',
        steps: [
          'Open this app in Chrome for the fastest install flow.',
          'Tap the browser menu.',
          'Use Add to Home screen.'
        ]
      };
    }

    if (platform === 'desktop') {
      if (browser === 'chrome' || browser === 'edge') {
        return {
          title: 'Desktop (Chrome or Edge)',
          steps: [
            'Look for the install icon in the address bar.',
            'Click Install Orbit.',
            'Launch from desktop or start menu.'
          ]
        };
      }

      return {
        title: 'Desktop (Other browsers)',
        steps: [
          'Open this app in Chrome or Edge for one-click install.',
          'Use the install icon in the address bar.',
          'Confirm install.'
        ]
      };
    }

    return {
      title: 'Manual install',
      steps: [
        'Open the browser menu.',
        'Find Install app or Add to Home screen.',
        'Confirm install.'
      ]
    };
  };

  const manual = getManualInstructions();
  const platformIcon = platform === 'ios' ? Apple : platform === 'desktop' ? Monitor : Smartphone;
  const browserLabel = browser === 'edge' ? 'Edge' : browser === 'chrome' ? 'Chrome' : browser === 'safari' ? 'Safari' : browser === 'firefox' ? 'Firefox' : 'Browser';
  const PlatformIcon = platformIcon;

  return (
    <Card className="w-full border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Download className="h-5 w-5 text-primary" />
          Smart Install Guide
        </CardTitle>
        <CardDescription>
          Fast path first, then device-specific backup steps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <PlatformIcon className="h-3.5 w-3.5" />
            {platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : platform === 'desktop' ? 'Desktop' : 'Unknown device'}
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <Chrome className="h-3.5 w-3.5" />
            {browserLabel}
          </Badge>
          {isInstalled && <Badge variant="success">Already installed</Badge>}
          {!isInstalled && canInstall && <Badge variant="info">One-tap install ready</Badge>}
          {!isInstalled && !canInstall && <Badge variant="warning">Manual install mode</Badge>}
        </div>

        {!isInstalled && (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="font-medium text-sm mb-3">{manual.title}</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              {manual.steps.map((step, index) => (
                <div key={step} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs text-foreground">
                    {index + 1}
                  </span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isInstalled && (
          <div className="rounded-xl border border-green-500/25 bg-green-500/10 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Orbit is installed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Open Orbit from your home screen or desktop for faster startup and smoother notifications.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border/60 p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isLocalhost
                ? 'On localhost, the one-tap install prompt only appears when Chrome or Edge decides the app is installable. If it does not appear yet, use the manual steps below or reload once after the service worker finishes registering.'
                : 'If you do not see install options, open this app in Chrome or Edge and reload once.'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 p-4">
          <p className="text-sm font-medium mb-2">After install</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
              <p>Enable notifications to get deadline and collaboration alerts.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
              <p>Use Orbit from your home screen for better offline reliability.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default InstallGuide;
