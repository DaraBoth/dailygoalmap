import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette, Upload, Trash2, X } from 'lucide-react';
import { useGoalThemes } from '@/hooks/useGoalThemes';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';

interface ThemeSelectorProps {
  userId: string;
  currentThemeId?: string;
  onThemeSelect: (themeId: string) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  userId,
  currentThemeId,
  onThemeSelect,
}) => {
  const { themes, loading, createTheme, deleteTheme, uploadThemeImage } = useGoalThemes(userId);
  const [open, setOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [cardImage, setCardImage] = useState<File | null>(null);
  const [pageImage, setPageImage] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const isMobile = useIsMobile()

  const handleCreateTheme = async () => {
    if (!newThemeName.trim()) return;

    setCreating(true);
    try {
      const profileUrl = profileImage ? await uploadThemeImage(profileImage, 'profile') : undefined;
      const cardUrl = cardImage ? await uploadThemeImage(cardImage, 'card') : undefined;
      const pageUrl = pageImage ? await uploadThemeImage(pageImage, 'page') : undefined;

      const theme = await createTheme({
        name: newThemeName,
        goal_profile_image: profileUrl,
        card_background_image: cardUrl,
        page_background_image: pageUrl,
      });

      if (theme) {
        setNewThemeName('');
        setProfileImage(null);
        setCardImage(null);
        setPageImage(null);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Palette className={`h-4 w-4 ${!isMobile && "mr-2" }`  } />
          {!isMobile && "Theme"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <div className='flex flex-row justify-between align-middle w-full'>
              <div className='font-semibold'>
                Goal Themes
              </div>
              <button className='text-red-500/50 liquid-glass rounded-md p-1' onClick={()=>setOpen(false)}><X/></button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Theme */}
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
                <div>
                  <Label className="text-xs">Profile Image</Label>
                  <div className="mt-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
                      className="text-xs"
                      placeholder=''
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Card Background</Label>
                  <div className="mt-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCardImage(e.target.files?.[0] || null)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Page Background</Label>
                  <div className="mt-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPageImage(e.target.files?.[0] || null)}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCreateTheme}
                disabled={!newThemeName.trim() || creating}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {creating ? 'Creating...' : 'Create Theme'}
              </Button>
            </div>
          </div>

          {/* Theme List */}
          <div className="space-y-3">
            <h3 className="font-semibold">Your Themes</h3>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading themes...</p>
                ) : themes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No themes yet. Create your first one!</p>
                ) : (
                  themes.map((theme) => (
                    <Card
                      key={theme.id}
                      className={`p-3 cursor-pointer transition-all ${
                        currentThemeId === theme.id ? 'ring-2 ring-primary shadow-orange-900'  : ''
                      }`}
                      onClick={() => onThemeSelect(theme.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{theme.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {currentThemeId === theme.id && 'Selected • '}
                            {new Date(theme.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {currentThemeId != theme.id && (
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

                      {/* Preview */}
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div className="aspect-square rounded bg-muted overflow-hidden">
                          {theme.goal_profile_image && (
                            <img
                              src={theme.goal_profile_image}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="aspect-square rounded bg-muted overflow-hidden">
                          {theme.card_background_image && (
                            <img
                              src={theme.card_background_image}
                              alt="Card"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="aspect-square rounded bg-muted overflow-hidden">
                          {theme.page_background_image && (
                            <img
                              src={theme.page_background_image}
                              alt="Page"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
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
