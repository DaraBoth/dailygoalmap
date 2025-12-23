import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { searchUsers } from "@/services/internalNotifications";
import { notifyGoalInvitation } from "@/services/notificationService";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface InviteUsersProps {
  goalId: string;
  goalTitle: string;
}

export const InviteUsers: React.FC<InviteUsersProps> = ({ goalId, goalTitle }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { toast } = useToast();

  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!debouncedQuery) {
        setResults([]);
        return;
      }
      setLoading(true);
      const res = await searchUsers(debouncedQuery, 8);
      if (active) setResults(res);
      setLoading(false);
    };
    run();
    return () => { active = false; };
  }, [debouncedQuery]);

  const handleInvite = async (userId: string) => {
    setPendingId(userId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Not authenticated', description: 'Please sign in to invite users.', variant: 'destructive' });
        setPendingId(null);
        return;
      }

      // notifyGoalInvitation will send a push notification and persist the invitation
      const ok = await notifyGoalInvitation(goalId, user.id, goalTitle, userId);
      if (ok) {
        toast({ title: "Invitation sent", description: "The user was invited to this goal." });
      } else {
        toast({ title: "Unable to invite", description: "Please try again.", variant: "destructive" });
      }
    } catch (e) {
      console.error('invite error', e);
      toast({ title: 'Error', description: 'Failed to send invitation.', variant: 'destructive' });
    }
    setPendingId(null);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Invite users by name or email</label>
      <Input
        placeholder="Type a name or email..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="max-h-56 overflow-y-auto space-y-2">
        {loading && <p className="text-xs text-muted-foreground">Searching...</p>}
        {!loading && results.length === 0 && debouncedQuery && (
          <p className="text-xs text-muted-foreground">No users found.</p>
        )}
        {results.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-accent/50">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={u.avatar_url || undefined} alt={u.display_name || u.email || "User"} />
                <AvatarFallback>{getInitials(u.display_name || u.email || "U")}</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <div className="font-medium">{u.display_name || u.email}</div>
                {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleInvite(u.id)} disabled={pendingId === u.id} aria-disabled={pendingId === u.id}>
              {pendingId === u.id ? "Inviting..." : "Invite"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

