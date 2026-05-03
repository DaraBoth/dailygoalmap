import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCircle, Camera, Bot, User2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { put } from "@vercel/blob";
import { ImageCropDialog } from "./ImageCropDialog";
import { cn } from "@/lib/utils";


interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  preferences: Record<string, unknown> | null;
}

interface ProfileFormProps {
  onSave?: () => void;
  onCancel?: () => void;
}

const ProfileForm = ({ onSave, onCancel }: ProfileFormProps) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [aboutYou, setAboutYou] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) return;

        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProfile(data);
          setDisplayName(data.display_name || "");
          setBio(data.bio || "");
          setAvatarUrl(data.avatar_url);
          setAboutYou((data.preferences?.about_you as string) || "");
          setAiInstructions((data.preferences?.custom_instructions as string) || "");
        } else {
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              id: session.user.id,
              display_name: session.user.user_metadata.name || "",
            });

          if (insertError) throw insertError;

          const { data: newProfile, error: refetchError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (refetchError) throw refetchError;

          setProfile(newProfile);
          setDisplayName(newProfile.display_name || "");
          setBio(newProfile.bio || "");
          setAvatarUrl(newProfile.avatar_url);
          setAboutYou("");
          setAiInstructions("");
        }
      } catch (error: any) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Failed to load profile",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [toast]);

  // Track changes
  useEffect(() => {
    if (!profile) {
      setHasChanges(false);
      return;
    }

    const nameChanged = displayName !== (profile.display_name || "");
    const bioChanged = bio !== (profile.bio || "");
    const avatarChanged = avatarUrl !== profile.avatar_url;
    const aboutChanged = aboutYou !== ((profile.preferences?.about_you as string) || "");
    const instrChanged = aiInstructions !== ((profile.preferences?.custom_instructions as string) || "");

    setHasChanges(nameChanged || bioChanged || avatarChanged || aboutChanged || instrChanged);
  }, [displayName, bio, avatarUrl, profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a URL for the selected image
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const handleCropComplete = async (croppedImage: Blob) => {
    if (!profile) return;

    setIsUploading(true);
    setCropDialogOpen(false);

    try {
      const filename = `goalmap/${Date.now()}-profile.jpg`;
      const { url } = await put(filename, croppedImage, {
        access: 'public',
        token: import.meta.env.VITE_VERCEL_BLOB,
      });

      setAvatarUrl(url);

      toast({
        title: "Image uploaded",
        description: "Your profile image was uploaded successfully"
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "Failed to upload image",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setImageToCrop(null);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) return;

    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      // Build updated preferences (merge with existing)
      const existingPrefs = (profile.preferences || {}) as Record<string, unknown>;
      const updatedPrefs = {
        ...existingPrefs,
        about_you: aboutYou.trim(),
        custom_instructions: aiInstructions.trim(),
      };

      // Update profile in database
      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: displayName,
          bio: bio,
          avatar_url: avatarUrl,
          preferences: updatedPrefs,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      // Update user metadata in auth
      const { error: updateUserError } = await supabase.auth.updateUser({
        data: {
          avatar_url: avatarUrl,
          name: displayName
        }
      });

      if (updateUserError) throw updateUserError;

      // Update local state to match saved values
      const updatedPrefsLocal = { ...(profile.preferences || {}), about_you: aboutYou.trim(), custom_instructions: aiInstructions.trim() };
      setProfile({
        ...profile,
        display_name: displayName,
        bio: bio,
        avatar_url: avatarUrl,
        preferences: updatedPrefsLocal,
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated."
      });

      // Call the onSave callback if provided
      if (onSave) {
        onSave();
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4 sm:p-8">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-10">
      {/* Avatar Management Section */}
      <div className="flex flex-col items-center">
        <div
          className="relative cursor-pointer group"
          onClick={handleAvatarClick}
        >
          {/* Animated rings around avatar */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-20 group-hover:opacity-60 transition-opacity duration-500"></div>
            <Avatar className="h-32 w-32 border-2 border-border/60 shadow-2xl transition-transform duration-500 group-hover:scale-105 bg-background group-hover:border-primary/40 overflow-hidden">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={displayName || "Profile"} className="object-cover" />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 text-muted-foreground/30">
                  <div className="relative">
                    <UserCircle className="h-16 w-16 opacity-20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-blue-500/40 animate-pulse"></div>
                    </div>
                  </div>
                </AvatarFallback>
              )}
            </Avatar>

            {/* Overlay for interaction */}
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
              <Camera className="h-8 w-8 text-foreground translate-y-2 group-hover:translate-y-0 transition-transform duration-300" />
            </div>

            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/85 rounded-full backdrop-blur-md">
                <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs font-semibold text-primary mb-1">Profile picture</p>
          <p className="text-xs text-muted-foreground font-medium">Click the image to change it</p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      {imageToCrop && (
        <ImageCropDialog
          open={cropDialogOpen}
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onClose={() => {
            setCropDialogOpen(false);
            setImageToCrop(null);
          }}
        />
      )}

      {/* AI Personalization Section */}
      <div className="space-y-6 lg:space-y-8 border border-border/60 rounded-[1.5rem] p-5 lg:p-7 bg-background/60">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground tracking-tight">AI preferences</p>
            <p className="text-xs text-muted-foreground font-medium">Tell the AI how you want it to help you</p>
          </div>
        </div>

        {/* About You */}
        <div className="group/field space-y-3">
          <div className="flex items-center gap-2 px-1">
            <User2 className="h-3.5 w-3.5 text-gray-500 group-focus-within/field:text-blue-400 transition-colors" />
            <Label className="text-xs font-semibold text-muted-foreground group-focus-within/field:text-primary transition-colors">
              About you
            </Label>
          </div>
          <Textarea
            value={aboutYou}
            onChange={(e) => setAboutYou(e.target.value)}
            placeholder="e.g. I'm a software engineer building a SaaS startup. I prefer direct, technical answers."
            rows={3}
            className="bg-background/80 border-border/70 focus:border-primary/40 focus:ring-4 focus:ring-primary/10 rounded-[1.5rem] text-foreground placeholder:text-muted-foreground transition-all text-sm resize-none py-4 px-5 shadow-inner group-hover/field:border-border"
          />
          <p className="text-xs text-muted-foreground px-1">Example: your role, goals, and communication style.</p>
        </div>

        {/* Custom Instructions */}
        <div className="group/field space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Bot className="h-3.5 w-3.5 text-gray-500 group-focus-within/field:text-blue-400 transition-colors" />
            <Label className="text-xs font-semibold text-muted-foreground group-focus-within/field:text-primary transition-colors">
              Custom instructions
            </Label>
          </div>
          <Textarea
            value={aiInstructions}
            onChange={(e) => setAiInstructions(e.target.value)}
            placeholder="e.g. Reply concisely. Always suggest breaking tasks into subtasks. Use bullet points."
            rows={3}
            className="bg-background/80 border-border/70 focus:border-primary/40 focus:ring-4 focus:ring-primary/10 rounded-[1.5rem] text-foreground placeholder:text-muted-foreground transition-all text-sm resize-none py-4 px-5 shadow-inner group-hover/field:border-border"
          />
          <p className="text-xs text-muted-foreground px-1">Example: be concise, use bullet points, explain step by step.</p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid gap-6 lg:gap-10">
        <div className="group/field space-y-3 lg:space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="relative">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 group-focus-within/field:animate-ping opacity-70"></div>
              <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
            </div>
            <Label htmlFor="displayName" className="text-xs font-semibold text-muted-foreground group-focus-within/field:text-primary transition-colors">
              Display name
            </Label>
          </div>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How your name appears"
            className="h-12 lg:h-14 bg-background/80 border-border/70 focus:border-primary/40 focus:ring-4 focus:ring-primary/10 rounded-2xl text-foreground placeholder:text-muted-foreground transition-all text-sm lg:text-base shadow-inner group-hover/field:border-border"
          />
        </div>

        <div className="group/field space-y-3 lg:space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="relative">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 group-focus-within/field:animate-ping opacity-70"></div>
              <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
            </div>
            <Label htmlFor="bio" className="text-xs font-semibold text-muted-foreground group-focus-within/field:text-primary transition-colors">
              Bio
            </Label>
          </div>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a short intro about yourself"
            rows={4}
            className="bg-background/80 border-border/70 focus:border-primary/40 focus:ring-4 focus:ring-primary/10 rounded-[1.5rem] text-foreground placeholder:text-muted-foreground transition-all text-sm lg:text-base resize-none py-4 px-5 lg:py-5 lg:px-6 shadow-inner group-hover/field:border-border"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 lg:gap-5 pt-6 lg:pt-10 border-t border-border/60">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="h-12 lg:h-14 flex-1 rounded-2xl border border-border/60 bg-background/60 hover:bg-accent text-muted-foreground hover:text-foreground font-medium text-sm transition-all"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className={cn(
            "h-12 lg:h-14 flex-[2] rounded-2xl font-medium text-sm transition-all relative overflow-hidden group shadow-2xl",
            hasChanges && !isSaving
              ? "bg-blue-600 text-white shadow-blue-500/20 hover:shadow-blue-500/40"
              : "bg-muted text-muted-foreground cursor-not-allowed border border-border/40"
          )}
          disabled={isSaving || !hasChanges}
        >
          {/* Refraction Shine Effect */}
          <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-[35deg] translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>

          <div className="relative z-10 flex items-center justify-center gap-2">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-200" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save changes</span>
            )}
          </div>
        </Button>
      </div>
    </form>
  );
};

export default ProfileForm;
