import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserGoalLite {
  id: string;
  title: string;
}

/**
 * Lightweight hook to load all goals the current user can write to
 * (goals they own + goals they have joined as a member).
 *
 * Returns a stable, alphabetically-sorted list of { id, title }.
 */
export function useUserGoalsLite() {
  const [goals, setGoals] = useState<UserGoalLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) throw new Error("Not signed in");
        const userId = userData.user.id;

        const [createdRes, joinedRes] = await Promise.all([
          supabase.from("goals").select("id, title").eq("user_id", userId),
          supabase
            .from("goal_members")
            .select("goal_id, goals(id, title)")
            .eq("user_id", userId),
        ]);

        if (createdRes.error) throw createdRes.error;
        if (joinedRes.error) throw joinedRes.error;

        const dedup = new Map<string, UserGoalLite>();
        (createdRes.data || []).forEach((g) => {
          if (g?.id) dedup.set(g.id, { id: g.id, title: g.title || "Untitled" });
        });
        (joinedRes.data || []).forEach((row: any) => {
          const g = row?.goals;
          if (g?.id && !dedup.has(g.id)) {
            dedup.set(g.id, { id: g.id, title: g.title || "Untitled" });
          }
        });

        const list = Array.from(dedup.values()).sort((a, b) =>
          a.title.localeCompare(b.title)
        );

        if (!cancelled) setGoals(list);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load goals");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { goals, loading, error };
}
