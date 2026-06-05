// Notes attached to a goal. Members of the goal can read/write notes; the
// `visibility` field lets the author scope a note to either every member or
// an explicit subset listed in goal_note_viewers. See sqlExecuter.sql for
// the underlying schema + RLS.

export type GoalNoteVisibility = "all" | "restricted";

export interface GoalNote {
  id: string;
  goal_id: string;
  created_by: string;
  updated_by: string | null;
  title: string;
  content: string;
  visibility: GoalNoteVisibility;
  created_at: string;
  updated_at: string;
}

export type GoalNoteCollaboratorRole = "editor" | "viewer";

export interface GoalNoteViewer {
  note_id: string;
  user_id: string;
  role: GoalNoteCollaboratorRole;
  added_at: string;
}
