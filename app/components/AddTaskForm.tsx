interface AddTaskFormProps {
  newTaskTitle: string;
  loading: boolean;
  onTitleChange: (title: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddTaskForm({
  newTaskTitle,
  loading,
  onTitleChange,
  onSubmit,
}: AddTaskFormProps) {
  return (
    <form onSubmit={onSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Add a new task..."
          className="flex-1 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          disabled={loading}
          style={{ fontSize: "16px" }} // Prevents zoom on iOS
        />
        <button
          type="submit"
          disabled={loading || !newTaskTitle.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </div>
    </form>
  );
}
