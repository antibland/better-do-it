interface SuccessDisplayProps {
  message: string;
  onClear: () => void;
}

export function SuccessDisplay({ message, onClear }: SuccessDisplayProps) {
  if (!message) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-green-400">✓</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-800">{message}</p>
          </div>
          <div className="ml-auto pl-3">
            <button
              onClick={onClear}
              className="text-green-400 hover:text-green-600"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
