"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { DashboardSkeleton } from "@/app/components/DashboardSkeleton";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { ErrorDisplay } from "@/app/components/ErrorDisplay";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { TasksSection } from "@/app/components/TasksSection";
import { PartnerSection } from "@/app/components/PartnerSection";
import {
  TasksResponse,
  Partner,
  PartnerResponse,
  PartnerTasksResponse,
} from "@/types";

export default function Dashboard() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // State for tasks and partner data
  const [tasks, setTasks] = useState<TasksResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [partnerTasks, setPartnerTasks] = useState<PartnerTasksResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Task completion animation states
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // Delete confirmation state
  const [taskToDelete, setTaskToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Partner unpair confirmation state
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);

  useEffect(
    function redirectUnauthenticatedUsers() {
      if (!isPending && !session) {
        router.replace("/auth");
      }
    },
    [session, isPending, router]
  );

  useEffect(
    function loadUserData() {
      if (session) {
        loadTasks();
        loadPartner();
      }
    },
    [session]
  );

  useEffect(
    function loadPartnerData() {
      if (partner) {
        loadPartnerTasks();
      } else {
        setPartnerTasks(null);
      }
    },
    [partner]
  );

  const loadTasks = async () => {
    // Don't load tasks if we're currently dragging
    if (isDragging) {
      return;
    }

    try {
      const response = await fetch("/api/tasks");
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        setError("Failed to load tasks");
      }
    } catch {
      setError("Failed to load tasks");
    }
  };

  const loadPartner = async () => {
    try {
      const response = await fetch("/api/partner");
      if (response.ok) {
        const data: PartnerResponse = await response.json();
        setPartner(data.partner);
      }
    } catch {
      // Partner loading errors are not critical
    }
  };

  const loadPartnerTasks = async () => {
    try {
      const response = await fetch("/api/partner/tasks");
      if (response.ok) {
        const data = await response.json();
        setPartnerTasks(data);
      }
    } catch {
      // Partner tasks loading errors are not critical
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setLoading(true);
    try {
      // Check if we should add to active list (if user has less than 3 active tasks)
      const shouldAddToActive = tasks && tasks.openActiveTasks.length < 3;

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          isActive: shouldAddToActive,
        }),
      });

      if (response.ok) {
        setNewTaskTitle("");
        await loadTasks();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create task");
      }
    } catch {
      setError("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const startTaskCompletion = (taskId: string) => {
    // Start the completion animation process
    setCompletingTaskId(taskId);
  };

  const undoTaskCompletion = (taskId: string) => {
    // User clicked the progress bar to undo - cancel the completion
    setCompletingTaskId(null);
  };

  const finalizeTaskCompletion = async (taskId: string) => {
    // Animation completed - actually mark the task as completed
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: true }),
      });

      if (response.ok) {
        setCompletingTaskId(null);
        await loadTasks();
        if (partner) {
          await loadPartnerTasks();
        }
      } else {
        setError("Failed to complete task");
        setCompletingTaskId(null);
      }
    } catch {
      setError("Failed to complete task");
      setCompletingTaskId(null);
    }
  };

  const deleteTask = async (taskId: string, taskTitle: string) => {
    setTaskToDelete({ id: taskId, title: taskTitle });
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      const response = await fetch(`/api/tasks/${taskToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadTasks();
      }
    } catch {
      setError("Failed to delete task");
    } finally {
      setTaskToDelete(null);
    }
  };

  const cancelDeleteTask = () => {
    setTaskToDelete(null);
  };

  const updateTaskTitle = async (taskId: string, newTitle: string) => {
    if (!newTitle.trim()) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (response.ok) {
        await loadTasks();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update task");
      }
    } catch {
      setError("Failed to update task");
    }
  };

  const handleTaskClick = (taskId: string) => {
    setEditingTaskId(taskId);
    // Select all text when entering edit mode
    setTimeout(() => {
      const element = document.querySelector(
        `[data-task-id="${taskId}"]`
      ) as HTMLElement;
      if (element) {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }, 0);
  };

  const handleTaskBlur = (taskId: string, currentTitle: string) => {
    setEditingTaskId(null);
    updateTaskTitle(taskId, currentTitle);
  };

  const handleTaskKeyDown = (
    e: React.KeyboardEvent,
    taskId: string,
    currentTitle: string
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setEditingTaskId(null);
      updateTaskTitle(taskId, currentTitle);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingTaskId(null);
      // Reset the content to original title
      const element = e.target as HTMLElement;
      if (element) {
        element.textContent = currentTitle;
      }
    }
  };

  const pairWithPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerEmail.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: partnerEmail.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setPartner(data.partner);
        setPartnerEmail("");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to pair with partner");
      }
    } catch {
      setError("Failed to pair with partner");
    } finally {
      setLoading(false);
    }
  };

  const unpairPartner = async () => {
    setShowUnpairConfirm(true);
  };

  const confirmUnpairPartner = async () => {
    try {
      const response = await fetch("/api/partner", {
        method: "DELETE",
      });

      if (response.ok) {
        setPartner(null);
        setPartnerTasks(null);
      }
    } catch {
      setError("Failed to unpair from partner");
    } finally {
      setShowUnpairConfirm(false);
    }
  };

  const cancelUnpairPartner = () => {
    setShowUnpairConfirm(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  // Drag and drop handlers
  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = async (result: DropResult) => {
    setIsDragging(false);

    const { source, destination, draggableId } = result;

    // If dropped outside a valid droppable area
    if (!destination) {
      return;
    }

    // If dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Validate the move before proceeding
    if (tasks) {
      // Check if moving to active tasks would exceed the limit
      if (
        destination.droppableId === "active-tasks" &&
        source.droppableId !== "active-tasks"
      ) {
        const currentActiveCount = tasks.openActiveTasks.length;
        if (currentActiveCount >= 3) {
          // Reject the move - don't update state
          setError(
            "Active task limit reached: you can only have 3 active tasks at a time"
          );
          return;
        }
      }

      // Store the original state for potential rollback
      const originalTasks = { ...tasks };
      let movedTask;

      // Remove from source
      if (source.droppableId === "active-tasks") {
        movedTask = originalTasks.openActiveTasks.splice(source.index, 1)[0];
      } else {
        movedTask = originalTasks.masterTasks.splice(source.index, 1)[0];
      }

      // Add to destination
      if (movedTask) {
        if (destination.droppableId === "active-tasks") {
          originalTasks.openActiveTasks.splice(destination.index, 0, movedTask);
        } else {
          originalTasks.masterTasks.splice(destination.index, 0, movedTask);
        }
      }

      // Update server first, then update UI only on success
      try {
        const response = await fetch("/api/tasks/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceDroppableId: source.droppableId,
            destinationDroppableId: destination.droppableId,
            sourceIndex: source.index,
            destinationIndex: destination.index,
            draggableId: draggableId,
          }),
        });

        if (response.ok) {
          // Server update succeeded - update the UI state
          setTasks(originalTasks);
          setError(""); // Clear any previous errors
        } else {
          // Server update failed - show error and reload tasks to get correct state
          const errorData = await response.json();
          setError(errorData.error || "Failed to save task order");

          // Reload tasks from server to ensure UI matches database state
          await loadTasks();
        }
      } catch (error) {
        // Network or other error - show error and reload tasks
        console.error("Failed to update server:", error);
        setError("Failed to save task order - network error");

        // Reload tasks from server to ensure UI matches database state
        await loadTasks();
      }
    }
  };

  // Helper function to get task item styles
  const getTaskItemStyles = (isDragging: boolean) => {
    const baseStyles = "flex items-stretch space-x-2";

    if (isDragging) {
      return `${baseStyles} opacity-50`;
    }

    return baseStyles;
  };

  if (isPending) {
    return <DashboardSkeleton />;
  }

  if (!session) {
    return null;
  }

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader onSignOut={handleSignOut} />

        <ErrorDisplay error={error} onClear={() => setError("")} />

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <TasksSection
                tasks={tasks}
                newTaskTitle={newTaskTitle}
                loading={loading}
                editingTaskId={editingTaskId}
                completingTaskId={completingTaskId}
                onNewTaskTitleChange={setNewTaskTitle}
                onCreateTask={createTask}
                onTaskClick={handleTaskClick}
                onTaskBlur={handleTaskBlur}
                onTaskKeyDown={handleTaskKeyDown}
                onStartCompletion={startTaskCompletion}
                onDeleteTask={deleteTask}
                getTaskItemStyles={getTaskItemStyles}
                onUndoCompletion={undoTaskCompletion}
                onCompleteTask={finalizeTaskCompletion}
              />

              <PartnerSection
                partner={partner}
                partnerTasks={partnerTasks}
                partnerEmail={partnerEmail}
                loading={loading}
                onPartnerEmailChange={setPartnerEmail}
                onPairWithPartner={pairWithPartner}
                onUnpairPartner={unpairPartner}
              />
            </div>
          </div>
        </main>

        <ConfirmDialog
          isOpen={!!taskToDelete}
          onConfirm={confirmDeleteTask}
          onCancel={cancelDeleteTask}
          title="Delete Task"
          message={`Are you sure you want to delete "${taskToDelete?.title}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
        />

        <ConfirmDialog
          isOpen={showUnpairConfirm}
          onConfirm={confirmUnpairPartner}
          onCancel={cancelUnpairPartner}
          title="Unpair Partner"
          message="Are you sure you want to unpair from your partner? This action cannot be undone."
          confirmText="Unpair"
          cancelText="Cancel"
          confirmVariant="danger"
        />
      </div>
    </DragDropContext>
  );
}
