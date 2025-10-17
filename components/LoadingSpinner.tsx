interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  message?: string;
}

export const LoadingSpinner = ({
  size = 'md',
  color = 'blue-600',
  message
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`animate-spin rounded-full border-b-2 border-${color} ${sizeClasses[size]}`}></div>
      {message && (
        <p className="mt-4 text-gray-500 dark:text-gray-400">{message}</p>
      )}
    </div>
  );
};
