import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin text-ministry-brand-primary" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-ministry-bg-tertiary rounded-ministry mb-2" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-ministry-border-default">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-ministry-bg-tertiary rounded"
              style={{ width: `${Math.random() * 40 + 60}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default p-6">
      <div className="h-4 bg-ministry-bg-tertiary rounded w-1/3 mb-4" />
      <div className="h-8 bg-ministry-bg-tertiary rounded w-1/2" />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-ministry-bg-tertiary rounded w-1/3" />
      <div className="h-4 bg-ministry-bg-tertiary rounded w-1/4" />
      <div className="h-32 bg-ministry-bg-tertiary rounded" />
      <div className="h-20 bg-ministry-bg-tertiary rounded" />
    </div>
  );
}
