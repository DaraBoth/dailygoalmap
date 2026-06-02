import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserProfileLite {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const profileCache = new Map<string, UserProfileLite>();
const KEY_DELIM = "|";

/**
 * Batch-fetch user_profiles rows for the given user IDs.
 * Returns a stable map keyed by user_id; results are de-duplicated and cached
 * in-memory across hook instances so multiple components don't re-query the
 * same IDs on every render.
 */
export function useUserProfiles(userIds: string[]) {
  // Use a primitive string as the single stable identity for the dedup'd ID list.
  // Object.is compares string contents, so this stays referentially equal across
  // renders even when the caller passes a freshly-constructed array each time.
  const idsKey = useMemo(() => {
    const set = new Set<string>();
    userIds.forEach((id) => {
      if (id) set.add(id);
    });
    return Array.from(set).sort().join(KEY_DELIM);
  }, [userIds]);

  // Stable array derived from the primitive key. Because [idsKey] compares by
  // value, this only re-allocates when the actual set of IDs changes.
  const uniqueIds = useMemo(
    () => (idsKey ? idsKey.split(KEY_DELIM) : []),
    [idsKey]
  );

  const [profiles, setProfiles] = useState<Record<string, UserProfileLite>>(() => {
    const initial: Record<string, UserProfileLite> = {};
    uniqueIds.forEach((id) => {
      const cached = profileCache.get(id);
      if (cached) initial[id] = cached;
    });
    return initial;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (uniqueIds.length === 0) return;

    const missing = uniqueIds.filter((id) => !profileCache.has(id));

    // Helper that only triggers a state update when the new map actually differs
    // from the previous one. Crucial — without this, calling setProfiles with a
    // fresh `{ ...prev }` every render kicks off an infinite render loop.
    const syncFromCache = () => {
      setProfiles((prev) => {
        let changed = false;
        let next = prev;
        uniqueIds.forEach((id) => {
          const cached = profileCache.get(id);
          if (cached && prev[id] !== cached) {
            if (!changed) next = { ...prev };
            next[id] = cached;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    };

    if (missing.length === 0) {
      syncFromCache();
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("id, display_name, avatar_url")
          .in("id", missing);

        if (error) throw error;

        const rows = (data || []) as UserProfileLite[];
        rows.forEach((row) => profileCache.set(row.id, row));
        // For any missing IDs that returned nothing, cache a null-name placeholder
        // so we don't re-query forever.
        missing.forEach((id) => {
          if (!profileCache.has(id)) {
            profileCache.set(id, { id, display_name: null, avatar_url: null });
          }
        });

        if (cancelled) return;
        syncFromCache();
      } catch (err) {
        console.warn("useUserProfiles fetch failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [idsKey]); // Depend only on the primitive key so this stays stable across renders.

  return { profiles, loading };
}

export function getInitials(name?: string | null, fallback = "U"): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
