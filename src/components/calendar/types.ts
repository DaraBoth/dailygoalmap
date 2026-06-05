
import { User } from "@supabase/supabase-js";

export const TASK_COLORS = [
  { id: 'default', label: 'Default', hex: null },
  { id: 'purple',  label: 'Purple',  hex: '#7c3aed' },
  { id: 'blue',    label: 'Blue',    hex: '#2563eb' },
  { id: 'teal',    label: 'Teal',    hex: '#0d9488' },
  { id: 'green',   label: 'Green',   hex: '#16a34a' },
  { id: 'yellow',  label: 'Yellow',  hex: '#ca8a04' },
  { id: 'orange',  label: 'Orange',  hex: '#ea580c' },
  { id: 'red',     label: 'Red',     hex: '#dc2626' },
  { id: 'pink',    label: 'Pink',    hex: '#db2777' },
  { id: 'gray',    label: 'Gray',    hex: '#6b7280' },
] as const;

export type TaskColorId = typeof TASK_COLORS[number]['id'];

export interface Task {
  id: string;
  description: string;
  completed: boolean;
  user_id: string;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Unified datetime fields
  title?: string;
  start_date: string;        // ISO datetime (date portion used for day)
  end_date: string;          // ISO datetime (date portion used for day)
  daily_start_time?: string | null; // 'HH:MM:SS'
  daily_end_time?: string | null;   // 'HH:MM:SS'
  is_anytime?: boolean | null;
  duration_minutes?: number | null;
  tags?: string[];          // Array of task tags
  color?: string | null;    // Optional hex color string, e.g. '#7c3aed'
  series_id?: string | null;
  series_detached?: boolean | null;
}

export interface TaskTag {
  name: string;
  color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'pink' | 'gray';
  icon?: 'flag' | 'star' | 'bell' | 'clock' | 'target' | 'heart' | 'circle' | 'check';
}

export interface TaskManagerProps {
  goalId: string;
  goalTitle: string;
  goalDescription?: string;
}

export interface FinancialData {
  goalId: string;
  monthlyIncome?: number;
  targetSavings?: number;
  currency?: string;
}

export interface TaskGenerationParams {
  goalTitle: string;
  goalDescription?: string;
  financialData?: FinancialData | null;
  startDate: string;
  targetDate: string;
  geminiApiKey?: string;
  goalType?: string;
  travelDetails?: {
    destination?: string;
    accommodation?: string;
    transportation?: string;
    budget?: string;
    activities?: string[];
  };
  userContext?: any; // User context for personalized AI prompts
}
