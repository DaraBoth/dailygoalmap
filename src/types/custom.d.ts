
// Custom type definitions to extend default TS types

// Define BeforeInstallPromptEvent interface for PWA install prompts
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Add other custom types here as needed
