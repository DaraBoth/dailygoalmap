import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, UserCircle, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { put } from "@vercel/blob";
import { ImageCropDialog } from "./ImageCropDialog";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
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
        token: process.env.BLOB_READ_WRITE_TOKEN,
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
      
      // Update profile in database
      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: displayName,
          bio: bio,
          avatar_url: avatarUrl,
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
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="flex flex-col items-center mb-4 sm:mb-6">
        <div 
          className="relative cursor-pointer group"
          onClick={handleAvatarClick}
        >
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-3 sm:border-4 border-purple-200 shadow-lg transition-all duration-300 hover:border-purple-400">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayName || "Profile"} />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100">
                <UserCircle className="h-12 w-12 sm:h-16 sm:w-16 text-purple-400" />
              </AvatarFallback>
            )}
          </Avatar>
          
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300">
            <Camera className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-full">
              <Loader2 className="h-10 w-10 animate-spin text-white" />
            </div>
          )}
        </div>
        
        <p className="text-sm text-purple-500 mt-3 font-medium animate-pulse">Click to upload profile image</p>
        
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
      
      <div className="space-y-2">
        <Label htmlFor="displayName" className="text-purple-700 font-medium">Display Name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter your display name"
          className="border-purple-200 focus:border-purple-400 transition-all duration-300"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="bio" className="text-purple-700 font-medium">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us a bit about yourself"
          rows={4}
          className="border-purple-200 focus:border-purple-400 transition-all duration-300"
        />
      </div>
      
      <div className="flex justify-end gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          className="w-1/3"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="w-2/3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md"
          disabled={isSaving}
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
    </form>
  );
};

export default ProfileForm;
