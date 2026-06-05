// Notes tab for the Goal Detail page.
//
// Desktop: toggleable left sidebar (search + "+ New note" + scrollable note
//          list) and a right pane that shows either search-result cards or
//          the selected note rendered inline via GoalNoteEditor mode="inline".
// Mobile : card grid that opens the note in a Sheet via the same editor.
//
// RLS handles per-user filtering, but we additionally check edit permission
// client-side to decide whether to land in edit or view mode when opening
// a note from the sidebar.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  NotebookPen,
  Plus,
  Lock,
  Globe2,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { useNavigate, useSearch } from "@tanstack/react-router";
import GoalNoteEditor from "./GoalNoteEditor";
import type { GoalMember } from "@/types/goal";
import type { GoalNote } from "@/types/goalNote";

interface GoalNotesProps {
  goalId: string;
  goalOwnerUserId: string | null;
  currentUserId: string;
  members: GoalMember[];
}

const SIDEBAR_PREF_KEY = "goalNotes:sidebarOpen";

const GoalNotes: React.FC<GoalNotesProps> = ({
  goalId,
  goalOwnerUserId,
  currentUserId,
  members,
}) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as any;
  const urlNoteId = typeof search?.noteId === "string" ? search.noteId : null;

  const [notes, setNotes] = useState<GoalNote[]>([]);
  const [loading, setLoading] = useState(true);
  // Initial selection comes from the URL (`?noteId=...`), so a refresh /
  // shared link lands on the same note. Subsequent changes are mirrored
  // back to the URL via the effect below.
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(urlNoteId);
  const [openInEditMode, setOpenInEditMode] = useState(false);
  const [editorOpenMobile, setEditorOpenMobile] = useState(false);

  // Push selectedNoteId out to the URL (replace, not push, so back/forward
  // doesn't fill up with every selection).
  useEffect(() => {
    if (urlNoteId === selectedNoteId) return;
    navigate({
      to: "." as any,
      search: ((prev: any) => {
        const next = { ...(prev ?? {}) };
        if (selectedNoteId) next.noteId = selectedNoteId;
        else delete next.noteId;
        return next;
      }) as any,
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNoteId]);

  // If the URL changes externally (back/forward, deep link, etc.) and a
  // different noteId shows up, sync local state to follow it.
  useEffect(() => {
    if (urlNoteId !== selectedNoteId) {
      setSelectedNoteId(urlNoteId);
      // Mobile: open the sheet automatically so the linked note shows.
      if (urlNoteId && isMobile) setEditorOpenMobile(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlNoteId]);

  // Desktop sidebar persistence — remember toggle state per device.
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem(SIDEBAR_PREF_KEY);
    return v === null ? true : v === "1";
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_PREF_KEY, sidebarOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [sidebarOpen]);

  // Search applies to BOTH the sidebar list and the right pane's
  // results-view. Stays empty most of the time.
  const [searchQuery, setSearchQuery] = useState("");

  const memberById = useMemo(() => {
    const map = new Map<string, GoalMember>();
    members.forEach((m) => map.set(m.user_id, m));
    return map;
  }, [members]);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("goal_notes")
      .select("*")
      .eq("goal_id", goalId)
      .order("updated_at", { ascending: false });
    if (error) {
      toast({
        title: "Couldn't load notes",
        description: error.message,
        variant: "destructive",
      });
      setNotes([]);
    } else {
      setNotes((data ?? []) as GoalNote[]);
    }
    setLoading(false);
  }, [goalId, toast]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Realtime: re-fetch on any goal_notes change for this goal.
  useEffect(() => {
    const channelKey = `goal_notes:${goalId}:${
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Date.now()
    }`;
    const channel = (supabase as any)
      .channel(channelKey)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "goal_notes",
          filter: `goal_id=eq.${goalId}`,
        },
        (payload: any) => {
          // Own UPDATE round-trips are already reflected via the optimistic
          // onSaved callback in GoalNoteEditor — skip to avoid a loading flash.
          if (payload?.new?.updated_by === currentUserId) return;
          fetchNotes();
        }
      )
      .subscribe();
    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [goalId, currentUserId, fetchNotes]);

  const selectedNote = useMemo(
    () => (selectedNoteId ? notes.find((n) => n.id === selectedNoteId) ?? null : null),
    [selectedNoteId, notes]
  );

  const canEdit = useCallback(
    (note: GoalNote | null) => {
      if (!note) return false;
      return note.created_by === currentUserId || goalOwnerUserId === currentUserId;
    },
    [currentUserId, goalOwnerUserId]
  );

  // Insert a brand-new empty note immediately and open the editor on it.
  // Goes through the create_goal_note RPC (SECURITY DEFINER) rather than a
  // direct INSERT so the membership check happens in plpgsql instead of the
  // table's INSERT policy, which has been misfiring even for legitimate goal
  // members. Further edits go through normal UPDATE under RLS.
  const handleCreate = async () => {
    try {
      const { data, error } = await (supabase as any).rpc("create_goal_note", {
        p_goal_id: goalId,
      });
      if (error) throw error;
      // RPC returns SETOF goal_notes → an array with one row.
      const fresh = (Array.isArray(data) ? data[0] : data) as GoalNote | undefined;
      if (!fresh) throw new Error("Server returned no note row.");
      setNotes((prev) => [fresh, ...prev]);
      setSelectedNoteId(fresh.id);
      setOpenInEditMode(true);
      if (isMobile) setEditorOpenMobile(true);
    } catch (err: any) {
      toast({
        title: "Couldn't create note",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOpenNote = (note: GoalNote) => {
    setSelectedNoteId(note.id);
    setOpenInEditMode(canEdit(note));
    if (isMobile) setEditorOpenMobile(true);
  };

  const handleSaved = (saved: GoalNote) => {
    setNotes((prev) => {
      const without = prev.filter((n) => n.id !== saved.id);
      return [saved, ...without];
    });
    setSelectedNoteId(saved.id);
  };

  const handleDeleted = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNoteId === id) setSelectedNoteId(null);
  };

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const inTitle = n.title.toLowerCase().includes(q);
      const inContent = (n.content || "").toLowerCase().includes(q);
      return inTitle || inContent;
    });
  }, [notes, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  // Reset selection if it falls outside the filtered list — search results
  // shouldn't show a "selected" highlight for a row the user can't see.
  useEffect(() => {
    if (!selectedNoteId) return;
    if (!filteredNotes.some((n) => n.id === selectedNoteId)) {
      // Don't clear selection while a draft (no id) is being created.
      // We only clear when the user is browsing results.
    }
  }, [filteredNotes, selectedNoteId]);

  // ── Mobile rendering (card grid + Sheet) ──────────────────────────────────
  if (isMobile) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-3 border-b border-border/60">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight inline-flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-muted-foreground" />
              Notes
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Shared markdown notes for this goal.
            </p>
          </div>
          <Button onClick={handleCreate} size="sm" className="gap-1.5 shrink-0">
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>

        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title or content…"
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <LoadingState />
          ) : filteredNotes.length === 0 ? (
            <EmptyState onCreate={handleCreate} hasQuery={isSearching} />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  author={memberById.get(note.created_by)}
                  onClick={() => handleOpenNote(note)}
                />
              ))}
            </div>
          )}
        </div>

        <GoalNoteEditor
          mode="sheet"
          open={editorOpenMobile}
          onOpenChange={setEditorOpenMobile}
          note={selectedNote}
          goalId={goalId}
          goalOwnerUserId={goalOwnerUserId}
          currentUserId={currentUserId}
          members={members}
          initialEditMode={openInEditMode}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      </div>
    );
  }

  // ── Desktop rendering (sidebar + inline pane) ─────────────────────────────
  const editorVisible = !!selectedNote || (selectedNoteId === null && openInEditMode);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "shrink-0 flex flex-col border-r border-border/50 bg-slate-100/60 dark:bg-slate-950/40 transition-[width] duration-200 overflow-hidden",
          sidebarOpen ? "w-72 xl:w-80" : "w-0"
        )}
      >
        {sidebarOpen && (
          <>
            <div className="px-3 pt-3 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="flex-1 text-sm font-semibold tracking-tight inline-flex items-center gap-2 min-w-0">
                  <NotebookPen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">Notes</span>
                </h2>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setSidebarOpen(false)}
                  title="Hide sidebar"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search…"
                  className="pl-9 h-8 text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <Button onClick={handleCreate} size="sm" className="w-full gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New note
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-xs">Loading…</span>
                </div>
              ) : filteredNotes.length === 0 ? (
                <p className="text-xs text-muted-foreground px-3 py-6 text-center">
                  {isSearching ? "No notes match your search." : "No notes yet."}
                </p>
              ) : (
                filteredNotes.map((note) => {
                  const active = note.id === selectedNoteId;
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => handleOpenNote(note)}
                      className={cn(
                        "w-full text-left rounded-md px-2.5 py-2 transition-colors group",
                        active
                          ? "bg-accent text-foreground"
                          : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {note.visibility === "restricted" ? (
                          <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                        ) : (
                          <Globe2 className="h-3 w-3 opacity-50 shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate flex-1">
                          {note.title || "Untitled note"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/70 pl-4 mt-0.5">
                        {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </aside>

      {/* Collapsed sidebar toggle (only when sidebar is hidden) */}
      {!sidebarOpen && (
        <div className="shrink-0 border-r border-border/50 flex flex-col items-center pt-3 px-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setSidebarOpen(true)}
            title="Show notes list"
          >
            <PanelLeftOpen className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Right pane */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {isSearching ? (
          <SearchResultsPane
            results={filteredNotes}
            query={searchQuery}
            memberById={memberById}
            onOpen={(n) => {
              handleOpenNote(n);
              setSearchQuery("");
            }}
          />
        ) : editorVisible ? (
          <GoalNoteEditor
            mode="inline"
            open
            onOpenChange={(o) => {
              if (!o) {
                setSelectedNoteId(null);
                setOpenInEditMode(false);
              }
            }}
            note={selectedNote}
            goalId={goalId}
            goalOwnerUserId={goalOwnerUserId}
            currentUserId={currentUserId}
            members={members}
            initialEditMode={openInEditMode}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        ) : (
          <EmptyRightPane onCreate={handleCreate} hasNotes={notes.length > 0} />
        )}
      </div>
    </div>
  );
};

// ── Sub-pieces ───────────────────────────────────────────────────────────────

const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center py-12 text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin mr-2" />
    <span className="text-sm">Loading notes…</span>
  </div>
);

const EmptyState: React.FC<{ onCreate: () => void; hasQuery: boolean }> = ({
  onCreate,
  hasQuery,
}) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
      <NotebookPen className="h-5 w-5 text-muted-foreground/40" />
    </div>
    <p className="text-sm font-medium text-foreground/70">
      {hasQuery ? "No notes match your search." : "No notes yet"}
    </p>
    {!hasQuery && (
      <>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Capture context, decisions, or anything worth keeping next to this goal.
        </p>
        <Button onClick={onCreate} size="sm" className="mt-4 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Write the first note
        </Button>
      </>
    )}
  </div>
);

const EmptyRightPane: React.FC<{ onCreate: () => void; hasNotes: boolean }> = ({
  onCreate,
  hasNotes,
}) => (
  <div className="h-full flex flex-col items-center justify-center text-center p-8">
    <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
      <NotebookPen className="h-6 w-6 text-muted-foreground/40" />
    </div>
    <p className="text-sm font-medium text-foreground/70">
      {hasNotes ? "Select a note to view" : "No notes yet"}
    </p>
    <p className="text-xs text-muted-foreground mt-1 max-w-md">
      {hasNotes
        ? "Pick something from the sidebar, or search by title or content."
        : "Capture context, decisions, or anything worth keeping next to this goal."}
    </p>
    {!hasNotes && (
      <Button onClick={onCreate} size="sm" className="mt-4 gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Write the first note
      </Button>
    )}
  </div>
);

const NoteCard: React.FC<{
  note: GoalNote;
  author?: GoalMember;
  onClick: () => void;
}> = ({ note, author, onClick }) => {
  const authorName = author?.user_profiles?.display_name || "Someone";
  const hasContent = !!note.content?.trim();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group text-left rounded-xl border border-border/60 bg-background/60 hover:bg-background hover:border-border",
        "p-4 transition-all hover:shadow-sm flex flex-col gap-2 min-h-[140px]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 break-words flex-1">
          {note.title || "Untitled note"}
        </h3>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium shrink-0",
            note.visibility === "all"
              ? "bg-muted text-muted-foreground"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
          )}
        >
          {note.visibility === "all" ? <Globe2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          {note.visibility === "all" ? "All" : "Restricted"}
        </span>
      </div>
      {/* Card preview: rendered markdown, but images + code blocks hidden so
          cards stay compact. Line-clamp keeps the overall card height bounded. */}
      <div className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-4 overflow-hidden [&_img]:hidden [&_pre]:hidden [&_h1]:!text-xs [&_h2]:!text-xs [&_h3]:!text-xs [&_h1]:!border-0 [&_h1]:!pb-0 [&_*]:!my-0">
        {hasContent ? (
          <MarkdownRenderer
            content={note.content}
            isStreaming={false}
            isLoading={false}
            noCopy
          />
        ) : (
          <span className="italic">No content yet.</span>
        )}
      </div>
      <div className="flex items-center gap-2 pt-1 mt-auto border-t border-border/40">
        <Avatar className="h-5 w-5 ring-1 ring-border/60 shrink-0">
          <AvatarImage src={author?.user_profiles?.avatar_url} alt={authorName} />
          <AvatarFallback className="text-[9px] font-semibold">
            {(authorName[0] || "U").toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-[11px] text-muted-foreground truncate min-w-0">{authorName}</span>
        <span className="text-[11px] text-muted-foreground/60 shrink-0 ml-auto">
          {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
        </span>
      </div>
    </button>
  );
};

const SearchResultsPane: React.FC<{
  results: GoalNote[];
  query: string;
  memberById: Map<string, GoalMember>;
  onOpen: (note: GoalNote) => void;
}> = ({ results, query, memberById, onOpen }) => (
  <div className="h-full flex flex-col overflow-hidden">
    <div className="px-6 py-4 border-b border-border/60">
      <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
        <Search className="h-3.5 w-3.5" />
        Results for <span className="text-foreground font-medium">"{query}"</span>
        <span className="opacity-60">·</span>
        <span>
          {results.length} {results.length === 1 ? "match" : "matches"}
        </span>
      </p>
    </div>
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      {results.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No notes match your search.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {results.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              author={memberById.get(note.created_by)}
              onClick={() => onOpen(note)}
            />
          ))}
        </div>
      )}
    </div>
  </div>
);

export default GoalNotes;
