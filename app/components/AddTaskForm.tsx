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
          className="flex-1 border border-border bg-input text-foreground rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-base placeholder-muted-foreground"
          disabled={loading}
          style={{ fontSize: "16px" }} // Prevents zoom on iOS
        />
        <button
          type="submit"
          disabled={loading || !newTaskTitle.trim()}
          className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </div>
    </form>
  );
}
