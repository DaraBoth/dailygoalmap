import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ModelType = 'gemini' | 'openai' | 'claude';

const ModelSelector = () => {
  const [selectedModel, setSelectedModel] = useState<ModelType>('gemini');
  const [originalModel, setOriginalModel] = useState<ModelType>('gemini');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchModelPreference();
  }, []);

  useEffect(() => {
    setHasChanges(selectedModel !== originalModel);
  }, [selectedModel, originalModel]);

  const fetchModelPreference = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('model_preference')
        .eq('id', session.user.id)
        .single();
      
      if (error) throw error;
      
      const model = (data?.model_preference as ModelType) || 'gemini';
      setSelectedModel(model);
      setOriginalModel(model);
    } catch (error: any) {
      console.error("Error fetching model preference:", error);
      toast({
        title: "Failed to load model preference",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("You must be logged in");
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ model_preference: selectedModel })
        .eq('id', session.user.id);
      
      if (error) throw error;
      
      setOriginalModel(selectedModel);
      
      toast({
        title: "Model preference updated",
        description: `Your preferred AI model is now ${selectedModel === 'gemini' ? 'Google Gemini' : selectedModel === 'openai' ? 'OpenAI GPT' : 'Anthropic Claude'}.`
      });
    } catch (error: any) {
      console.error("Error updating model preference:", error);
      toast({
        title: "Failed to update model preference",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getModelInfo = (model: ModelType) => {
    switch (model) {
      case 'gemini':
        return {
          name: 'Google Gemini 2.5 Flash',
          description: 'Fast and efficient, great for general tasks',
          keyLink: 'https://aistudio.google.com/apikey'
        };
      case 'openai':
        return {
          name: 'OpenAI GPT-4',
          description: 'Powerful reasoning and creative tasks',
          keyLink: 'https://platform.openai.com/api-keys'
        };
      case 'claude':
        return {
          name: 'Anthropic Claude',
          description: 'Thoughtful and detailed responses',
          keyLink: 'https://console.anthropic.com/settings/keys'
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const modelInfo = getModelInfo(selectedModel);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="model-select" className="text-base font-medium">
            Preferred AI Model
          </Label>
          <Select value={selectedModel} onValueChange={(value) => setSelectedModel(value as ModelType)}>
            <SelectTrigger id="model-select" className="w-full">
              <SelectValue placeholder="Select AI Model" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="gemini">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Google Gemini 2.5 Flash</span>
                  <span className="text-xs text-gray-500">Fast and efficient</span>
                </div>
              </SelectItem>
              <SelectItem value="openai">
                <div className="flex flex-col items-start">
                  <span className="font-medium">OpenAI GPT-4</span>
                  <span className="text-xs text-gray-500">Powerful reasoning</span>
                </div>
              </SelectItem>
              <SelectItem value="claude">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Anthropic Claude</span>
                  <span className="text-xs text-gray-500">Thoughtful responses</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{modelInfo.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <CardDescription className="text-sm">
              {modelInfo.description}
            </CardDescription>
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">API Key Required: </span>
              <a 
                href={modelInfo.keyLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Get your {selectedModel === 'gemini' ? 'Gemini' : selectedModel === 'openai' ? 'OpenAI' : 'Claude'} API key →
              </a>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              💡 Make sure to add your {selectedModel === 'gemini' ? 'Gemini' : selectedModel === 'openai' ? 'OpenAI' : 'Claude'} API key in the API Keys tab before using this model.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
};

export default ModelSelector;
