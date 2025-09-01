import { Trash2, CheckCircle2 } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { Task } from "@/types";
import { TaskCompletionProgress } from "./TaskCompletionProgress";

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
          className={`${getTaskItemStyles(
            snapshot.isDragging,
            snapshot.draggingOver
          )} ${snapshot.isDragging ? "shadow-lg" : ""}`}
        >
          <div
            className={`flex-1 flex items-center justify-between p-3 border rounded-lg ${
              isActiveTask
                ? "border-indigo-200 bg-indigo-50"
                : "border-gray-200"
            }`}
          >
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
              className={`min-w-0 flex-1 ${
                task.isCompleted === 1
                  ? "text-gray-500 line-through"
                  : "text-gray-900"
              } ${
                editingTaskId === task.id
                  ? "outline-none border-b-2 border-indigo-500 bg-yellow-50 px-2 py-1 rounded"
                  : task.isCompleted === 0
                  ? `cursor-pointer hover:${
                      isActiveTask ? "bg-indigo-100" : "bg-gray-50"
                    } px-2 py-1 rounded`
                  : "px-2 py-1 rounded"
              }`}
            >
              {task.title}
            </div>
            <div className="flex items-center space-x-2 ml-4">
              {task.isCompleted === 0 ? (
                isActiveTask && (
                  <button
                    onClick={() => onStartCompletion(task.id)}
                    className="flex items-center justify-center w-10 h-10 text-green-600 hover:text-green-800 rounded-lg"
                    aria-label={`Complete task: ${task.title}`}
                    title={`Complete task: ${task.title}`}
                  >
                    <CheckCircle2 className="w-6 h-6" />
                  </button>
                )
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-green-600 text-lg">✓</span>
                  <span className="text-sm text-gray-500">
                    {new Date(task.completedAt!).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => onDeleteTask(task.id, task.title)}
            className="flex items-center justify-center px-4 text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-lg"
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
