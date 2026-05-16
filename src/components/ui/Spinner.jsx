export default function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span
        className={`animate-spin rounded-full border-2 border-primary-600 border-t-transparent ${sizeClasses[size]}`}
      />
    </div>
  );
}
