import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Upload, Trash2, X, MinusCircle } from "lucide-react";
import { useGoalThemes } from "@/hooks/useGoalThemes";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

interface ThemeSelectorProps {
  userId: string;
  currentThemeId?: string;
  onThemeSelect: (themeId: string | null, remove?: boolean) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  userId,
  currentThemeId,
  onThemeSelect,
}) => {
  const { themes, loading, createTheme, deleteTheme, uploadThemeImage } =
    useGoalThemes(userId);
  const [open, setOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [cardImage, setCardImage] = useState<File | null>(null);
  const [pageImage, setPageImage] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const isMobile = useIsMobile();

  // 🔧 Create new theme
  const handleCreateTheme = async () => {
    if (!newThemeName.trim()) return;

    setCreating(true);
    try {
      const profileUrl = profileImage
        ? await uploadThemeImage(profileImage, "profile")
        : undefined;
      const cardUrl = cardImage
        ? await uploadThemeImage(cardImage, "card")
        : undefined;
      const pageUrl = pageImage
        ? await uploadThemeImage(pageImage, "page")
        : undefined;

      const theme = await createTheme({
        name: newThemeName,
        goal_profile_image: profileUrl,
        card_background_image: cardUrl,
        page_background_image: pageUrl,
      });

      if (theme) {
        setNewThemeName("");
        setProfileImage(null);
        setCardImage(null);
        setPageImage(null);
      }
    } finally {
      setCreating(false);
    }
  };

  // 🌊 Liquid Glass Upload Component
  const LiquidGlassUpload = ({
    label,
    file,
    onChange,
  }: {
    label: string;
    file: File | null;
    onChange: (file: File | null) => void;
  }) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFile = e.target.files?.[0] || null;
      onChange(newFile);
    };

    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <div
          onClick={() => inputRef.current?.click()}
          className={`relative group cursor-pointer aspect-square w-full rounded-2xl overflow-hidden 
            border border-white/20 backdrop-blur-xl bg-white/10
            shadow-[0_0_20px_rgba(255,255,255,0.1)]
            transition-all duration-500 hover:scale-[1.02]
            hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]
          `}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 via-pink-500/20 to-purple-500/20 blur-2xl opacity-30 group-hover:opacity-60 transition-all"></div>

          {file ? (
            <img
              src={URL.createObjectURL(file)}
              alt="preview"
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-white/80 z-10">
              <Upload className="h-8 w-8 mb-1 text-white/70 group-hover:scale-110 transition-transform" />
              <p className="text-[11px] text-foreground font-light">
                Click to upload
              </p>
            </div>
          )}

          {file && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition"
            >
              <X size={14} />
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Palette className={`h-4 w-4 ${!isMobile && "mr-2"}`} />
          {!isMobile && "Theme"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-row justify-between items-center w-full">
              <div className="font-semibold">Goal Themes</div>
              <button
                className="text-red-500/50 rounded-md p-1 hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 🌈 Create New Theme */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Create New Theme</h3>
            <div className="space-y-3">
              <div>
                <Label>Theme Name</Label>
                <Input
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder="e.g., Ocean Blue"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <LiquidGlassUpload
                  label="Goal Profile"
                  file={profileImage}
                  onChange={setProfileImage}
                />
                <LiquidGlassUpload
                  label="Card Background"
                  file={cardImage}
                  onChange={setCardImage}
                />
                <LiquidGlassUpload
                  label="Page Background"
                  file={pageImage}
                  onChange={setPageImage}
                />
              </div>

              <Button
                onClick={handleCreateTheme}
                disabled={!newThemeName.trim() || creating}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {creating ? "Creating..." : "Create Theme"}
              </Button>
            </div>
          </div>

          {/* 🎨 Existing Themes */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Your Themes</h3>
              {currentThemeId && (
                <button
                  onClick={() => onThemeSelect(null, true)}
                  className="flex items-center gap-1 text-red-600 underline"
                >
                  {/* <MinusCircle className="h-4 w-4" /> */}
                  Remove current theme
                </button>
              )}
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground">
                    Loading themes...
                  </p>
                ) : themes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No themes yet. Create your first one!
                  </p>
                ) : (
                  themes.map((theme) => (
                    <Card
                      key={theme.id}
                      className={`liquid-glass-container p-3 cursor-pointer  ${
                        currentThemeId === theme.id
                          ? "liquid-glass-container "
                          : ""
                      }`}
                      onClick={() => onThemeSelect(theme.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{theme.name} {currentThemeId === theme.id && " • Selected"}</h4>
                          <p className="text-xs text-muted-foreground">
                            
                            {new Date(theme.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {currentThemeId !== theme.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTheme(theme.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {[
                          "goal_profile_image",
                          "card_background_image",
                          "page_background_image",
                        ].map((key) => (
                          <div
                            key={key}
                            className="aspect-square rounded bg-muted overflow-hidden"
                          >
                            {theme[key as keyof typeof theme] && (
                              <img
                                src={theme[key as keyof typeof theme] as string}
                                alt={key}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
