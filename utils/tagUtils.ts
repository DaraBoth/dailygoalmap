import type { TaskTag } from '@/components/calendar/types';

// Predefined tag colors with their text and background colors for light/dark themes
export const tagColorSchemes = {
  red: {
    light: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200/50',
      hover: 'hover:bg-red-200',
    },
    dark: {
      bg: 'dark:bg-red-900/30',
      text: 'dark:text-red-400',
      border: 'dark:border-red-800/50',
      hover: 'dark:hover:bg-red-900/40',
    }
  },
  blue: {
    light: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-200/50',
      hover: 'hover:bg-blue-200',
    },
    dark: {
      bg: 'dark:bg-blue-900/30',
      text: 'dark:text-blue-400',
      border: 'dark:border-blue-800/50',
      hover: 'dark:hover:bg-blue-900/40',
    }
  },
  green: {
    light: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200/50',
      hover: 'hover:bg-green-200',
    },
    dark: {
      bg: 'dark:bg-green-900/30',
      text: 'dark:text-green-400',
      border: 'dark:border-green-800/50',
      hover: 'dark:hover:bg-green-900/40',
    }
  },
  yellow: {
    light: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200/50',
      hover: 'hover:bg-yellow-200',
    },
    dark: {
      bg: 'dark:bg-yellow-900/30',
      text: 'dark:text-yellow-400',
      border: 'dark:border-yellow-800/50',
      hover: 'dark:hover:bg-yellow-900/40',
    }
  },
  purple: {
    light: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      border: 'border-purple-200/50',
      hover: 'hover:bg-purple-200',
    },
    dark: {
      bg: 'dark:bg-purple-900/30',
      text: 'dark:text-purple-400',
      border: 'dark:border-purple-800/50',
      hover: 'dark:hover:bg-purple-900/40',
    }
  },
  orange: {
    light: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-200/50',
      hover: 'hover:bg-orange-200',
    },
    dark: {
      bg: 'dark:bg-orange-900/30',
      text: 'dark:text-orange-400',
      border: 'dark:border-orange-800/50',
      hover: 'dark:hover:bg-orange-900/40',
    }
  },
  pink: {
    light: {
      bg: 'bg-pink-100',
      text: 'text-pink-800',
      border: 'border-pink-200/50',
      hover: 'hover:bg-pink-200',
    },
    dark: {
      bg: 'dark:bg-pink-900/30',
      text: 'dark:text-pink-400',
      border: 'dark:border-pink-800/50',
      hover: 'dark:hover:bg-pink-900/40',
    }
  },
  gray: {
    light: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-200/50',
      hover: 'hover:bg-gray-200',
    },
    dark: {
      bg: 'dark:bg-gray-900/30',
      text: 'dark:text-gray-400',
      border: 'dark:border-gray-800/50',
      hover: 'dark:hover:bg-gray-900/40',
    }
  },
};

// Function to get all Tailwind classes for a tag color
export function getTagColorClasses(color: TaskTag['color'] = 'gray'): string {
  const scheme = tagColorSchemes[color];
  return `${scheme.light.bg} ${scheme.light.text} ${scheme.light.border} ${scheme.light.hover} ${scheme.dark.bg} ${scheme.dark.text} ${scheme.dark.border} ${scheme.dark.hover}`;
}

// Default tag colors based on common task types
export function suggestTagColor(tagName: string): TaskTag['color'] {
  const normalizedTag = tagName.toLowerCase();
  if (normalizedTag.includes('urgent') || normalizedTag.includes('high priority')) return 'red';
  if (normalizedTag.includes('progress') || normalizedTag.includes('ongoing')) return 'blue';
  if (normalizedTag.includes('complete') || normalizedTag.includes('done')) return 'green';
  if (normalizedTag.includes('wait') || normalizedTag.includes('pending')) return 'yellow';
  if (normalizedTag.includes('personal') || normalizedTag.includes('private')) return 'purple';
  if (normalizedTag.includes('review') || normalizedTag.includes('check')) return 'orange';
  if (normalizedTag.includes('social') || normalizedTag.includes('meeting')) return 'pink';
  return 'gray';
}

// Function to format tag with proper capitalization
export function formatTagName(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}