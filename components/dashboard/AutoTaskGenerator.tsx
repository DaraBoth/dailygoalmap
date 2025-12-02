
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Sparkles, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ApiKeyGuide from "./ApiKeyGuide";

// Define a key rotation pool with fallback keys
const FALLBACK_API_KEYS = [
  "AIzaSyBKFsXn9J02iATYPlmDjWN0EmNmTHbVhL0", 
  "AIzaSyD2SN814JxX4hDIpJfQjgSYTezEn-X3I2k",
  "AIzaSyAXYwIl0YNRZhBDedpwyLLZCPp-6nA2XPk",
  "AIzaSyB__UbCBSa_DVE6crSAeNuM6fHg3-NlhiI"
];

const MAX_RETRY_ATTEMPTS = 3;

const AutoTaskGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const [attemptedKeys, setAttemptedKeys] = useState<Set<number>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Array<{id: string, key_name: string}>>([]);
  const [showApiKeyGuide, setShowApiKeyGuide] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        setApiKeys([]);
        setIsLoadingKeys(false);
        return;
      }
      
      const { data } = await supabase
        .from('api_keys')
        .select('id, key_name')
        .eq('key_type', 'gemini')
        .order('is_default', { ascending: false });
      
      setApiKeys(data || []);
      
      // If no keys are found, show the API key guide
      if (!data || data.length === 0) {
        setShowApiKeyGuide(true);
      }
    } catch (error) {
      console.error("Error loading API keys:", error);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const rotateApiKey = () => {
    // Mark the current key as attempted
    setAttemptedKeys(prev => {
      const updated = new Set(prev);
      updated.add(currentKeyIndex);
      return updated;
    });
    
    // Reset if we've tried all keys
    if (attemptedKeys.size >= FALLBACK_API_KEYS.length - 1) {
      setAttemptedKeys(new Set());
    }
    
    // Move to the next key
    setCurrentKeyIndex(prevIndex => (prevIndex + 1) % FALLBACK_API_KEYS.length);
    
    return FALLBACK_API_KEYS[(currentKeyIndex + 1) % FALLBACK_API_KEYS.length];
  };
  
  const hasMoreKeysToTry = (): boolean => {
    return attemptedKeys.size < FALLBACK_API_KEYS.length - 1;
  };
  
  const resetAttemptedKeys = () => {
    setAttemptedKeys(new Set());
  };

  const generateDailyTasks = async () => {
    let retryCount = 0;
    resetAttemptedKeys();
    
    try {
      setIsGenerating(true);
      setErrorMessage(null);
      
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to generate tasks",
          variant: "destructive",
        });
        return;
      }
      
      while (retryCount < MAX_RETRY_ATTEMPTS) {
        try {
          let apiKey = FALLBACK_API_KEYS[currentKeyIndex];
          
          // If we have user's API keys, try to use those first
          if (apiKeys.length > 0) {
            const { data: keyData } = await supabase
              .from('api_keys')
              .select('key_value')
              .eq('id', apiKeys[0].id)
              .single();
              
            if (keyData && keyData.key_value) {
              apiKey = keyData.key_value;
            }
          }
          
          // Call the edge function to generate daily tasks
          const { data, error } = await supabase.functions.invoke('generate-daily-tasks', {
            body: { 
              forceGenerate: false,
              apiKey: apiKey
            },
          });
          
          if (error) {
            console.error("Error generating daily tasks:", error);
            
            // If it looks like a rate limit error, rotate the API key and retry
            if (error.message?.includes("429") || 
                error.message?.includes("quota") || 
                error.message?.toLowerCase().includes("rate limit")) {
              
              if (hasMoreKeysToTry() && retryCount < MAX_RETRY_ATTEMPTS - 1) {
                console.log("Rate limit encountered, switching API key...");
                rotateApiKey();
                retryCount++;
                continue; // Skip to the next iteration without showing an error
              }
            }
            
            throw error;
          }
          
          // If we get here, the request was successful
          toast({
            title: "Daily Tasks Generated",
            description: data.message || "New tasks have been created for your goals",
          });
          
          // Success! Break out of the retry loop
          break;
        } catch (error) {
          // If we have more keys to try and it's a rate limit error, try again
          if (hasMoreKeysToTry() && retryCount < MAX_RETRY_ATTEMPTS - 1 && 
              (error.message?.includes("429") || error.message?.includes("quota"))) {
            rotateApiKey();
            retryCount++;
            continue;
          }
          
          // If we've exhausted our retries or it's not a rate limit error, show the error
          throw error;
        }
      }
    } catch (error) {
      console.error("Error generating daily tasks:", error);
      setErrorMessage("Failed to generate daily tasks. Please try again.");
      toast({
        title: "Error",
        description: "Failed to generate daily tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoadingKeys) {
    return (
      <div className="bg-card dark:bg-card rounded-xl shadow overflow-hidden mb-6 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-muted rounded w-5/6 mb-6"></div>
          <div className="h-10 bg-muted rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (showApiKeyGuide) {
    return (
      <div className="bg-card dark:bg-card rounded-xl shadow overflow-hidden mb-6">
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Daily Task Generator
          </h2>
          
          <ApiKeyGuide onKeyAdded={() => {
            setShowApiKeyGuide(false);
            loadApiKeys();
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card dark:bg-card rounded-xl shadow overflow-hidden mb-6">
      <div className="relative p-6">
        <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full" />
        
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Daily Task Generator
        </h2>
        
        <p className="text-muted-foreground mb-4">
          Generate AI-powered daily tasks for all your active goals with one click.
        </p>
        
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}
        
        <Button
          onClick={generateDailyTasks}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {isGenerating ? "Generating Tasks..." : "Generate Today's Tasks"}
        </Button>
      </div>
    </div>
  );
};

export default AutoTaskGenerator;
