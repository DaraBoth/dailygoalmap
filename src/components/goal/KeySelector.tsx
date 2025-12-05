import { Check, Key, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ApiKey {
  id: string;
  key_name: string;
  key_type: string;
  is_default: boolean;
}

interface KeySelectorProps {
  selectedModel: string;
  selectedKeyIds: string[];
  onKeySelectionChange: (keyIds: string[]) => void;
}

export function KeySelector({ selectedModel, selectedKeyIds, onKeySelectionChange }: KeySelectorProps) {
  const [open, setOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  // Map model to provider (for display)
  const getProviderFromModel = (model: string): string => {
    if (model.startsWith('gemini')) return 'gemini';
    if (model.startsWith('gpt')) return 'openai';
    if (model.startsWith('claude')) return 'claude';
    return 'gemini'; // default
  };

  // Map model to database key_type (anthropic instead of claude)
  const getKeyTypeFromModel = (model: string): string => {
    if (model.startsWith('gemini')) return 'gemini';
    if (model.startsWith('gpt')) return 'openai';
    if (model.startsWith('claude')) return 'anthropic';
    return 'gemini'; // default
  };

  const provider = getProviderFromModel(selectedModel);
  const keyType = getKeyTypeFromModel(selectedModel);

  useEffect(() => {
    loadApiKeys();
    setShowAddForm(false); // Reset form when provider changes
  }, [keyType]);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('api_keys')
        .select('id, key_name, key_type, is_default')
        .eq('user_id', user.id)
        .eq('key_type', keyType)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading API keys:', error);
        return;
      }

      setApiKeys(data || []);

      // Auto-select default key if none selected
      if ((!selectedKeyIds || selectedKeyIds.length === 0) && data && data.length > 0) {
        const defaultKey = data.find(k => k.is_default) || data[0];
        onKeySelectionChange([defaultKey.id]);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const addApiKey = async () => {
    if (!newKeyLabel.trim() || !newKeyValue.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide both label and API key",
        variant: "destructive"
      });
      return;
    }

    setIsAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive"
        });
        return;
      }

      // Check if this is the first key of this type
      const isFirstKey = apiKeys.length === 0;

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          key_name: newKeyLabel.trim(),
          key_type: keyType,
          key_value: newKeyValue.trim(),
          is_default: isFirstKey
        })
        .select('id, key_name, key_type, is_default')
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "API key added successfully"
      });

      // Reload keys and auto-select the new one
      await loadApiKeys();
      if (data) {
        onKeySelectionChange([data.id]);
      }

      // Reset form
      setNewKeyLabel("");
      setNewKeyValue("");
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding API key:', error);
      toast({
        title: "Error",
        description: "Failed to add API key",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const toggleKeySelection = (keyId: string) => {
    if (selectedKeyIds.includes(keyId)) {
      onKeySelectionChange(selectedKeyIds.filter(id => id !== keyId));
    } else {
      onKeySelectionChange([...selectedKeyIds, keyId]);
    }
  };

  const selectedLabels = apiKeys
    .filter(k => selectedKeyIds.includes(k.id))
    .map(k => k.key_name)
    .join(', ') || 'Select keys';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto justify-start text-left font-normal"
        >
          <Key className="mr-2 h-4 w-4" />
          <span className="truncate">
            {selectedKeyIds.length > 0 ? (
              <>
                {selectedKeyIds.length} key{selectedKeyIds.length > 1 ? 's' : ''} selected
              </>
            ) : (
              'Select API Keys'
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-3" align="start" side="top" sideOffset={8}>
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-1">API Keys for {provider}</h4>
            <p className="text-xs text-muted-foreground">
              Select multiple keys for automatic fallback
            </p>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground py-2">Loading keys...</div>
          ) : showAddForm ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="key-label" className="text-sm">Key Label</Label>
                <Input
                  id="key-label"
                  placeholder="e.g., My Gemini Key"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  disabled={isAdding}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-value" className="text-sm">API Key</Label>
                <Input
                  id="key-value"
                  type="password"
                  placeholder="Enter your API key"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  disabled={isAdding}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={addApiKey}
                  disabled={isAdding || !newKeyLabel.trim() || !newKeyValue.trim()}
                  className="flex-1"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Key'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewKeyLabel("");
                    setNewKeyValue("");
                  }}
                  disabled={isAdding}
                >
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a
                  href={
                    keyType === 'gemini'
                      ? 'https://aistudio.google.com/app/apikey'
                      : keyType === 'openai'
                      ? 'https://platform.openai.com/account/api-keys'
                      : 'https://console.anthropic.com/'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  here
                </a>
              </p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">No API keys found for {provider}.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add API Key
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-start space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                    onClick={() => toggleKeySelection(key.id)}
                  >
                    <Checkbox
                      checked={selectedKeyIds.includes(key.id)}
                      onCheckedChange={() => toggleKeySelection(key.id)}
                    />
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {key.key_name}
                      </span>
                      {key.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                      <div className="text-xs text-muted-foreground">
                        {key.key_type.toUpperCase()}
                      </div>
                    </div>
                    {selectedKeyIds.includes(key.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another Key
              </Button>
            </>
          )}

          {selectedKeyIds.length > 1 && !showAddForm && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                ✨ Fallback enabled: Will try keys in order if one fails
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
