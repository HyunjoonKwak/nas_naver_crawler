interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = ({
  icon,
  title,
  description,
  action
}: EmptyStateProps) => {
  return (
    <div className="text-center py-16">
      <div className="text-7xl mb-4">{icon}</div>
      <p className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-2">
        {title}
      </p>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-500">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
};
