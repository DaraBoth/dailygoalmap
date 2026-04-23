import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Upload, Trash2, X, Edit2, Check, Globe } from "lucide-react";
import { useGoalThemes } from "@/hooks/useGoalThemes";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { GoalTheme } from "@/types/theme";
import { Switch } from "../ui/switch";
import { cn } from "@/lib/utils";

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
  const { themes, loading, createTheme, updateTheme, deleteTheme, uploadThemeImage } =
    useGoalThemes(userId);
  const [open, setOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [isPublic, setIsPublic] = useState(false); // ⚡ New state for visibility
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [cardImage, setCardImage] = useState<File | null>(null);
  const [pageImage, setPageImage] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingTheme, setEditingTheme] = useState<GoalTheme | null>(null);
  const isMobile = useIsMobile();

  // 🔧 Create or Update theme
  const handleSaveTheme = async () => {
    if (!newThemeName.trim()) return;

    setCreating(true);
    try {
      const profileUrl = profileImage
        ? await uploadThemeImage(profileImage, "profile")
        : editingTheme?.goal_profile_image;
      const cardUrl = cardImage
        ? await uploadThemeImage(cardImage, "card")
        : editingTheme?.card_background_image;
      const pageUrl = pageImage
        ? await uploadThemeImage(pageImage, "page")
        : editingTheme?.page_background_image;

      if (editingTheme) {
        // Update existing theme
        await updateTheme(editingTheme.id, {
          name: newThemeName,
          goal_profile_image: profileUrl,
          card_background_image: cardUrl,
          page_background_image: pageUrl,
          is_public: isPublic, // ⚡ Include visibility
        });
        setEditingTheme(null);
      } else {
        // Create new theme
        await createTheme({
          name: newThemeName,
          goal_profile_image: profileUrl,
          card_background_image: cardUrl,
          page_background_image: pageUrl,
          is_public: isPublic, // ⚡ Include visibility
        });
      }

      // Reset form
      setNewThemeName("");
      setProfileImage(null);
      setCardImage(null);
      setPageImage(null);
      setIsPublic(false); // ⚡ Reset visibility toggle
    } finally {
      setCreating(false);
    }
  };

  // 🎨 Start editing a theme
  const handleEditTheme = (theme: GoalTheme) => {
    setEditingTheme(theme);
    setNewThemeName(theme.name);
    setIsPublic(!!theme.is_public); // ⚡ Load current visibility
    setProfileImage(null);
    setCardImage(null);
    setPageImage(null);
  };

  // ❌ Cancel editing
  const handleCancelEdit = () => {
    setEditingTheme(null);
    setNewThemeName("");
    setProfileImage(null);
    setCardImage(null);
    setPageImage(null);
    setIsPublic(false);
  };

  // 🗑️ Remove image from theme
  const handleRemoveThemeImage = async (field: 'goal_profile_image' | 'card_background_image' | 'page_background_image') => {
    if (!editingTheme) return;
    await updateTheme(editingTheme.id, { [field]: null });
  };

  // 🌊 Orbit Image Upload Component
  const OrbitImageUpload = ({
    label,
    file,
    existingUrl,
    onChange,
    onRemove,
  }: {
    label: string;
    file: File | null;
    existingUrl?: string;
    onChange: (file: File | null) => void;
    onRemove?: () => void;
  }) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const displayUrl = file ? URL.createObjectURL(file) : existingUrl;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFile = e.target.files?.[0] || null;
      onChange(newFile);
    };

    return (
      <div className="space-y-1">
        <Label className="text-xs font-medium">{label}</Label>
        <div
          onClick={() => inputRef.current?.click()}
          className={`relative group cursor-pointer aspect-square w-full rounded-xl overflow-hidden 
            border-2 border-border hover:border-primary/50
            transition-all duration-300 hover:scale-[1.02]
            ${displayUrl ? 'bg-muted' : 'bg-muted/50'}
          `}
        >
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <Upload className="h-6 w-6 mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Upload</p>
            </div>
          )}

          {displayUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (file) {
                  onChange(null);
                } else if (onRemove) {
                  onRemove();
                }
              }}
              className="absolute top-1.5 right-1.5 bg-destructive/90 text-destructive-foreground rounded-full p-1.5 hover:bg-destructive transition-colors"
            >
              <X size={12} />
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

  // 🎨 Preview Component
  const ThemePreview = () => {
    const previewProfileUrl = profileImage
      ? URL.createObjectURL(profileImage)
      : editingTheme?.goal_profile_image;
    const previewCardUrl = cardImage
      ? URL.createObjectURL(cardImage)
      : editingTheme?.card_background_image;
    const previewPageUrl = pageImage
      ? URL.createObjectURL(pageImage)
      : editingTheme?.page_background_image;

    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium">Preview</Label>
        <div
          className="relative rounded-xl overflow-hidden border-2 border-border p-4"
          style={{
            backgroundImage: previewPageUrl ? `url(${previewPageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {!previewPageUrl && (
            <div className="absolute inset-0 bg-gradient-to-br from-background to-muted" />
          )}
          <div
            className="relative rounded-lg p-4 backdrop-blur-sm border border-border/50"
            style={{
              backgroundImage: previewCardUrl ? `url(${previewCardUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {!previewCardUrl && (
              <div className="absolute inset-0 bg-card/80 rounded-lg" />
            )}
            <div className="relative flex items-center gap-3">
              {previewProfileUrl ? (
                <img
                  src={previewProfileUrl}
                  alt="Goal preview"
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold">
                  {newThemeName ? newThemeName.charAt(0).toUpperCase() : 'G'}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-sm">
                  {newThemeName || 'Theme Preview'}
                </h3>
                <p className="text-xs text-muted-foreground">Goal card preview</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="p-2 border bg-background/50 hover:bg-accent h-7 sm:h-8 px-1.5 sm:px-2 backdrop-blur-sm transition-all duration-200 rounded-xl flex items-center gap-1 sm:gap-2">
          <Palette className={`h-3.5 w-3.5 sm:h-4 sm:w-4`} />
          {!isMobile && <span className="text-xs sm:text-sm">Theme</span>}
        </button>
      </SheetTrigger>

      <SheetContent 
        side={isMobile ? "bottom" : "right"} 
        className={cn(
          "overflow-hidden p-0",
          isMobile ? "h-[85vh] rounded-t-3xl" : "w-full sm:max-w-[600px] lg:max-w-[700px]"
        )}
      >
        <SheetHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex-shrink-0 border-b border-border/40">
          <SheetTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>{editingTheme ? 'Edit Theme' : 'Goal Themes'}</span>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6 pb-4 sm:pb-6 h-[calc(85vh-4rem)]">
          <div className="space-y-4 sm:space-y-6 pt-4">
            {/* 🌈 Create/Edit Theme */}
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6 border rounded-xl sm:rounded-2xl bg-card">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm sm:text-base lg:text-lg">
                  {editingTheme ? 'Edit Theme' : 'Create New Theme'}
                </h3>
                {editingTheme && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-8 text-xs sm:text-sm"
                  >
                    Cancel
                  </Button>
                )}
              </div>

              <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                {/* Left: Form */}
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <Label className="text-xs sm:text-sm">Theme Name</Label>
                    <Input
                      value={newThemeName}
                      onChange={(e) => setNewThemeName(e.target.value)}
                      placeholder="e.g., Ocean Blue"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <OrbitImageUpload
                      label="Profile"
                      file={profileImage}
                      existingUrl={editingTheme?.goal_profile_image}
                      onChange={setProfileImage}
                      onRemove={editingTheme ? () => handleRemoveThemeImage('goal_profile_image') : undefined}
                    />
                    <OrbitImageUpload
                      label="Card BG"
                      file={cardImage}
                      existingUrl={editingTheme?.card_background_image}
                      onChange={setCardImage}
                      onRemove={editingTheme ? () => handleRemoveThemeImage('card_background_image') : undefined}
                    />
                    <OrbitImageUpload
                      label="Page BG"
                      file={pageImage}
                      existingUrl={editingTheme?.page_background_image}
                      onChange={setPageImage}
                      onRemove={editingTheme ? () => handleRemoveThemeImage('page_background_image') : undefined}
                    />
                  </div>

                  {/* ⚡ Add this inside the form section */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs sm:text-sm">Make Public</Label>
                    <Switch
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                  </div>

                  <Button
                    onClick={handleSaveTheme}
                    disabled={!newThemeName.trim() || creating}
                    className="w-full h-9 sm:h-10 text-sm"
                  >
                    {editingTheme ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        {creating ? "Updating..." : "Update Theme"}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {creating ? "Creating..." : "Create Theme"}
                      </>
                    )}
                  </Button>
                </div>

                {/* Right: Preview */}
                <div className="order-first lg:order-last">
                  <ThemePreview />
                </div>
              </div>
            </div>

            {/* 🎨 Existing Themes */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm sm:text-base">Your Themes</h3>
                {currentThemeId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onThemeSelect(null, true)}
                    className="h-8 text-xs sm:text-sm"
                  >
                    Remove Theme
                  </Button>
                )}
              </div>

              <ScrollArea className="max-h-[40vh] sm:max-h-[50vh] rounded-xl border border-border/20 bg-foreground/[0.02] backdrop-blur-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 p-3 sm:p-4">{loading ? (
                    <p className="text-xs sm:text-sm text-muted-foreground col-span-full text-center py-8 sm:py-10">
                      Loading themes...
                    </p>
                  ) : themes.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground col-span-full text-center py-8 sm:py-10">
                      No themes yet. Create your first one!
                    </p>
                  ) : (
                    themes.map((theme) => (
                      <Card
                        key={theme.id}
                        onClick={() => onThemeSelect(theme.id)}
                        className={`group relative overflow-hidden cursor-pointer rounded-xl sm:rounded-2xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-card/80 backdrop-blur-sm ${currentThemeId === theme.id
                            ? "ring-2 ring-primary/50 shadow-lg shadow-primary/10"
                            : "hover:border-primary/30"
                          }`}
                      >
                        {/* Top bar with name + visibility + active badge */}
                        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 flex items-center justify-between z-10">
                          <div className="flex items-center gap-1.5 sm:gap-2 bg-background/90 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-foreground shadow-md">
                            {theme.name}
                            {theme.is_public && (
                              <Globe className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                            )}
                          </div>
                          {currentThemeId === theme.id && (
                            <span className="text-[10px] sm:text-xs font-bold text-primary bg-primary/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md shadow-sm">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Image grid preview - larger and more prominent */}
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-3 sm:p-4 mt-8 sm:mt-12">
                          {[
                            { key: "goal_profile_image", label: "Profile" },
                            { key: "card_background_image", label: "Card" },
                            { key: "page_background_image", label: "Page" },
                          ].map(({ key, label }) => (
                            <div
                              key={key}
                              className="aspect-square overflow-hidden rounded-lg border border-border/20 bg-muted/50 relative group-hover:border-primary/20 transition-colors"
                            >
                              {theme[key as keyof typeof theme] ? (
                                <img
                                  src={theme[key as keyof typeof theme] as string}
                                  alt={label}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[9px] sm:text-[10px] text-muted-foreground">
                                  {label}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Edit/Delete buttons */}
                        {userId == theme.user_id && (
                          <div className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTheme(theme);
                              }}
                              className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                            >
                              <Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </Button>
                            {currentThemeId !== theme.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTheme(theme.id);
                                }}
                                className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-destructive"
                              >
                                <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>

            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
