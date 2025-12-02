import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EnhancedSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'shimmer' | 'pulse' | 'wave';
  speed?: 'slow' | 'normal' | 'fast';
}

const EnhancedSkeleton = React.forwardRef<HTMLDivElement, EnhancedSkeletonProps>(
  ({ className, variant = 'shimmer', speed = 'normal', ...props }, ref) => {
    const speedDurations = {
      slow: 2,
      normal: 1.5,
      fast: 1
    };

    const getVariantAnimation = () => {
      switch (variant) {
        case 'shimmer':
          return {
            backgroundPosition: ['200% 0', '-200% 0'],
            transition: {
              duration: speedDurations[speed],
              repeat: Infinity,
              ease: 'linear'
            }
          };
        case 'pulse':
          return {
            opacity: [0.5, 1, 0.5],
            transition: {
              duration: speedDurations[speed],
              repeat: Infinity,
              ease: 'easeInOut'
            }
          };
        case 'wave':
          return {
            scale: [1, 1.02, 1],
            transition: {
              duration: speedDurations[speed],
              repeat: Infinity,
              ease: 'easeInOut'
            }
          };
        default:
          return {
            opacity: [0.5, 1, 0.5],
            transition: {
              duration: speedDurations[speed],
              repeat: Infinity,
              ease: 'easeInOut'
            }
          };
      }
    };

    const getVariantStyles = () => {
      switch (variant) {
        case 'shimmer':
          return 'bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]';
        case 'pulse':
          return 'bg-muted';
        case 'wave':
          return 'bg-gradient-to-r from-muted/80 to-muted';
        default:
          return 'bg-muted';
      }
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          'rounded-md',
          getVariantStyles(),
          className
        )}
        animate={getVariantAnimation() as any}
        {...(props as any)}
      />
    );
  }
);
EnhancedSkeleton.displayName = "EnhancedSkeleton";

// Predefined enhanced skeleton components
const SkeletonText = ({ 
  lines = 1, 
  className, 
  variant = 'shimmer',
  speed = 'normal' 
}: { 
  lines?: number; 
  className?: string;
  variant?: 'default' | 'shimmer' | 'pulse' | 'wave';
  speed?: 'slow' | 'normal' | 'fast';
}) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <EnhancedSkeleton 
        key={i} 
        className={cn(
          "h-4",
          i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
        )}
        variant={variant}
        speed={speed}
      />
    ))}
  </div>
);

const SkeletonCard = ({ 
  className,
  variant = 'shimmer',
  speed = 'normal'
}: { 
  className?: string;
  variant?: 'default' | 'shimmer' | 'pulse' | 'wave';
  speed?: 'slow' | 'normal' | 'fast';
}) => (
  <motion.div 
    className={cn("p-6 space-y-4 rounded-lg border bg-card", className)}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center space-x-4">
      <EnhancedSkeleton className="h-12 w-12 rounded-full" variant={variant} speed={speed} />
      <div className="space-y-2 flex-1">
        <EnhancedSkeleton className="h-4 w-1/2" variant={variant} speed={speed} />
        <EnhancedSkeleton className="h-3 w-1/3" variant={variant} speed={speed} />
      </div>
    </div>
    <SkeletonText lines={3} variant={variant} speed={speed} />
    <div className="flex gap-2">
      <EnhancedSkeleton className="h-8 w-20 rounded-md" variant={variant} speed={speed} />
      <EnhancedSkeleton className="h-8 w-16 rounded-md" variant={variant} speed={speed} />
    </div>
  </motion.div>
);

const SkeletonHeader = ({ 
  className,
  variant = 'shimmer',
  speed = 'normal'
}: { 
  className?: string;
  variant?: 'default' | 'shimmer' | 'pulse' | 'wave';
  speed?: 'slow' | 'normal' | 'fast';
}) => (
  <motion.div 
    className={cn("flex items-center justify-between p-4", className)}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center space-x-4">
      <EnhancedSkeleton className="h-8 w-8 rounded-full" variant={variant} speed={speed} />
      <div className="space-y-2">
        <EnhancedSkeleton className="h-4 w-32" variant={variant} speed={speed} />
        <EnhancedSkeleton className="h-3 w-24" variant={variant} speed={speed} />
      </div>
    </div>
    <EnhancedSkeleton className="h-8 w-20 rounded-md" variant={variant} speed={speed} />
  </motion.div>
);

const SkeletonCalendar = ({ 
  className,
  variant = 'shimmer',
  speed = 'normal'
}: { 
  className?: string;
  variant?: 'default' | 'shimmer' | 'pulse' | 'wave';
  speed?: 'slow' | 'normal' | 'fast';
}) => (
  <motion.div 
    className={cn("p-4 space-y-4", className)}
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
  >
    {/* Calendar header */}
    <div className="flex items-center justify-between">
      <EnhancedSkeleton className="h-8 w-32" variant={variant} speed={speed} />
      <div className="flex gap-2">
        <EnhancedSkeleton className="h-8 w-8 rounded-md" variant={variant} speed={speed} />
        <EnhancedSkeleton className="h-8 w-8 rounded-md" variant={variant} speed={speed} />
      </div>
    </div>
    
    {/* Calendar grid */}
    <div className="grid grid-cols-7 gap-2">
      {/* Day headers */}
      {Array.from({ length: 7 }).map((_, i) => (
        <EnhancedSkeleton 
          key={`header-${i}`} 
          className="h-6 w-full" 
          variant={variant} 
          speed={speed}
        />
      ))}
      
      {/* Calendar days */}
      {Array.from({ length: 35 }).map((_, i) => (
        <motion.div
          key={`day-${i}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 0.2, 
            delay: i * 0.01,
            ease: "easeOut"
          }}
        >
          <EnhancedSkeleton 
            className="h-10 w-full rounded-md" 
            variant={variant} 
            speed={speed}
          />
        </motion.div>
      ))}
    </div>
  </motion.div>
);

const SkeletonGoalList = ({ 
  count = 3,
  className,
  variant = 'shimmer',
  speed = 'normal'
}: { 
  count?: number;
  className?: string;
  variant?: 'default' | 'shimmer' | 'pulse' | 'wave';
  speed?: 'slow' | 'normal' | 'fast';
}) => (
  <div className={cn("space-y-4", className)}>
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        className="p-4 rounded-lg border bg-card space-y-3"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ 
          duration: 0.3, 
          delay: i * 0.1,
          ease: "easeOut"
        }}
      >
        <div className="flex items-center justify-between">
          <EnhancedSkeleton className="h-6 w-48" variant={variant} speed={speed} />
          <EnhancedSkeleton className="h-6 w-16 rounded-full" variant={variant} speed={speed} />
        </div>
        <SkeletonText lines={2} variant={variant} speed={speed} />
        <div className="flex items-center gap-4">
          <EnhancedSkeleton className="h-2 flex-1 rounded-full" variant={variant} speed={speed} />
          <EnhancedSkeleton className="h-4 w-12" variant={variant} speed={speed} />
        </div>
      </motion.div>
    ))}
  </div>
);

export { 
  EnhancedSkeleton, 
  SkeletonText, 
  SkeletonCard, 
  SkeletonHeader, 
  SkeletonCalendar,
  SkeletonGoalList
};
