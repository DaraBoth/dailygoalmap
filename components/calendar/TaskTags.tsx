import React from 'react';
import { motion } from 'framer-motion';
import { Flag, Star, Bell, Clock, Target, Heart, Circle, Check, X } from 'lucide-react';
import type { TaskTag } from '@/components/calendar/types';
import { getTagColorClasses } from '@/utils/tagUtils';

interface TaskTagsProps {
  tags: string[];
  onRemoveTag?: (tag: string) => void;
  isEditing?: boolean;
  className?: string;
}

const iconComponents = {
  flag: Flag,
  star: Star,
  bell: Bell,
  clock: Clock,
  target: Target,
  heart: Heart,
  circle: Circle,
  check: Check,
};

export function TaskTags({ tags, onRemoveTag, isEditing = false, className = '' }: TaskTagsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag, index) => (
        <motion.span
          key={tag}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md backdrop-blur-sm border transition-colors ${getTagColorClasses()}`}
        >
          <span className="truncate max-w-[120px]">{tag}</span>
          {isEditing && onRemoveTag && (
            <button
              onClick={() => onRemoveTag(tag)}
              className="p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
              aria-label={`Remove ${tag} tag`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </motion.span>
      ))}
    </div>
  );
}

export default TaskTags;