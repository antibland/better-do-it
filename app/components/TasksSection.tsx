import Link from "next/link";
import { TasksResponse } from "@/types";
import { AddTaskForm } from "./AddTaskForm";
import { TaskList } from "./TaskList";

interface TasksSectionProps {
  tasks: TasksResponse | null;
  newTaskTitle: string;
  loading: boolean;
  editingTaskId: string | null;
  completingTaskId: string | null;
  onNewTaskTitleChange: (title: string) => void;
  onCreateTask: (e: React.FormEvent) => void;
  onTaskClick: (taskId: string) => void;
  onTaskBlur: (taskId: string, title: string) => void;
  onTaskKeyDown: (
    e: React.KeyboardEvent,
    taskId: string,
    title: string
  ) => void;
  onStartCompletion: (taskId: string) => void;
  onDeleteTask: (taskId: string, taskTitle: string) => void;
  getTaskItemStyles: (
    isDragging: boolean,
    draggingOver: string | null
  ) => string;
  onUndoCompletion: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

export function TasksSection({
  tasks,
  newTaskTitle,
  loading,
  editingTaskId,
  completingTaskId,
  onNewTaskTitleChange,
  onCreateTask,
  onTaskClick,
  onTaskBlur,
  onTaskKeyDown,
  onStartCompletion,
  onDeleteTask,
  getTaskItemStyles,
  onUndoCompletion,
  onCompleteTask,
}: TasksSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          My Tasks
        </h2>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {tasks && (
              <span>{tasks.completedThisWeek} completed this week</span>
            )}
          </div>
        </div>
      </div>

      <AddTaskForm
        newTaskTitle={newTaskTitle}
        loading={loading}
        onTitleChange={onNewTaskTitleChange}
        onSubmit={onCreateTask}
      />

      <div className="space-y-4">
        {/* Active Tasks */}
        <TaskList
          droppableId="active-tasks"
          tasks={tasks?.openActiveTasks || []}
          title={`Active Tasks (${tasks?.openActiveTasks?.length || 0}/3)`}
          isActiveList={true}
          editingTaskId={editingTaskId}
          completingTaskId={completingTaskId}
          onTaskClick={onTaskClick}
          onTaskBlur={onTaskBlur}
          onTaskKeyDown={onTaskKeyDown}
          onStartCompletion={onStartCompletion}
          onDeleteTask={onDeleteTask}
          getTaskItemStyles={getTaskItemStyles}
          onUndoCompletion={onUndoCompletion}
          onCompleteTask={onCompleteTask}
        />

        {/* Divider between lists */}
        {tasks?.openActiveTasks &&
          tasks.openActiveTasks.length > 0 &&
          tasks?.masterTasks &&
          tasks.masterTasks.length > 0 && (
            <div className="border-t border-gray-300 dark:border-gray-600 my-4"></div>
          )}

        {/* Master Tasks */}
        <TaskList
          droppableId="master-tasks"
          tasks={tasks?.masterTasks || []}
          title={`Master List (${tasks?.masterTasks?.length || 0} tasks)`}
          isActiveList={false}
          editingTaskId={editingTaskId}
          completingTaskId={completingTaskId}
          onTaskClick={onTaskClick}
          onTaskBlur={onTaskBlur}
          onTaskKeyDown={onTaskKeyDown}
          onStartCompletion={onStartCompletion}
          onDeleteTask={onDeleteTask}
          getTaskItemStyles={getTaskItemStyles}
          onUndoCompletion={onUndoCompletion}
          onCompleteTask={onCompleteTask}
        />
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        <Link
          href="/completed-tasks"
          className="inline-flex items-center text-primary hover:text-primary/80 font-medium"
        >
          View completed tasks
        </Link>
      </div>
    </div>
  );
}
