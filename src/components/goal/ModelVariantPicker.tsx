import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

interface ModelVariant {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'claude';
  description: string;
}

const MODEL_VARIANTS: ModelVariant[] = [
  // Gemini Models - Official from ai.google.dev
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash 🆓',
    provider: 'gemini',
    description: '✨ FREE - Best price-performance, fast & intelligent'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash 🆓',
    provider: 'gemini',
    description: '✨ FREE - 2nd gen workhorse, 1M context'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash 🆓',
    provider: 'gemini',
    description: '✨ FREE - Fast and efficient, 1M context'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    description: 'Advanced thinking model, 2M context'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    description: 'Most capable model with 2M context'
  },
  {
    id: 'gemini-1.0-pro',
    name: 'Gemini 1.0 Pro 🆓',
    provider: 'gemini',
    description: '✨ FREE - Stable model, 32K context'
  },
  
  // OpenAI Models
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini 🆓',
    provider: 'openai',
    description: '✨ FREE - Fast and affordable, 128K context'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo 🆓',
    provider: 'openai',
    description: '✨ FREE - Fast and efficient, 16K context'
  },
  {
    id: 'gpt-4-turbo-preview',
    name: 'GPT-4 Turbo 💰',
    provider: 'openai',
    description: 'PAID - Most capable, 128K context'
  },
  {
    id: 'gpt-4',
    name: 'GPT-4 💰',
    provider: 'openai',
    description: 'PAID - Powerful reasoning, 8K context'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o 💰',
    provider: 'openai',
    description: 'PAID - Multimodal flagship, 128K context'
  },
  
  // Claude Models
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku 🆓',
    provider: 'claude',
    description: '✨ FREE - Fast and compact, 200K context'
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet 💰',
    provider: 'claude',
    description: 'PAID - Most intelligent, 200K context'
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus 💰',
    provider: 'claude',
    description: 'PAID - Powerful performance, 200K context'
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet 💰',
    provider: 'claude',
    description: 'PAID - Balanced model, 200K context'
  }
];

interface ModelVariantPickerProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export function ModelVariantPicker({ selectedModel, onModelChange }: ModelVariantPickerProps) {
  const [open, setOpen] = useState(false);

  const selectedVariant = MODEL_VARIANTS.find(m => m.id === selectedModel);
  const providerGroups = {
    gemini: MODEL_VARIANTS.filter(m => m.provider === 'gemini'),
    openai: MODEL_VARIANTS.filter(m => m.provider === 'openai'),
    claude: MODEL_VARIANTS.filter(m => m.provider === 'claude')
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto justify-start text-left font-normal"
        >
          <Bot className="mr-2 h-4 w-4" />
          <span className="truncate">
            {selectedVariant?.name || 'Select Model'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-3" align="start" side="top" sideOffset={8}>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-1">Select AI Model</h4>
            <p className="text-xs text-muted-foreground">
              Choose the model that best fits your needs
            </p>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {/* Gemini Group */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Google Gemini
              </div>
              {providerGroups.gemini.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-md hover:bg-accent transition-colors ${
                    selectedModel === model.id ? 'bg-accent ring-1 ring-primary' : ''
                  }`}
                >
                  <div className="font-medium text-sm">{model.name}</div>
                  <div className="text-xs text-muted-foreground">{model.description}</div>
                </button>
              ))}
            </div>

            {/* OpenAI Group */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                OpenAI
              </div>
              {providerGroups.openai.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-md hover:bg-accent transition-colors ${
                    selectedModel === model.id ? 'bg-accent ring-1 ring-primary' : ''
                  }`}
                >
                  <div className="font-medium text-sm">{model.name}</div>
                  <div className="text-xs text-muted-foreground">{model.description}</div>
                </button>
              ))}
            </div>

            {/* Claude Group */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Anthropic Claude
              </div>
              {providerGroups.claude.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-md hover:bg-accent transition-colors ${
                    selectedModel === model.id ? 'bg-accent ring-1 ring-primary' : ''
                  }`}
                >
                  <div className="font-medium text-sm">{model.name}</div>
                  <div className="text-xs text-muted-foreground">{model.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
