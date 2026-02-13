import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Zap, Brain, Shield, Info, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type ModelType = 'gemini' | 'openai' | 'claude';

interface ModelInfo {
  id: ModelType;
  name: string;
  provider: string;
  description: string;
  capability: string;
  color: string;
  glowColor: string;
  keyLink: string;
  icon: any;
}

const MODELS: ModelInfo[] = [
  {
    id: 'gemini',
    name: 'Gemini 2.5 Flash',
    provider: 'Google AI',
    description: 'Optimized for high-velocity inference and multimodal contexts.',
    capability: 'Hyper-efficient Processing',
    color: 'text-blue-400',
    glowColor: 'bg-blue-500',
    keyLink: 'https://aistudio.google.com/apikey',
    icon: Zap
  },
  {
    id: 'openai',
    name: 'GPT-4 Omni',
    provider: 'OpenAI',
    description: 'Advanced reasoning engine suited for complex logic and creativity.',
    capability: 'Advanced Reasoning',
    color: 'text-emerald-400',
    glowColor: 'bg-emerald-500',
    keyLink: 'https://platform.openai.com/api-keys',
    icon: Brain
  },
  {
    id: 'claude',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Highly nuanced output with exceptional safety and detail.',
    capability: 'Nuanced Intelligence',
    color: 'text-orange-400',
    glowColor: 'bg-orange-500',
    keyLink: 'https://console.anthropic.com/settings/keys',
    icon: Shield
  }
];

const ModelSelector = () => {
  const [selectedModel, setSelectedModel] = useState<ModelType>('gemini');
  const [originalModel, setOriginalModel] = useState<ModelType>('gemini');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchModelPreference(); }, []);
  useEffect(() => { setHasChanges(selectedModel !== originalModel); }, [selectedModel, originalModel]);

  const fetchModelPreference = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.from('user_profiles').select('model_preference').eq('id', session.user.id).single();
      if (error) throw error;
      const model = (data?.model_preference as ModelType) || 'gemini';
      setSelectedModel(model);
      setOriginalModel(model);
    } catch (error: any) {
      toast({ title: "Configuration Load Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Terminal session expired");
      const { error } = await supabase.from('user_profiles').update({ model_preference: selectedModel }).eq('id', session.user.id);
      if (error) throw error;
      setOriginalModel(selectedModel);
      toast({ title: "Core Reconfigured", description: `Intelligence target switched to ${selectedModel.toUpperCase()}.` });
    } catch (error: any) {
      toast({ title: "Reconfiguration Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Scanning Model Matrix...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MODELS.map((model) => {
          const Icon = model.icon;
          const isSelected = selectedModel === model.id;
          return (
            <button
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={cn(
                "relative text-left p-6 rounded-[2rem] border transition-all duration-500 group overflow-hidden active:scale-95",
                isSelected
                  ? "bg-white/[0.08] border-blue-500/30 shadow-[0_20px_40px_-15px_rgba(59,130,246,0.15)] -translate-y-1"
                  : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:-translate-y-0.5"
              )}
            >
              {/* Refined Highlight background */}
              {isSelected && (
                <motion.div
                  layoutId="modelHighlight"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent pointer-events-none"
                />
              )}

              <div className="relative z-10">
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500",
                  isSelected
                    ? "bg-white/10 shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-blue-500/20"
                    : "bg-white/5 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100"
                )}>
                  <Icon className={cn("h-6 w-6", isSelected ? model.color : "text-gray-400")} />
                </div>

                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">{model.provider}</p>
                <h3 className="text-lg font-black text-white tracking-tight">{model.name}</h3>
              </div>

              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute bottom-4 lg:bottom-6 right-4 lg:right-6"
                >
                  <div className={cn(
                    "h-1.5 w-1.5 lg:h-2 lg:w-2 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse transition-all duration-1000",
                    model.glowColor
                  )}></div>
                </motion.div>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedModel}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-white/[0.03] border border-white/5 rounded-3xl lg:rounded-[2.5rem] p-5 lg:p-8 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-white/10 transition-colors hidden lg:block">
            <Sparkles className="h-32 w-32 translate-x-12 -translate-y-12" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Core Intelligence Parameters</h4>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tighter mb-4">Technical Specification</h3>
                <div className="relative">
                  <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500/20 via-transparent to-transparent hidden md:block"></div>
                  <p className="text-gray-400 font-medium leading-relaxed max-w-xl text-base">
                    {MODELS.find(m => m.id === selectedModel)?.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{MODELS.find(m => m.id === selectedModel)?.capability}</span>
                </div>
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
                  <Info className="h-3 w-3 text-gray-500" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Linkage Required</span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-64 bg-white/[0.03] border border-white/10 rounded-3xl p-6">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Credential Check</p>
              <div className="space-y-4">
                <a
                  href={MODELS.find(m => m.id === selectedModel)?.keyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between group/link"
                >
                  <span className="text-xs font-bold text-blue-400 group-hover/link:underline">Acquire Provider Key</span>
                  <ExternalLink className="h-3 w-3 text-blue-400 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                </a>
                <div className="h-px bg-white/5"></div>
                <p className="text-[10px] text-gray-600 leading-normal">
                  Ensure the corresponding key is present in your <span className="text-gray-400 font-bold">Secure Vault</span> to maintain operational continuity.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-end pt-6 lg:pt-8 border-t border-white/5">
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className={cn(
            "h-12 lg:h-14 px-10 lg:px-12 rounded-2xl font-black uppercase tracking-widest text-[9px] lg:text-[10px] transition-all relative overflow-hidden group shadow-2xl",
            hasChanges && !isSaving
              ? "bg-blue-600 text-white shadow-blue-500/20 hover:shadow-blue-500/40"
              : "bg-white/5 text-gray-600 cursor-not-allowed border border-white/5"
          )}
        >
          {/* Refraction Shine Effect */}
          <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-[35deg] translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>

          <div className="relative z-10 flex items-center gap-2">
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 animate-spin text-blue-200" />
                <span>Syncing...</span>
              </>
            ) : (
              <span>Initiate Core Switch</span>
            )}
          </div>
        </Button>
      </div>
    </div>
  );
};

export default ModelSelector;

