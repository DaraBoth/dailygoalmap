import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse rounded-md bg-muted",
          className
        )}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

// Predefined skeleton components
const SkeletonText = ({ lines = 1, className }: { lines?: number; className?: string }) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-4 w-full" />
    ))}
  </div>
);

const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("p-4 space-y-3", className)}>
    <Skeleton className="h-4 w-2/3" />
    <SkeletonText lines={2} />
    <Skeleton className="h-8 w-1/3" />
  </div>
);

const SkeletonHeader = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center space-x-4 p-4", className)}>
    <Skeleton className="h-8 w-8 rounded-full" />
    <div className="space-y-2 flex-1">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-8 w-20" />
  </div>
);

const SkeletonCalendar = ({ className }: { className?: string }) => (
  <div className={cn("p-4 space-y-4", className)}>
    <Skeleton className="h-8 w-full" />
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 35 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  </div>
);

export { Skeleton, SkeletonText, SkeletonCard, SkeletonHeader, SkeletonCalendar };