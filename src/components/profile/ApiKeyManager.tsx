import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Star,
  Trash2,
  Edit,
  Clipboard,
  ExternalLink,
  Key,
  ShieldCheck,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ApiKey {
  id: string;
  key_name: string;
  key_type: string;
  key_value: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

type KeyType = "gemini" | "openai" | "anthropic" | "serpapi" | "firecrawl" | "openweathermap";

const KEY_OPTIONS: Array<{ value: KeyType; label: string }> = [
  { value: "gemini", label: "Google Gemini" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Claude (Anthropic)" },
  { value: "serpapi", label: "SerpAPI" },
  { value: "firecrawl", label: "Firecrawl" },
  { value: "openweathermap", label: "OpenWeather" },
];

const getApiKeyLink = (keyType: string): string | null => {
  switch (keyType) {
    case "gemini":
      return "https://aistudio.google.com/app/apikey";
    case "openai":
      return "https://platform.openai.com/account/api-keys";
    case "anthropic":
      return "https://console.anthropic.com/";
    case "serpapi":
      return "https://serpapi.com/manage-api-key";
    case "firecrawl":
      return "https://www.firecrawl.dev/app/api-keys";
    case "openweathermap":
      return "https://home.openweathermap.org/api_keys";
    default:
      return null;
  }
};

const mask = (value: string) => {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`;
};

const ApiKeyManager = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);

  const [keyName, setKeyName] = useState("");
  const [keyType, setKeyType] = useState<KeyType>("gemini");
  const [keyValue, setKeyValue] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const hasChanges = useMemo(() => {
    if (editingKey) {
      return keyName.trim() !== editingKey.key_name || keyValue.trim() !== editingKey.key_value;
    }
    return keyName.trim().length > 0 && keyValue.trim().length > 0;
  }, [editingKey, keyName, keyValue]);

  const fetchApiKeys = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setApiKeys((data as ApiKey[]) || []);
    } catch (error: any) {
      toast({
        title: "Could not load API keys",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openAddSheet = () => {
    setEditingKey(null);
    setKeyName("");
    setKeyType("gemini");
    setKeyValue("");
    setSheetOpen(true);
  };

  const openEditSheet = (key: ApiKey) => {
    setEditingKey(key);
    setKeyName(key.key_name);
    setKeyType((key.key_type as KeyType) || "gemini");
    setKeyValue(key.key_value);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingKey(null);
    setKeyName("");
    setKeyType("gemini");
    setKeyValue("");
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      if (editingKey) {
        const { error } = await supabase
          .from("api_keys")
          .update({ key_name: keyName.trim(), key_value: keyValue.trim() })
          .eq("id", editingKey.id);
        if (error) throw error;

        setApiKeys((prev) =>
          prev.map((k) =>
            k.id === editingKey.id
              ? { ...k, key_name: keyName.trim(), key_value: keyValue.trim() }
              : k,
          ),
        );

        toast({ title: "API key updated", description: "Your key was saved." });
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Please sign in again.");

        const isFirstKey = apiKeys.length === 0;
        const { data, error } = await supabase
          .from("api_keys")
          .insert({
            key_name: keyName.trim(),
            key_type: keyType,
            key_value: keyValue.trim(),
            is_default: isFirstKey,
            user_id: session.user.id,
          })
          .select()
          .single();

        if (error) throw error;
        setApiKeys((prev) => [data as ApiKey, ...prev]);

        toast({ title: "API key added", description: "Your key is ready to use." });
      }

      closeSheet();
    } catch (error: any) {
      toast({
        title: "Could not save key",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Delete this API key?")) return;

    try {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      toast({ title: "API key deleted", description: "The key has been removed." });
    } catch (error: any) {
      toast({
        title: "Could not delete key",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await supabase.from("api_keys").update({ is_default: false }).neq("id", "placeholder");
      const { error } = await supabase.from("api_keys").update({ is_default: true }).eq("id", id);
      if (error) throw error;
      setApiKeys((prev) => prev.map((k) => ({ ...k, is_default: k.id === id })));
      toast({ title: "Default key updated", description: "This key is now your default." });
    } catch (error: any) {
      toast({
        title: "Could not change default key",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: "Copied", description: "API key copied to clipboard." });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading API keys...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">API Keys</h3>
          <p className="text-sm text-muted-foreground">Add and manage keys for OpenAI, Gemini, Claude, and more.</p>
        </div>
        <Button onClick={openAddSheet} className="h-10 rounded-xl">
          <Plus className="h-4 w-4 mr-2" /> Add API Key
        </Button>
      </div>

      {apiKeys.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-background/60 p-8 text-center">
          <Key className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No API keys yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first key to unlock AI features.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <motion.div
              key={key.id}
              layout
              className="rounded-2xl border border-border/60 bg-background/70 p-4 flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{key.key_name}</p>
                  {key.is_default && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">Default</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {KEY_OPTIONS.find((k) => k.value === key.key_type)?.label || key.key_type} • {mask(key.key_value)}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(key.key_value)} title="Copy key">
                  <Clipboard className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditSheet(key)} title="Edit key">
                  <Edit className="h-4 w-4" />
                </Button>
                {!key.is_default && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSetDefault(key.id)} title="Set as default">
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteKey(key.id)} title="Delete key">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-slate-100/95 dark:bg-slate-950/95 border-border/60 p-0">
          <div className="h-full flex flex-col">
            <SheetHeader className="px-6 py-5 border-b border-border/60 bg-slate-100/90 dark:bg-slate-900/85">
              <SheetTitle>{editingKey ? "Edit API Key" : "Add API Key"}</SheetTitle>
              <SheetDescription>
                {editingKey ? "Update your key details." : "Add a new key for your AI provider."}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  placeholder="My Claude Key"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="bg-background/80"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="key-type">Provider</Label>
                <Select value={keyType} onValueChange={(v) => setKeyType(v as KeyType)} disabled={!!editingKey}>
                  <SelectTrigger id="key-type" className="bg-background/80">
                    <SelectValue placeholder="Choose provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {KEY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="key-value">API Key</Label>
                  {getApiKeyLink(keyType) && (
                    <a
                      href={getApiKeyLink(keyType)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      Get key <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <Input
                  id="key-value"
                  type="password"
                  placeholder="Paste your key"
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  className="bg-background/80"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border/60 bg-slate-100/90 dark:bg-slate-900/85 flex items-center gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={closeSheet}>
                Cancel
              </Button>
              <Button
                type="button"
                className={cn("flex-[2]", !hasChanges && "opacity-60")}
                disabled={isSaving || !hasChanges}
                onClick={handleSave}
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editingKey ? "Save changes" : "Add key"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ApiKeyManager;
