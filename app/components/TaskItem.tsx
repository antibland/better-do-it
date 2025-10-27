import { Trash2, CheckCircle2, GripVertical } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { Task } from "@/types";
import { TaskCompletionProgress } from "./TaskCompletionProgress";
import { TaskAgeIcon } from "./TaskAgeIcon";
import { CommentBadge } from "./CommentBadge";
import { twMerge } from "tailwind-merge";

interface TaskItemProps {
  task: Task;
  index: number;
  isActiveTask: boolean;
  editingTaskId: string | null;
  completingTaskId: string | null;
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
  commentCount?: number;
  onCommentClick?: (taskId: string, taskTitle: string) => void;
}

export function TaskItem({
  task,
  index,
  isActiveTask,
  editingTaskId,
  completingTaskId,
  onTaskClick,
  onTaskBlur,
  onTaskKeyDown,
  onStartCompletion,
  onDeleteTask,
  getTaskItemStyles,
  onUndoCompletion,
  onCompleteTask,
  commentCount,
  onCommentClick,
}: TaskItemProps) {
  if (completingTaskId === task.id) {
    return (
      <TaskCompletionProgress
        taskId={task.id}
        taskTitle={task.title}
        onUndo={() => onUndoCompletion(task.id)}
        onComplete={() => onCompleteTask(task.id)}
      />
    );
  }

  return (
    <Draggable key={task.id} draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={twMerge(
            getTaskItemStyles(snapshot.isDragging, snapshot.draggingOver),
            snapshot.isDragging && "shadow-lg"
          )}
        >
          <div
            className={twMerge(
              "flex-1 flex items-center justify-between p-3 border rounded-lg",
              isActiveTask
                ? "border-primary/30 dark:border-primary/30 bg-primary/10 dark:bg-primary/10"
                : "border-border"
            )}
          >
            <div
              className="hidden md:flex items-center justify-center w-6 h-6 text-muted-foreground mr-3 flex-shrink-0"
              aria-label="Drag to reorder"
              title="Drag to reorder"
            >
              <GripVertical className="w-5 h-5" />
            </div>

            <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
              <TaskAgeIcon
                addedToActiveAt={task.addedToActiveAt}
                createdAt={task.createdAt}
              />
            </div>

            <div
              data-task-id={task.id}
              contentEditable={
                editingTaskId === task.id && task.isCompleted === 0
              }
              suppressContentEditableWarning={true}
              onClick={() => task.isCompleted === 0 && onTaskClick(task.id)}
              onBlur={(e) =>
                task.isCompleted === 0 &&
                onTaskBlur(task.id, e.currentTarget.textContent || task.title)
              }
              onKeyDown={(e) =>
                task.isCompleted === 0 &&
                onTaskKeyDown(
                  e,
                  task.id,
                  e.currentTarget.textContent || task.title
                )
              }
              className={twMerge(
                "min-w-0 flex-1",
                task.isCompleted === 1
                  ? "text-muted-foreground line-through"
                  : "text-foreground",
                editingTaskId === task.id
                  ? "outline-none border-b-2 border-primary bg-yellow-50 dark:bg-yellow-950/20 px-2 py-1 rounded"
                  : task.isCompleted === 0
                    ? `cursor-pointer hover:${
                        isActiveTask
                          ? "bg-primary/20 dark:bg-primary/20"
                          : "bg-muted"
                      } px-2 py-1 rounded`
                    : "px-2 py-1 rounded",
                "bg-transparent dark:bg-transparent"
              )}
            >
              {task.title}
            </div>
            <div className="flex items-center space-x-2 ml-4">
              {task.isCompleted === 0 ? (
                <>
                  {commentCount !== undefined &&
                    commentCount > 0 &&
                    onCommentClick && (
                      <CommentBadge
                        commentCount={commentCount}
                        onClick={() => onCommentClick(task.id, task.title)}
                      />
                    )}
                  {isActiveTask && (
                    <button
                      onClick={() => onStartCompletion(task.id)}
                      className="flex items-center justify-center w-10 h-10 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 rounded-lg"
                      aria-label={`Complete task: ${task.title}`}
                      title={`Complete task: ${task.title}`}
                    >
                      <CheckCircle2 className="w-6 h-6" />
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-green-600 dark:text-green-400 text-lg">
                    ✓
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(task.completedAt!).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => onDeleteTask(task.id, task.title)}
            className="flex items-center justify-center px-4 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-gray-600 rounded-lg transition-colors duration-200"
            aria-label={`Delete task: ${task.title}`}
            title={`Delete task: ${task.title}`}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}
    </Draggable>
  );
}
