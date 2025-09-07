interface ErrorDisplayProps {
  error: string;
  onClear: () => void;
}

export function ErrorDisplay({ error, onClear }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-md p-4 shadow-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-600 dark:text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={onClear}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-200"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
