import { Droppable } from "@hello-pangea/dnd";
import { Task } from "@/types";
import { TaskItem } from "./TaskItem";

interface TaskListProps {
  droppableId: string;
  tasks: Task[];
  title: string;
  isActiveList: boolean;
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
  commentCounts?: Record<string, number>;
  onCommentClick?: (taskId: string, taskTitle: string) => void;
}

export function TaskList({
  droppableId,
  tasks,
  title,
  isActiveList,
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
  commentCounts,
  onCommentClick,
}: TaskListProps) {
  return (
    <div>
      <div
        className={`text-sm font-medium mb-2 ${
          isActiveList ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {title}
      </div>
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`rounded-lg border-2 border-dashed ${
              snapshot.isDraggingOver
                ? tasks.length > 0
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 min-h-[120px]"
                  : "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                : "border-border bg-muted"
            } p-2`}
          >
            {tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    index={index}
                    isActiveTask={isActiveList}
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
                    commentCount={commentCounts?.[task.id]}
                    onCommentClick={onCommentClick}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-20 text-muted-foreground">
                <p>No {isActiveList ? "active" : "master"} tasks yet.</p>
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
