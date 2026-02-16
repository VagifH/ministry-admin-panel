import { Button } from './button';
import { FileX, Search, AlertCircle } from 'lucide-react';

export function EmptyState({
  icon: Icon = FileX,
  title,
  description,
  action,
  actionLabel,
  'data-testid': testId,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4" data-testid={testId}>
      <div className="w-12 h-12 rounded-full bg-ministry-bg-tertiary flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-ministry-text-muted" />
      </div>
      <h3 className="text-lg font-medium text-ministry-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-ministry-text-secondary text-center max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && actionLabel && (
        <Button
          onClick={action}
          className="bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry"
          data-testid={`${testId}-action`}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function NoResultsState({ onClearFilters, 'data-testid': testId }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your filters or search terms"
      action={onClearFilters}
      actionLabel="Clear Filters"
      data-testid={testId || 'no-results-state'}
    />
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Failed to load data. Please try again.',
  onRetry,
  'data-testid': testId,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4" data-testid={testId || 'error-state'}>
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="h-6 w-6 text-ministry-status-rejected" />
      </div>
      <h3 className="text-lg font-medium text-ministry-text-primary mb-1">{title}</h3>
      <p className="text-sm text-ministry-text-secondary text-center max-w-sm mb-4">
        {description}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="border-ministry-border-default rounded-ministry"
          data-testid="error-retry-button"
        >
          Try Again
        </Button>
      )}
    </div>
  );
}
