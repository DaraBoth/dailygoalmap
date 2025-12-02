
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export interface ApiKeyGuideProps {
  onKeyAdded: () => void;
}

const ApiKeyGuide: React.FC<ApiKeyGuideProps> = ({ onKeyAdded }) => {
  const [apiKey, setApiKey] = useState("");
  const [keyName, setKeyName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const saveApiKey = async () => {
    if (!apiKey.trim() || !keyName.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both an API key and a name for it.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase.from("api_keys").insert([
        {
          user_id: userData.user.id,
          key_name: keyName,
          key_value: apiKey,
          key_type: "gemini",
          is_default: false,
        },
      ]);

      if (error) throw error;

      toast({
        title: "API Key saved",
        description: "Your API key has been securely stored.",
      });

      setApiKey("");
      setKeyName("");
      onKeyAdded();
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        title: "Error saving API key",
        description: "An error occurred while saving your API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">Get a Gemini API Key</h3>
        <p className="text-sm text-muted-foreground mb-4">
          To use AI features like automatic task generation, you'll need a
          Google Gemini API key.
        </p>

        <ol className="list-decimal pl-5 space-y-2 mb-4">
          <li>
            Go to{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 hover:underline"
            >
              Google AI Studio
            </a>
          </li>
          <li>Create a free account if you don't have one already</li>
          <li>
            Get your API key (you get $10 free credit, which is more than enough
            for personal use)
          </li>
          <li>Paste your API key below to store it securely</li>
        </ol>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-sm font-medium">Key Name</label>
          <Input
            type="text"
            placeholder="e.g., My Gemini Key"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">API Key</label>
          <Input
            type="password"
            placeholder="Paste your Gemini API key here"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
      </div>

      <div className="pt-2">
        <Button
          onClick={saveApiKey}
          disabled={isSaving || !apiKey.trim() || !keyName.trim()}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save API Key"
          )}
        </Button>
      </div>
    </div>
  );
};

export default ApiKeyGuide;
