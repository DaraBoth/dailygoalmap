// Side sheet for viewing/editing a single goal note. Mirrors the
// TaskDetailsSidebar pattern: sticky title + action bar, full-bleed
// MarkdownEditor or MarkdownRenderer below, and a visibility picker in
// the action bar for choosing who can read this note.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Copy, Edit2, Eye, Globe2, Lock, RefreshCw, Trash2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { supabase } from "@/integrations/supabase/client";
import type { GoalMember } from "@/types/goal";
import type {
  GoalNote,
  GoalNoteCollaboratorRole,
  GoalNoteVisibility,
} from "@/types/goalNote";

type Collaborator = { user_id: string; role: GoalNoteCollaboratorRole };

interface GoalNoteEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null when creating a new note */
  note: GoalNote | null;
  goalId: string;
  goalOwnerUserId: string | null;
  currentUserId: string;
  members: GoalMember[];
  initialEditMode?: boolean;
  onSaved: (note: GoalNote) => void;
  onDeleted: (noteId: string) => void;
  /** "sheet" (default) wraps in a Sheet for mobile; "inline" renders bare for
   *  a desktop split-pane parent. */
  mode?: "sheet" | "inline";
}

const GoalNoteEditor: React.FC<GoalNoteEditorProps> = ({
  open,
  onOpenChange,
  note,
  goalId,
  goalOwnerUserId,
  currentUserId,
  members,
  initialEditMode,
  onSaved,
  onDeleted,
  mode = "sheet",
}) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const isCreating = !note;
  // Tracked below in the collaborators useState — we recompute when those load.
  // For the initial render, the creator/owner shortcut is enough.
  const baselineCanEdit =
    isCreating ||
    note?.created_by === currentUserId ||
    goalOwnerUserId === currentUserId;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<GoalNoteVisibility>("all");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  // Full canEdit: baseline (creator/owner) OR I'm listed as an editor in
  // goal_note_viewers. Recomputes once collaborators load from the server.
  const canEdit =
    baselineCanEdit ||
    collaborators.some(
      (c) => c.user_id === currentUserId && c.role === "editor"
    );

  // Editors can flip between live-edit (auto-save) and preview (markdown
  // render). Default to edit; preview is opt-in via the toggle button.
  // Viewers can only see the rendered view, no choice.
  const [editorWantsPreview, setEditorWantsPreview] = useState(false);
  const isEditing = canEdit && !editorWantsPreview;
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last-saved snapshot so we don't re-save what's already in the DB.
  const lastSavedRef = useRef<{ title: string; content: string; visibility: GoalNoteVisibility }>({
    title: "",
    content: "",
    visibility: "all",
  });
  // Suppress auto-save during the initial hydration from props.
  const isHydratingRef = useRef(false);

  // ── Realtime collaboration state ───────────────────────────────────────────
  // editorPresence: who else currently has this note open in edit mode.
  // externalUpdate: latest version saved by another user while we were editing
  // — held back so it doesn't clobber unsaved local edits without consent.
  type Presence = { user_id: string; display_name: string; avatar_url?: string };
  const [editorPresence, setEditorPresence] = useState<Presence[]>([]);
  const [externalUpdate, setExternalUpdate] = useState<{
    note: GoalNote;
    actor: string;
  } | null>(null);

  // Hydrate state when the note prop changes (different note selected, or
  // a fresh fetch of the same note). With the new auto-save flow the parent
  // always passes a real note row — drafts no longer exist client-side.
  useEffect(() => {
    if (!open || !note) return;
    isHydratingRef.current = true;
    setTitle(note.title);
    setContent(note.content);
    setVisibility(note.visibility);
    lastSavedRef.current = {
      title: note.title,
      content: note.content,
      visibility: note.visibility,
    };
    setLastSavedAt(new Date(note.updated_at));
    setSaveStatus("idle");
    // Always fetch collaborator rows (with role) — editors can exist on
    // visibility='all' notes too, since "all members can view, plus these
    // explicit editors can write."
    void (async () => {
      const { data } = await (supabase as any)
        .from("goal_note_viewers")
        .select("user_id, role")
        .eq("note_id", note.id);
      setCollaborators(
        ((data ?? []) as { user_id: string; role: GoalNoteCollaboratorRole }[]).map((r) => ({
          user_id: r.user_id,
          role: r.role,
        }))
      );
    })();
    // Release the hydration latch on the next tick so the state-derived
    // auto-save effect doesn't fire for the hydration write.
    queueMicrotask(() => {
      isHydratingRef.current = false;
    });
  }, [note?.id, note?.updated_at, open]);

  // Auto-resize the title textarea while editing.
  useEffect(() => {
    if (!isEditing) return;
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title, isEditing]);

  // ── Realtime: live content sync ───────────────────────────────────────────
  // Subscribe to UPDATEs on this specific note. If someone else saves while
  // we're not editing, we auto-apply. If we ARE editing, we stash the new
  // version and surface a banner so the user can choose to reload — that way
  // they never lose in-progress local edits silently.
  useEffect(() => {
    if (!open || !note?.id) return;
    const channelKey = `note-sync:${note.id}:${
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Date.now()
    }`;
    const channel = (supabase as any)
      .channel(channelKey)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "goal_notes",
          filter: `id=eq.${note.id}`,
        },
        (payload: any) => {
          const next = payload?.new as GoalNote | undefined;
          if (!next) return;
          // Ignore our own UPDATE round-trip.
          if (next.updated_by === currentUserId) return;
          if (isEditing) {
            const actor =
              members.find((m) => m.user_id === next.updated_by)?.user_profiles
                ?.display_name || "Someone";
            setExternalUpdate({ note: next, actor });
          } else {
            setTitle(next.title);
            setContent(next.content);
            setVisibility(next.visibility);
          }
        }
      )
      .subscribe();
    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [open, note?.id, isEditing, currentUserId, members]);

  // ── Realtime: editor presence ─────────────────────────────────────────────
  // Broadcast our presence on a per-note channel ONLY while in edit mode so
  // other members can see "X is also editing this note." The track payload
  // carries display_name and avatar so the recipient doesn't have to look
  // anyone up.
  useEffect(() => {
    if (!open || !note?.id || !isEditing || !currentUserId) {
      setEditorPresence([]);
      return;
    }
    const me = members.find((m) => m.user_id === currentUserId);
    const myPayload: Presence = {
      user_id: currentUserId,
      display_name: me?.user_profiles?.display_name || "You",
      avatar_url: me?.user_profiles?.avatar_url,
    };

    const channel = (supabase as any).channel(`note-presence:${note.id}`, {
      config: { presence: { key: currentUserId } },
    });

    const recompute = () => {
      const state = channel.presenceState() as Record<string, Presence[]>;
      const flat: Presence[] = [];
      Object.values(state).forEach((arr) => {
        if (Array.isArray(arr) && arr.length > 0) flat.push(arr[0]);
      });
      // Filter ourselves out — the badge is for "other" editors.
      setEditorPresence(flat.filter((p) => p.user_id !== currentUserId));
    };

    channel
      .on("presence", { event: "sync" }, recompute)
      .on("presence", { event: "join" }, recompute)
      .on("presence", { event: "leave" }, recompute)
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await channel.track(myPayload);
        }
      });

    return () => {
      channel.untrack().catch(() => {});
      (supabase as any).removeChannel(channel);
      setEditorPresence([]);
    };
  }, [open, note?.id, isEditing, currentUserId, members]);

  const applyExternalUpdate = () => {
    if (!externalUpdate) return;
    setTitle(externalUpdate.note.title);
    setContent(externalUpdate.note.content);
    setVisibility(externalUpdate.note.visibility);
    setExternalUpdate(null);
    toast({ title: "Reloaded with latest version" });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // Persist (or no-op if nothing changed since the last save). Used by both
  // the debounced auto-save effect and the immediate-save paths (visibility,
  // viewer-list, unmount-flush).
  const persistNote = useCallback(
    async ({ silent = true }: { silent?: boolean } = {}) => {
      if (!note) return;
      const snap = lastSavedRef.current;
      const changed =
        title !== snap.title ||
        content !== snap.content ||
        visibility !== snap.visibility;
      if (!changed) return;

      setSaveStatus("saving");
      try {
        const { data, error } = await (supabase as any)
          .from("goal_notes")
          .update({
            title,
            content,
            visibility,
            updated_by: currentUserId,
          })
          .eq("id", note.id)
          .select()
          .single();
        if (error) throw error;
        const saved = data as GoalNote;
        lastSavedRef.current = {
          title: saved.title,
          content: saved.content,
          visibility: saved.visibility,
        };
        setLastSavedAt(new Date(saved.updated_at));
        setSaveStatus("saved");
        onSaved(saved);
      } catch (err: any) {
        setSaveStatus("idle");
        if (!silent) {
          toast({
            title: "Couldn't save note",
            description: err?.message ?? "Please try again.",
            variant: "destructive",
          });
        } else {
          console.error("Auto-save failed:", err);
        }
      }
    },
    [note, title, content, visibility, currentUserId, onSaved, toast]
  );

  // Debounced auto-save for title/content/visibility edits.
  //
  // We keep `persistNote` in a ref instead of listing it as a dep so the
  // debounce timer ONLY resets when the user actually types — not whenever
  // a callback's identity changes (parent re-render, fresh closures, etc.).
  // Bumped to 1.2s to lower DB write pressure under heavy typing while
  // still feeling near-real-time.
  const persistNoteRef = useRef(persistNote);
  useEffect(() => {
    persistNoteRef.current = persistNote;
  }, [persistNote]);

  useEffect(() => {
    if (!canEdit || !note || isHydratingRef.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveStatus("idle");
    autoSaveTimer.current = setTimeout(() => {
      void persistNoteRef.current();
    }, 1200);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [title, content, visibility, canEdit, note?.id]);

  // Reconcile collaborator rows. Called when the visibility popover closes.
  //  - visibility='restricted': store every collaborator (their role
  //    determines if they can edit or only view)
  //  - visibility='all'        : viewer rows are implicit for every goal
  //    member, so we only store rows for users explicitly elevated to
  //    'editor'. Rows with role='viewer' get dropped because they're
  //    redundant.
  const persistViewerList = useCallback(async () => {
    if (!note || !canEdit) return;
    try {
      await (supabase as any)
        .from("goal_note_viewers")
        .delete()
        .eq("note_id", note.id);

      const rowsToInsert =
        visibility === "restricted"
          ? collaborators
          : collaborators.filter((c) => c.role === "editor");

      if (rowsToInsert.length > 0) {
        const { error } = await (supabase as any)
          .from("goal_note_viewers")
          .insert(rowsToInsert.map((c) => ({
            note_id: note.id,
            user_id: c.user_id,
            role: c.role,
          })));
        if (error) console.warn("Failed to write collaborator list:", error);
      }
    } catch (err) {
      console.error("Collaborator reconcile failed:", err);
    }
  }, [note, canEdit, visibility, collaborators]);

  // Flush any pending edits when the editor is closing or the selected note
  // changes — prevents losing the last 800ms of typing.
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
        // Fire-and-forget flush; we're unmounting.
        void persistNote({ silent: true });
      }
    };
  }, [persistNote]);

  const handleDelete = async () => {
    if (!note) return;
    if (!window.confirm("Delete this note? This can't be undone.")) return;
    try {
      const { error } = await (supabase as any)
        .from("goal_notes")
        .delete()
        .eq("id", note.id);
      if (error) throw error;
      onDeleted(note.id);
      handleClose();
      toast({ title: "Note deleted" });
    } catch (err: any) {
      toast({
        title: "Couldn't delete note",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    if (!content.trim()) {
      toast({ title: "Nothing to copy", variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "Copied", description: "Note content copied to clipboard." });
    } catch {
      toast({ title: "Couldn't copy", variant: "destructive" });
    }
  };

  // Cycle a member's permission. For 'restricted' notes:
  //   none → viewer → editor → none
  // For 'all' notes there's no "none" since they implicitly view, so:
  //   viewer → editor → viewer
  const cycleMemberRole = (userId: string) => {
    setCollaborators((prev) => {
      const idx = prev.findIndex((c) => c.user_id === userId);
      const current = idx >= 0 ? prev[idx].role : null;
      let next: GoalNoteCollaboratorRole | null;
      if (visibility === "restricted") {
        next = current === null ? "viewer" : current === "viewer" ? "editor" : null;
      } else {
        next = current === "editor" ? "viewer" : "editor";
      }
      if (next === null) {
        return prev.filter((c) => c.user_id !== userId);
      }
      if (idx >= 0) {
        const copy = prev.slice();
        copy[idx] = { ...copy[idx], role: next };
        return copy;
      }
      return [...prev, { user_id: userId, role: next }];
    });
  };

  // Convenience lookups for the picker UI.
  const roleOfMember = (userId: string): GoalNoteCollaboratorRole | null =>
    collaborators.find((c) => c.user_id === userId)?.role ?? null;

  const invitedCount =
    visibility === "restricted"
      ? collaborators.length
      : collaborators.filter((c) => c.role === "editor").length;

  const memberOptions = members.filter((m) => m.user_id !== currentUserId);

  // In inline mode SheetTitle would error (it's a Radix Dialog primitive). We
  // swap in plain elements so the same body works in both wrappers.
  const HeaderTitle: React.ElementType =
    mode === "inline" ? "span" : (SheetTitle as any);
  const HeaderRow: React.ElementType =
    mode === "inline" ? "div" : (SheetHeader as any);

  // Body is identical in both modes; the wrapper differs. We assign the body
  // JSX to a const, then render it inside either a Sheet (mobile pop-out)
  // or a plain container (desktop split-pane).
  const bodyContent = (
    <div className="h-full flex flex-col relative">
          {/* Sticky title + action bar */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-border/60">
              <HeaderRow className={cn(
                "px-4 sm:px-8 lg:px-12 pt-4 sm:pt-5 pb-2",
                mode === "sheet" ? "pr-12 sm:pr-16" : "pr-4 sm:pr-6 flex flex-col space-y-2 text-left"
              )}>
                <div className="w-full flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 text-xs text-muted-foreground">
                    <HeaderTitle className="text-xs font-medium text-muted-foreground truncate">
                      {isCreating ? "New note" : "Goal note"}
                    </HeaderTitle>
                    {editorPresence.length > 0 && (
                      <div
                        className="flex items-center gap-1 pl-2 ml-1 border-l border-border/60"
                        title={
                          editorPresence
                            .map((p) => p.display_name)
                            .join(", ") +
                          ` ${editorPresence.length === 1 ? "is" : "are"} also editing`
                        }
                      >
                        <Eye className="h-3 w-3 text-emerald-500 shrink-0" />
                        <div className="flex -space-x-1.5">
                          {editorPresence.slice(0, 3).map((p) => (
                            <Avatar
                              key={p.user_id}
                              className="h-5 w-5 ring-2 ring-background"
                            >
                              <AvatarImage src={p.avatar_url} alt={p.display_name} />
                              <AvatarFallback className="text-[9px] font-semibold">
                                {(p.display_name[0] || "U").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        {editorPresence.length > 3 && (
                          <span className="text-[10px] font-medium text-muted-foreground">
                            +{editorPresence.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                    {/* Visibility picker */}
                    <Popover
                      open={visibilityOpen}
                      onOpenChange={(o) => {
                        setVisibilityOpen(o);
                        // Reconcile the viewer list when the popover closes.
                        if (!o) void persistViewerList();
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 sm:px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground gap-1.5"
                          title="Visibility"
                        >
                          {visibility === "all" ? (
                            <Globe2 className="h-3.5 w-3.5" />
                          ) : (
                            <Lock className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">
                            {visibility === "all"
                              ? invitedCount > 0
                                ? `All · ${invitedCount} editor${invitedCount === 1 ? "" : "s"}`
                                : "All members"
                              : `${invitedCount} ${invitedCount === 1 ? "member" : "members"}`}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        className="w-72 p-0 z-[200] bg-popover/95 backdrop-blur-xl"
                      >
                        <div className="p-2">
                          <button
                            type="button"
                            disabled={!isEditing}
                            onClick={() => setVisibility("all")}
                            className={cn(
                              "w-full flex items-start gap-2.5 px-3 py-2 rounded-md text-left transition-colors",
                              visibility === "all"
                                ? "bg-accent text-foreground"
                                : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                              !isEditing && "opacity-60 cursor-not-allowed hover:bg-transparent"
                            )}
                          >
                            <Globe2 className="h-4 w-4 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">All members</p>
                              <p className="text-[11px] text-muted-foreground">
                                Anyone in this goal can read this note.
                              </p>
                            </div>
                          </button>
                          <button
                            type="button"
                            disabled={!isEditing}
                            onClick={() => setVisibility("restricted")}
                            className={cn(
                              "w-full flex items-start gap-2.5 px-3 py-2 rounded-md text-left transition-colors mt-1",
                              visibility === "restricted"
                                ? "bg-accent text-foreground"
                                : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                              !isEditing && "opacity-60 cursor-not-allowed hover:bg-transparent"
                            )}
                          >
                            <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">Restricted</p>
                              <p className="text-[11px] text-muted-foreground">
                                Only you, the goal owner, and people you pick below.
                              </p>
                            </div>
                          </button>
                        </div>

                        <div className="border-t border-border/60 px-2 py-2 max-h-64 overflow-y-auto">
                          <p className="px-3 pt-1 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {visibility === "restricted"
                              ? "Invite & set role"
                              : "Promote to editor"}
                          </p>
                          {memberOptions.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-muted-foreground italic">
                              No other members yet.
                            </p>
                          ) : (
                            memberOptions.map((m) => {
                              const role = roleOfMember(m.user_id);
                              const name = m.user_profiles?.display_name || "Member";
                              // Tag label: implicit "Viewer" when 'all' + no row.
                              const label =
                                role === "editor"
                                  ? "Editor"
                                  : role === "viewer"
                                    ? "Viewer"
                                    : visibility === "all"
                                      ? "Viewer"
                                      : "Not invited";
                              const labelClass =
                                role === "editor"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  : role === "viewer" || visibility === "all"
                                    ? "bg-muted text-muted-foreground border-border"
                                    : "bg-muted/40 text-muted-foreground/60 border-border italic";
                              return (
                                <button
                                  key={m.user_id}
                                  type="button"
                                  disabled={!isEditing}
                                  onClick={() => cycleMemberRole(m.user_id)}
                                  className={cn(
                                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors",
                                    "hover:bg-accent/50",
                                    !isEditing && "opacity-60 cursor-not-allowed hover:bg-transparent"
                                  )}
                                  title={
                                    visibility === "restricted"
                                      ? "Click to cycle: Not invited → Viewer → Editor"
                                      : "Click to toggle: Viewer ↔ Editor"
                                  }
                                >
                                  <Avatar className="h-6 w-6 ring-1 ring-border/60 shrink-0">
                                    <AvatarImage src={m.user_profiles?.avatar_url} alt={name} />
                                    <AvatarFallback className="text-[10px] font-semibold">
                                      {(name[0] || "M").toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="flex-1 text-sm truncate">{name}</span>
                                  <span
                                    className={cn(
                                      "text-[10px] font-medium px-1.5 py-0.5 rounded-md border",
                                      labelClass
                                    )}
                                  >
                                    {label}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Auto-save status pill (editors only) */}
                    {canEdit && isEditing && (
                      <span
                        className="hidden sm:inline-flex items-center gap-1.5 px-2 h-7 rounded-md text-[11px] text-muted-foreground"
                        title={
                          lastSavedAt
                            ? `Last saved ${lastSavedAt.toLocaleTimeString()}`
                            : "Auto-saved as you type"
                        }
                      >
                        {saveStatus === "saving" ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Saved
                          </>
                        )}
                      </span>
                    )}

                    {/* Edit/Preview toggle (editors only) so the creator can
                        see how embeds + markdown actually render. */}
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 sm:px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground gap-1.5"
                        onClick={() => setEditorWantsPreview((p) => !p)}
                        title={editorWantsPreview ? "Back to edit" : "Preview rendered note"}
                      >
                        {editorWantsPreview ? (
                          <>
                            <Edit2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Preview</span>
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 sm:px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground gap-1.5"
                      onClick={handleCopy}
                      title="Copy content"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Copy</span>
                    </Button>

                    {canEdit && note && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        className="h-8 px-2 sm:px-2.5 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    )}
                  </div>
                </div>
              </HeaderRow>

              <div className="px-4 sm:px-8 lg:px-12 pb-4">
                {isEditing ? (
                  <textarea
                    ref={titleRef}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Untitled note"
                    rows={1}
                    autoFocus={!!initialEditMode}
                    className={cn(
                      "w-full resize-none bg-transparent border-0 outline-none placeholder:text-muted-foreground/40",
                      "text-base sm:text-lg lg:text-xl font-semibold leading-tight tracking-tight text-foreground"
                    )}
                  />
                ) : (
                  <h1 className={cn(
                    "w-full text-base sm:text-lg lg:text-xl font-semibold leading-tight tracking-tight break-words",
                    title.trim() ? "text-foreground" : "text-muted-foreground italic"
                  )}>
                    {title || "Untitled note"}
                  </h1>
                )}
                {note && !isEditing && (
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Last edited {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                  </p>
                )}
              </div>

              {/* External update banner — surfaces a save by another user
                  while we're editing, without clobbering local in-progress edits. */}
              {externalUpdate && isEditing && (
                <div className="mx-4 sm:mx-8 lg:mx-12 mb-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-900 dark:text-amber-200 flex-1 min-w-0">
                    {externalUpdate.actor} just saved updates to this note.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={applyExternalUpdate}
                    className="h-7 px-2 text-xs gap-1.5 border-amber-500/50 hover:bg-amber-500/15"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reload
                  </Button>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="w-full px-4 sm:px-8 lg:px-12 pt-4 pb-12">
              {isEditing ? (
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Write your note in markdown…"
                  minHeight={isMobile ? "320px" : "480px"}
                  className="rounded-none border-0 bg-transparent focus-within:ring-0"
                  contentClassName="px-0"
                  goalIdForTaskEmbed={goalId}
                />
              ) : (
                <div className="bg-muted/15 rounded-md px-4 py-3 sm:px-5 sm:py-4 min-h-[200px] sm:min-h-[280px]">
                  {content.trim() ? (
                    <MarkdownRenderer
                      content={content}
                      isStreaming={false}
                      isLoading={false}
                      noCopy
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No content yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
  );

  if (mode === "inline") {
    if (!open) return null;
    return (
      <div className="h-full w-full overflow-hidden bg-slate-100/95 dark:bg-slate-950/95">
        {bodyContent}
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "p-0 overflow-hidden bg-slate-100/95 dark:bg-slate-950/95 border-border/60 shadow-2xl",
          isMobile
            ? "h-[92vh] rounded-t-3xl"
            : "w-full sm:w-[560px] lg:w-[720px] xl:w-[820px] sm:max-w-none"
        )}
      >
        {bodyContent}
      </SheetContent>
    </Sheet>
  );
};

export default GoalNoteEditor;
