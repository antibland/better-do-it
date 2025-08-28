interface ErrorDisplayProps {
  error: string;
  onClear: () => void;
}

export function ErrorDisplay({ error, onClear }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-red-400">⚠️</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <div className="ml-auto pl-3">
            <button
              onClick={onClear}
              className="text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
