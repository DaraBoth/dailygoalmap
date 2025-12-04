import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Star, Trash2, Edit, Clipboard } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

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
    case "gemini":
      return "https://aistudio.google.com/app/apikey";
    case "openai":
      return "https://platform.openai.com/account/api-keys";
    case "anthropic":
      return "https://console.anthropic.com/";
    default:
      return null;
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
  const { toast } = useToast();

  useEffect(() => {
    fetchApiKeys();
  }, []);

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
      toast({
        title: "Failed to load API keys",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKey = async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a name and value for your API key.",
        variant: "destructive"
      });
      return;
    }

    setIsAddingKey(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("You must be logged in to add an API key");
      }
      
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
      setNewKeyName("");
      setNewKeyValue("");
      setIsOpen(false);
      
      toast({
        title: "API key added",
        description: `Your ${newKeyType} API key "${newKeyName}" has been added.`
      });
    } catch (error: any) {
      console.error("Error adding API key:", error);
      toast({
        title: "Failed to add API key",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsAddingKey(false);
    }
  };

  const handleUpdateKey = async () => {
    if (!editingKey) return;
    
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a name and value for your API key.",
        variant: "destructive"
      });
      return;
    }
    
    setIsAddingKey(true);
    
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({
          key_name: newKeyName.trim(),
          key_value: newKeyValue.trim()
          // updated_at is auto-updated by database trigger
        })
        .eq('id', editingKey.id);
      
      if (error) {
        console.error("Database error:", error);
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }
      
      setApiKeys(prev => prev.map(key => 
        key.id === editingKey.id 
          ? { ...key, key_name: newKeyName.trim(), key_value: newKeyValue.trim() } 
          : key
      ));
      
      setNewKeyName("");
      setNewKeyValue("");
      setEditingKey(null);
      setIsOpen(false);
      
      toast({
        title: "API key updated",
        description: `Your API key "${newKeyName}" has been updated.`
      });
    } catch (error: any) {
      console.error("Error updating API key:", error);
      let errorDescription = error.message;
      
      // Provide more specific error messages
      if (error.message?.includes('violates row-level security')) {
        errorDescription = "You don't have permission to update this API key.";
      } else if (error.message?.includes('duplicate key')) {
        errorDescription = "An API key with this name already exists.";
      } else if (error.code === '23505') {
        errorDescription = "A key with this name already exists for this API type.";
      }
      
      toast({
        title: "Failed to update API key",
        description: errorDescription,
        variant: "destructive"
      });
    } finally {
      setIsAddingKey(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;
    
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setApiKeys(prev => prev.filter(key => key.id !== id));
      
      toast({
        title: "API key deleted",
        description: "Your API key has been deleted."
      });
    } catch (error: any) {
      console.error("Error deleting API key:", error);
      toast({
        title: "Failed to delete API key",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await supabase
        .from('api_keys')
        .update({ is_default: false })
        .neq('id', 'placeholder');
      
      const { error } = await supabase
        .from('api_keys')
        .update({ is_default: true })
        .eq('id', id);
      
      if (error) throw error;
      
      setApiKeys(prev => prev.map(key => ({
        ...key,
        is_default: key.id === id
      })));
      
      toast({
        title: "Default key updated",
        description: "Your default API key has been updated."
      });
    } catch (error: any) {
      console.error("Error setting default API key:", error);
      toast({
        title: "Failed to set default key",
        description: error.message,
        variant: "destructive"
      });
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
      title: "Copied to Clipboard",
      description: "API key has been copied to your clipboard.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="lg:flex-row justify-between sm:flex-col sm:gap-2 items-center mb-4">
        <h3 className="text-lg font-medium">Your API Keys</h3>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingKey(null);
              setNewKeyName("");
              setNewKeyValue("");
              setNewKeyType("gemini");
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add New API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingKey ? "Edit API Key" : "Add New API Key"}
              </DialogTitle>
              <DialogDescription>
                {editingKey 
                  ? "Update your API key details." 
                  : "Add a new API key for AI services."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="My API Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="key-type">Key Type</Label>
                <Select 
                  value={newKeyType}
                  onValueChange={setNewKeyType}
                  disabled={!!editingKey}
                >
                  <SelectTrigger id="key-type">
                    <SelectValue placeholder="Select API Key Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="key-value">API Key Value, </Label>
                {getApiKeyLink(newKeyType) && (
                  <a 
                    href={getApiKeyLink(newKeyType)!} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-500 hover:underline text-sm"
                  >
                    Get your {newKeyType.charAt(0).toUpperCase() + newKeyType.slice(1)} API key →
                  </a>
                )}
                <Input
                  id="key-value"
                  type="password"
                  placeholder="Enter your API key"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Your API key is stored securely and never shared with third parties.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button 
                onClick={editingKey ? handleUpdateKey : handleAddKey}
                disabled={isAddingKey}
              >
                {isAddingKey ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingKey ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  editingKey ? "Update Key" : "Add Key"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {apiKeys.length === 0 ? (
        <div className="text-center p-8 border border-dashed rounded-lg">
          <p className="text-gray-500 mb-2">You haven't added any API keys yet.</p>
          <p className="text-sm text-gray-400">
            Add API keys to use with AI services like Google Gemini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <Card key={key.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 
                      className="font-medium truncate" 
                      title={key.key_name.length > 20 ? key.key_name : undefined}
                    >
                      {key.key_name.length > 20 ? `${key.key_name.substring(0, 20)}...` : key.key_name}
                    </h4>
                    {key.is_default && (
                      <span className="ml-2 inline-flex items-center text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                        <Star className="h-3 w-3 mr-1 fill-amber-500" />
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <p 
                      className="text-xs font-mono bg-gray-100 dark:bg-blue-900 p-2 rounded truncate max-w-[150px]" 
                      title={key.key_value}
                    >
                      {key.key_value.substring(0, 6)}•••••••••
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleCopyToClipboard(key.key_value)}
                      className="p-1"
                    >
                      <Clipboard className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(key)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  {!key.is_default && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSetDefault(key.id)}
                    >
                      <Star className="h-3.5 w-3.5 mr-1" />
                      Set as Default
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-500 border-red-200 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteKey(key.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApiKeyManager;
