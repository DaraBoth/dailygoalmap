import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Star, Trash2, Edit, Clipboard, Link as LinkIcon, ExternalLink, ShieldCheck, Key } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const getApiKeyLink = (keyType: string): string | null => {
  switch (keyType) {
    case "gemini": return "https://aistudio.google.com/app/apikey";
    case "openai": return "https://platform.openai.com/account/api-keys";
    case "anthropic": return "https://console.anthropic.com/";
    case "serpapi": return "https://serpapi.com/manage-api-key";
    case "firecrawl": return "https://www.firecrawl.dev/app/api-keys";
    case "openweathermap": return "https://home.openweathermap.org/api_keys";
    default: return null;
  }
};

const ApiKeyManager = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyType, setNewKeyType] = useState("gemini");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchApiKeys();
  }, []);

  useEffect(() => {
    if (editingKey) {
      const nameChanged = newKeyName.trim() !== editingKey.key_name;
      const valueChanged = newKeyValue.trim() !== editingKey.key_value;
      setHasChanges(nameChanged || valueChanged);
    } else {
      setHasChanges(newKeyName.trim().length > 0 && newKeyValue.trim().length > 0);
    }
  }, [newKeyName, newKeyValue, editingKey]);

  const fetchApiKeys = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setApiKeys(data || []);
    } catch (error: any) {
      console.error("Error fetching API keys:", error);
      toast({ title: "Failed to load API keys", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKey = async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) return;
    setIsAddingKey(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication required");

      const isFirstKey = apiKeys.length === 0;
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          key_name: newKeyName.trim(),
          key_type: newKeyType,
          key_value: newKeyValue.trim(),
          is_default: isFirstKey,
          user_id: session.user.id
        })
        .select()
        .single();

      if (error) throw error;
      setApiKeys(prev => [data, ...prev]);
      handleDialogClose();
      toast({ title: "Key Integrated", description: `"${newKeyName}" is now active in the system.` });
    } catch (error: any) {
      toast({ title: "Integration Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsAddingKey(false);
    }
  };

  const handleUpdateKey = async () => {
    if (!editingKey || !newKeyName.trim() || !newKeyValue.trim()) return;
    setIsAddingKey(true);
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ key_name: newKeyName.trim(), key_value: newKeyValue.trim() })
        .eq('id', editingKey.id);

      if (error) throw error;
      setApiKeys(prev => prev.map(key =>
        key.id === editingKey.id
          ? { ...key, key_name: newKeyName.trim(), key_value: newKeyValue.trim() }
          : key
      ));
      handleDialogClose();
      toast({ title: "Key Refined", description: "The API credentials have been updated." });
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsAddingKey(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to decouple this API key from the system?")) return;
    try {
      const { error } = await supabase.from('api_keys').delete().eq('id', id);
      if (error) throw error;
      setApiKeys(prev => prev.filter(key => key.id !== id));
      toast({ title: "Key Decoupled", description: "The API key has been removed from your profile." });
    } catch (error: any) {
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await supabase.from('api_keys').update({ is_default: false }).neq('id', 'placeholder');
      const { error } = await supabase.from('api_keys').update({ is_default: true }).eq('id', id);
      if (error) throw error;
      setApiKeys(prev => prev.map(key => ({ ...key, is_default: key.id === id })));
      toast({ title: "Primary Key Updated", description: "Default system credentials have been switched." });
    } catch (error: any) {
      toast({ title: "Switch Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (key: ApiKey) => {
    setEditingKey(key);
    setNewKeyName(key.key_name);
    setNewKeyType(key.key_type);
    setNewKeyValue(key.key_value);
    setIsOpen(true);
  };

  const handleDialogClose = () => {
    setIsOpen(false);
    setEditingKey(null);
    setNewKeyName("");
    setNewKeyValue("");
    setNewKeyType("gemini");
  };

  const handleCopyToClipboard = (keyValue: string) => {
    navigator.clipboard.writeText(keyValue);
    toast({
      title: "Data Cached",
      description: (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Credential Copied to Clipboard</span>
        </div>
      )
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Retrieving Secure Vault...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Secure Integration Vault</p>
          <p className="text-xs text-gray-500 font-medium tracking-tight">Manage persistent credentials for system externalities</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl h-12 px-6 bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/20 transition-all active:scale-95 group">
              <Plus className="h-4 w-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
              Initialize New Key
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] max-w-lg p-0 overflow-hidden">
            <div className="p-8 border-b border-white/5 bg-gradient-to-br from-blue-500/5 to-transparent">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <LinkIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <DialogTitle className="text-2xl font-black text-white tracking-tighter">
                    {editingKey ? "Key Refinement" : "Credential Initialization"}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-gray-400 font-medium">
                  {editingKey ? "Adjust existing integration parameters" : "Link a new external service to your profile environment."}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="key-name" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Key Label</Label>
                <Input
                  id="key-name"
                  placeholder="e.g., Primary Intelligence"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="h-12 bg-white/[0.03] border-white/10 focus:border-blue-500/50 rounded-xl text-white font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="key-type" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Service Provider</Label>
                <Select value={newKeyType} onValueChange={setNewKeyType} disabled={!!editingKey}>
                  <SelectTrigger id="key-type" className="h-12 bg-white/[0.03] border-white/10 focus:border-blue-500/50 rounded-xl text-white font-bold">
                    <SelectValue placeholder="Select Service" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-xl">
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="serpapi">SerpAPI (Google Search)</SelectItem>
                    <SelectItem value="firecrawl">Firecrawl (Scraping)</SelectItem>
                    <SelectItem value="openweathermap">OpenWeather (Meteorological)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <Label htmlFor="key-value" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Credential Value</Label>
                  {getApiKeyLink(newKeyType) && (
                    <a href={getApiKeyLink(newKeyType)!} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-blue-400 flex items-center gap-1 hover:underline">
                      Acquire Key <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
                <Input
                  id="key-value"
                  type="password"
                  placeholder="••••••••••••••••"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  className="h-12 bg-white/[0.03] border-white/10 focus:border-blue-500/50 rounded-xl text-white font-mono"
                />
                <div className="flex items-start gap-2 pt-2 px-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-500 mt-0.5" />
                  <p className="text-[10px] font-medium text-gray-500">Stored using system-level encryption. Never exposed to public interfaces.</p>
                </div>
              </div>
            </div>

            <div className="p-6 lg:p-8 pt-4 flex items-center gap-3 lg:gap-4 bg-zinc-950/20">
              <Button variant="ghost" onClick={handleDialogClose} className="flex-1 h-11 lg:h-12 rounded-xl text-gray-500 font-bold text-xs lg:text-sm hover:text-gray-300 hover:bg-white/5 transition-all">Cancel</Button>
              <Button
                onClick={editingKey ? handleUpdateKey : handleAddKey}
                disabled={isAddingKey || !hasChanges}
                className={cn(
                  "flex-[2] h-11 lg:h-12 rounded-xl font-black uppercase tracking-widest text-[9px] lg:text-[10px] transition-all relative overflow-hidden group shadow-xl",
                  hasChanges && !isAddingKey
                    ? "bg-blue-600 text-white shadow-blue-500/20 hover:shadow-blue-500/40"
                    : "bg-white/5 text-gray-600 grayscale"
                )}
              >
                <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-[35deg] translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>
                <span className="relative z-10">
                  {isAddingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : editingKey ? "Refine Integration" : "Establish Link"}
                </span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {apiKeys.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex flex-col items-center justify-center p-12 lg:p-20 border border-white/5 rounded-[2.5rem] bg-white/[0.01] overflow-hidden group/empty"
        >
          {/* Animated Background Atmosphere */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover/empty:opacity-100 transition-opacity duration-1000"></div>

          <div className="relative mb-8">
            {/* Multi-layered icon composition */}
            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse scale-150"></div>
            <div className="relative h-20 w-20 rounded-3xl bg-zinc-950 border border-white/10 flex items-center justify-center shadow-2xl group-hover/empty:border-blue-500/30 transition-colors duration-500">
              <LinkIcon className="h-8 w-8 text-gray-700 group-hover/empty:text-blue-400 group-hover/empty:rotate-12 transition-all duration-500" />
              <div className="absolute -top-2 -right-2 h-8 w-8 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-lg group-hover/empty:translate-x-1 group-hover/empty:-translate-y-1 transition-transform duration-500">
                <ShieldCheck className="h-4 w-4 text-emerald-500/50 group-hover/empty:text-emerald-400 transition-colors" />
              </div>
            </div>
          </div>

          <div className="relative text-center space-y-2">
            <h3 className="text-lg lg:text-xl font-black text-white tracking-tight">No Active Integrations</h3>
            <p className="max-w-xs text-xs text-gray-500 font-medium leading-relaxed">
              The secure credential vault is currently dormant. Initialize a link to sync with external intelligence providers.
            </p>
          </div>

          {/* Decorative scanline */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent translate-y-[-100%] group-hover/empty:animate-scanline"></div>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {apiKeys.map((key) => (
              <motion.div
                key={key.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="group relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-blue-500/20 rounded-2xl lg:rounded-3xl transition-all duration-500 p-4 lg:p-6 flex items-center gap-4 lg:gap-6"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
                  e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
                }}
              >
                {/* Radial Mouse Highlight */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(400px_circle_at_var(--mouse-x)_var(--mouse-y),rgba(59,130,246,0.08),transparent)]"></div>

                <div className="relative z-10 h-12 w-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-gray-400 group-hover/item:text-blue-400 group-hover/item:border-blue-500/20 transition-all">
                  <Key className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-black text-white tracking-tight truncate text-lg">{key.key_name}</h4>
                    {key.is_default && (
                      <span className="bg-blue-500/10 text-blue-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                        Primary Target
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{key.key_type}</span>
                    <span className="h-0.5 w-0.5 rounded-full bg-white/10"></span>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-950/40 border border-white/5">
                      <ShieldCheck className="h-2.5 w-2.5 text-blue-500/50" />
                      <span className="text-[10px] font-mono text-blue-400/40 tracking-tighter">
                        {key.key_value.substring(0, 4)}
                        <span className="opacity-30 tracking-[-0.3em] font-sans">•••••</span>
                        {key.key_value.substring(key.key_value.length - 4)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 transition-transform duration-300">
                  <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboard(key.key_value)} className="h-10 w-10 p-0 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white" title="Copy Key">
                    <Clipboard className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(key)} className="h-10 w-10 p-0 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white" title="Edit Parameters">
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!key.is_default && (
                    <Button variant="ghost" size="sm" onClick={() => handleSetDefault(key.id)} className="h-10 w-10 p-0 rounded-xl hover:bg-white/10 text-gray-400 hover:text-amber-400" title="Set as Primary">
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteKey(key.id)} className="h-10 w-10 p-0 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400" title="Decouple Key">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default ApiKeyManager;

