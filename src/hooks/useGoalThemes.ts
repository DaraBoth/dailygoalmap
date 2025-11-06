import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GoalTheme, CreateThemePayload } from '@/types/theme';
import { useToast } from '@/hooks/use-toast';

export const useGoalThemes = (userId?: string) => {
  const [themes, setThemes] = useState<GoalTheme[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchThemes = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('goal_themes')
        .select('*')
        .or('is_public.eq.true,user_id.eq.'+userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setThemes(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load themes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createTheme = async (payload: CreateThemePayload): Promise<GoalTheme | null> => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('goal_themes')
        .insert({
          user_id: userId,
          ...payload,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Theme created successfully',
      });

      await fetchThemes();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to create theme',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateTheme = async (themeId: string, payload: Partial<CreateThemePayload>) => {
    try {
      const { error } = await supabase
        .from('goal_themes')
        .update(payload)
        .eq('id', themeId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Theme updated successfully',
      });

      await fetchThemes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update theme',
        variant: 'destructive',
      });
    }
  };

  const deleteTheme = async (themeId: string) => {
    try {
      const { error } = await supabase
        .from('goal_themes')
        .delete()
        .eq('id', themeId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Theme deleted successfully',
      });

      await fetchThemes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete theme',
        variant: 'destructive',
      });
    }
  };

  const uploadThemeImage = async (file: File, folder: string): Promise<string | null> => {
    if (!userId) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('goal-themes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('goal-themes')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
      return null;
    }
  };

  useEffect(() => {
    fetchThemes();
  }, [userId]);

  return {
    themes,
    loading,
    createTheme,
    updateTheme,
    deleteTheme,
    uploadThemeImage,
    refetch: fetchThemes,
  };
};
