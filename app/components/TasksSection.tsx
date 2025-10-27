"use client";

import Link from "next/link";
import { TasksResponse } from "@/types";
import { AddTaskForm } from "./AddTaskForm";
import { TaskList } from "./TaskList";
import { CommentDialog } from "./CommentDialog";
import { useState, useEffect } from "react";

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
  onRefreshTasks?: () => void;
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
  onRefreshTasks,
}: TasksSectionProps) {
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [taskCommentCounts, setTaskCommentCounts] = useState<
    Record<string, number>
  >({});

  const fetchCommentCounts = async () => {
    if (!tasks || !tasks.openActiveTasks) return;

    const counts: Record<string, number> = {};

    for (const task of tasks.openActiveTasks) {
      try {
        const response = await fetch(`/api/comments?taskId=${task.id}`);
        if (response.ok) {
          const data = await response.json();
          counts[task.id] = data.comments?.length || 0;
        }
      } catch (error) {
        console.error("Error fetching comment count:", error);
      }
    }

    setTaskCommentCounts(counts);
  };

  useEffect(() => {
    fetchCommentCounts();
  }, [tasks]);

  const handleCommentClick = (taskId: string, taskTitle: string) => {
    setSelectedTask({ id: taskId, title: taskTitle });
    setCommentDialogOpen(true);
  };

  const handleCommentDialogClose = () => {
    setCommentDialogOpen(false);
    setSelectedTask(null);
  };

  const handleCommentRefresh = () => {
    fetchCommentCounts();
    if (onRefreshTasks) {
      onRefreshTasks();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow px-2 py-6 md:px-6">
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
          commentCounts={taskCommentCounts}
          onCommentClick={handleCommentClick}
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

      {selectedTask && (
        <CommentDialog
          taskId={selectedTask.id}
          taskTitle={selectedTask.title}
          isOpen={commentDialogOpen}
          onClose={handleCommentDialogClose}
          isTaskOwner={true}
          onRefresh={handleCommentRefresh}
        />
      )}
    </div>
  );
}
