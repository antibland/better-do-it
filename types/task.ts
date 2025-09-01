// Shared Task types used across the application

export type Task = {
  id: string;
  userId: string;
  title: string;
  isCompleted: 0 | 1;
  isActive: 0 | 1;
  sortOrder: number;
  createdAt: string;
  completedAt: string | null;
  addedToActiveAt: string | null;
};

export type TasksResponse = {
  tasks: Task[];
  activeTasks: Task[];
  masterTasks: Task[];
  openActiveTasks: Task[];
  completedThisWeek: number;
};

export type CompletedTasksResponse = {
  tasks: Task[];
};
