interface SuccessDisplayProps {
  message: string;
  onClear: () => void;
}

export function SuccessDisplay({ message, onClear }: SuccessDisplayProps) {
  if (!message) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md p-4 shadow-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-600 dark:text-green-400">✓</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800 dark:text-green-200">
                {message}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={onClear}
                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors duration-200"
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
