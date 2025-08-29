"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trash2,
  ArrowUpCircle,
  CheckCircle2,
  RotateCcw,
  ArrowDownCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { DashboardSkeleton } from "@/app/components/DashboardSkeleton";
import { TaskCompletionProgress } from "@/app/components/TaskCompletionProgress";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { ErrorDisplay } from "@/app/components/ErrorDisplay";
import { AddTaskForm } from "@/app/components/AddTaskForm";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
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

  const toggleTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggle: true }),
      });

      if (response.ok) {
        await loadTasks();
        if (partner) {
          await loadPartnerTasks();
        }
      }
    } catch {
      setError("Failed to update task");
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

  const toggleTaskActive = async (taskId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
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

  // Removed clearAllTasks function - no longer needed as we removed the "Clear All" functionality
  // This prevents accidental deletion of all user tasks

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
    if (!confirm("Are you sure you want to unpair from your partner?")) return;

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
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  if (isPending) {
    return <DashboardSkeleton />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader onSignOut={handleSignOut} />

      <ErrorDisplay error={error} onClear={() => setError("")} />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  My Tasks
                </h2>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    {tasks && (
                      <span>{tasks.completedThisWeek} completed this week</span>
                    )}
                  </div>
                </div>
              </div>

              <AddTaskForm
                newTaskTitle={newTaskTitle}
                loading={loading}
                onTitleChange={setNewTaskTitle}
                onSubmit={createTask}
              />

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-indigo-700 mb-2">
                    Active Tasks ({tasks?.openActiveTasks?.length || 0}/3)
                  </div>
                  {tasks?.openActiveTasks &&
                  tasks.openActiveTasks.length > 0 ? (
                    <div className="space-y-2">
                      {tasks.openActiveTasks.map((task) => {
                        if (completingTaskId === task.id) {
                          return (
                            <TaskCompletionProgress
                              key={task.id}
                              taskId={task.id}
                              taskTitle={task.title}
                              onUndo={undoTaskCompletion}
                              onComplete={finalizeTaskCompletion}
                            />
                          );
                        }

                        return (
                          <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex items-stretch space-x-2"
                          >
                            <div className="flex-1 flex items-center justify-between p-3 border border-indigo-200 rounded-lg bg-indigo-50">
                              <div
                                data-task-id={task.id}
                                contentEditable={
                                  editingTaskId === task.id &&
                                  task.isCompleted === 0
                                }
                                suppressContentEditableWarning={true}
                                onClick={() =>
                                  task.isCompleted === 0 &&
                                  handleTaskClick(task.id)
                                }
                                onBlur={(e) =>
                                  task.isCompleted === 0 &&
                                  handleTaskBlur(
                                    task.id,
                                    e.currentTarget.textContent || task.title
                                  )
                                }
                                onKeyDown={(e) =>
                                  task.isCompleted === 0 &&
                                  handleTaskKeyDown(
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
                                    ? "cursor-pointer hover:bg-indigo-100 px-2 py-1 rounded"
                                    : "px-2 py-1 rounded"
                                }`}
                              >
                                {task.title}
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                {task.isCompleted === 0 ? (
                                  <>
                                    <button
                                      onClick={() =>
                                        startTaskCompletion(task.id)
                                      }
                                      className="flex items-center justify-center w-10 h-10 text-green-600 hover:text-green-800 rounded-lg transition-colors duration-200"
                                      aria-label={`Complete task: ${task.title}`}
                                      title={`Complete task: ${task.title}`}
                                    >
                                      <CheckCircle2 className="w-6 h-6" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        toggleTaskActive(task.id, true)
                                      }
                                      className="flex items-center justify-center w-10 h-10 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                                      aria-label={`Archive task: ${task.title}`}
                                      title={`Archive task: ${task.title}`}
                                    >
                                      <ArrowDownCircle className="w-6 h-6" />
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex items-center space-x-3">
                                    <button
                                      onClick={() => toggleTask(task.id)}
                                      className="flex items-center justify-center w-10 h-10 text-orange-600 hover:text-orange-800 rounded-lg transition-colors duration-200"
                                      aria-label={`Mark task as incomplete: ${task.title}`}
                                      title={`Mark task as incomplete: ${task.title}`}
                                    >
                                      <RotateCcw className="w-5 h-5" />
                                    </button>
                                    <span className="text-green-600 text-lg">
                                      ✓
                                    </span>
                                    <span className="text-sm text-gray-500">
                                      {new Date(
                                        task.completedAt!
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteTask(task.id, task.title)}
                              className="flex items-center justify-center px-4 text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-lg transition-colors duration-200"
                              aria-label={`Delete task: ${task.title}`}
                              title={`Delete task: ${task.title}`}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No active tasks yet.
                    </p>
                  )}
                </div>

                {tasks?.openActiveTasks &&
                  tasks.openActiveTasks.length > 0 &&
                  tasks?.masterTasks &&
                  tasks.masterTasks.length > 0 && (
                    <div className="border-t border-gray-300 my-4"></div>
                  )}

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Master List ({tasks?.masterTasks?.length || 0} tasks)
                  </div>
                  {tasks?.masterTasks && tasks.masterTasks.length > 0 ? (
                    <div className="space-y-2">
                      {tasks.masterTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-stretch space-x-2"
                        >
                          <div className="flex-1 flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div
                              data-task-id={task.id}
                              contentEditable={
                                editingTaskId === task.id &&
                                task.isCompleted === 0
                              }
                              suppressContentEditableWarning={true}
                              onClick={() =>
                                task.isCompleted === 0 &&
                                handleTaskClick(task.id)
                              }
                              onBlur={(e) =>
                                task.isCompleted === 0 &&
                                handleTaskBlur(
                                  task.id,
                                  e.currentTarget.textContent || task.title
                                )
                              }
                              onKeyDown={(e) =>
                                task.isCompleted === 0 &&
                                handleTaskKeyDown(
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
                                  ? "cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                                  : "px-2 py-1 rounded"
                              }`}
                            >
                              {task.title}
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              {tasks.openActiveTasks.length < 3 && (
                                <button
                                  onClick={() =>
                                    toggleTaskActive(task.id, false)
                                  }
                                  className="flex items-center justify-center w-10 h-10 text-indigo-600 hover:text-indigo-800  rounded-lg transition-colors duration-200"
                                  aria-label={`Activate task: ${task.title}`}
                                  title={`Activate task: ${task.title}`}
                                >
                                  <ArrowUpCircle className="w-6 h-6" />
                                </button>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteTask(task.id, task.title)}
                            className="flex items-center justify-center px-4 text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-lg transition-colors duration-200"
                            aria-label={`Delete task: ${task.title}`}
                            title={`Delete task: ${task.title}`}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No master tasks yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <Link
                  href="/completed-tasks"
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-200"
                >
                  View completed tasks
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Partner
              </h2>

              {partner ? (
                <div>
                  <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
                    <h3 className="font-medium text-indigo-900 mb-2">
                      Partnered with: {partner.name} ({partner.email})
                    </h3>
                    <p className="text-sm text-indigo-700">
                      Since: {new Date(partner.createdAt).toLocaleDateString()}
                    </p>
                    <button
                      onClick={unpairPartner}
                      className="mt-2 text-sm text-red-600 hover:text-red-800"
                    >
                      Unpair
                    </button>
                  </div>

                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Partner&apos;s Week:</span>{" "}
                      {partnerTasks?.completedThisWeek || 0} completed this week
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">
                      Partner&apos;s Tasks
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Shows both active and recently completed tasks
                    </p>
                    <div className="space-y-3">
                      {partnerTasks?.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-center space-x-3 p-3 border border-gray-200 rounded-lg ${
                            task.isCompleted === 1
                              ? "bg-green-50"
                              : "bg-gray-50"
                          }`}
                        >
                          <div className="w-5 h-5 border-2 border-gray-300 rounded bg-gray-200 flex items-center justify-center">
                            {task.isCompleted === 1 ? (
                              <span className="text-green-600 text-xs">✓</span>
                            ) : (
                              <span className="text-gray-400 text-xs">👁</span>
                            )}
                          </div>
                          <span
                            className={`${
                              task.isCompleted === 1
                                ? "text-gray-500 line-through"
                                : "text-gray-700"
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.isCompleted === 1 && (
                            <span className="text-xs text-gray-500 ml-auto">
                              {new Date(task.completedAt!).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                      {(!partnerTasks || partnerTasks.tasks.length === 0) && (
                        <p className="text-gray-500 text-center py-4">
                          No tasks
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4">
                    Find a partner to collaborate on tasks together.
                  </p>
                  <form onSubmit={pairWithPartner}>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={partnerEmail}
                        onChange={(e) => setPartnerEmail(e.target.value)}
                        placeholder="Partner's email address..."
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={loading}
                      />
                      <button
                        type="submit"
                        disabled={loading || !partnerEmail.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                      >
                        {loading ? "Pairing..." : "Pair"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
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
    </div>
  );
}
