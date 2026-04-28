import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Upload, Trash2, X, Edit2, Check, Globe, ChevronRight } from "lucide-react";
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
  collapsed?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  userId,
  currentThemeId,
  onThemeSelect,
  collapsed = false,
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
        <button
          title="Theme"
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/50",
            collapsed ? 'justify-center px-0' : ''
          )}
        >
          <Palette className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Theme</span>
              {currentThemeId && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold">Active</span>
              )}
              <ChevronRight className="h-3.5 w-3.5 opacity-40" />
            </>
          )}
        </button>
      </SheetTrigger>

      <SheetContent 
        side={isMobile ? "bottom" : "right"} 
        className={cn(
          "overflow-hidden p-0 flex flex-col",
          isMobile ? "h-[90vh] rounded-t-2xl" : "w-full sm:max-w-[580px] lg:max-w-[660px]"
        )}
      >
        <SheetHeader className="px-5 py-4 flex-shrink-0 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <span>{editingTheme ? 'Edit Theme' : 'Goal Themes'}</span>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 h-full">
          <div className="space-y-6 p-5">

            {/* Create/Edit Theme */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {editingTheme ? 'Editing: ' + editingTheme.name : 'New Theme'}
                </h3>
                {editingTheme && (
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="h-7 text-xs gap-1.5">
                    <X className="h-3 w-3" /> Cancel
                  </Button>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Left: Form */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Theme Name</Label>
                    <Input
                      value={newThemeName}
                      onChange={(e) => setNewThemeName(e.target.value)}
                      placeholder="e.g., Ocean Blue"
                      className="h-9 text-sm"
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

                  {/* Make Public */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Make Public</Label>
                    <Switch
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                  </div>

                  <Button
                    onClick={handleSaveTheme}
                    disabled={!newThemeName.trim() || creating}
                    className="w-full h-9 text-sm"
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

            {/* Divider */}
            <div className="border-t border-border/50" />

            {/* Existing Themes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Your Themes</h3>
                {currentThemeId && (
                  <Button variant="ghost" size="sm" onClick={() => onThemeSelect(null, true)} className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1.5">
                    <X className="h-3 w-3" /> Remove
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">{loading ? (
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
                        className={`group relative overflow-hidden cursor-pointer rounded-xl border transition-all duration-300 hover:shadow-md hover:scale-[1.02] bg-card/80 ${currentThemeId === theme.id
                            ? "ring-2 ring-primary/50 shadow-md shadow-primary/10"
                            : "hover:border-primary/30"
                          }`}
                      >
                        {/* Top bar */}
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                          <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-md px-2 py-1 rounded-md text-xs font-semibold text-foreground shadow-sm">
                            {theme.name}
                            {theme.is_public && (
                              <Globe className="h-3 w-3 text-blue-500" />
                            )}
                          </div>
                          {currentThemeId === theme.id && (
                            <span className="text-[10px] font-bold text-primary bg-primary/20 px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Image grid */}
                        <div className="grid grid-cols-3 gap-1.5 p-3 mt-8">
                          {[
                            { key: "goal_profile_image", label: "Profile" },
                            { key: "card_background_image", label: "Card" },
                            { key: "page_background_image", label: "Page" },
                          ].map(({ key, label }) => (
                            <div
                              key={key}
                              className="aspect-square overflow-hidden rounded-md border border-border/20 bg-muted/50 relative"
                            >
                              {theme[key as keyof typeof theme] ? (
                                <img
                                  src={theme[key as keyof typeof theme] as string}
                                  alt={label}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">
                                  {label}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Edit/Delete */}
                        {userId == theme.user_id && (
                          <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTheme(theme);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            {currentThemeId !== theme.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTheme(theme.id);
                                }}
                                className="h-6 w-6 p-0 text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </Card>
                    ))
                  )}
              </div>

            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
