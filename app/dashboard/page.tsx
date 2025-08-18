"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Archive,
  Trash2,
  ArrowUpCircle,
  CheckCircle,
  RotateCcw,
} from "lucide-react";

// Types for our API responses
type Task = {
  id: string;
  userId: string;
  title: string;
  isCompleted: 0 | 1;
  isActive: 0 | 1;
  createdAt: string;
  completedAt: string | null;
  addedToActiveAt: string | null;
};

type Partner = {
  id: string;
  email: string;
  name: string;
  partnershipId: string;
  createdAt: string;
};

type TasksResponse = {
  tasks: Task[];
  activeTasks: Task[];
  masterTasks: Task[];
  openActiveTasks: Task[];
  completedThisWeek: number;
  needsTopOff: boolean;
};

type PartnerResponse = {
  partner: Partner | null;
};

type PartnerTasksResponse = {
  partner: {
    id: string;
    email: string;
    name: string;
  };
  tasks: Task[];
  completedThisWeek: number;
};

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
  const [isPunished, setIsPunished] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth");
    }
  }, [session, isPending, router]);

  // Load data on mount and when session changes
  useEffect(() => {
    if (session) {
      loadTasks();
      loadPartner();
    }
  }, [session]);

  // Load partner tasks when partner changes
  useEffect(() => {
    if (partner) {
      loadPartnerTasks();
    } else {
      setPartnerTasks(null);
    }
  }, [partner]);

  // Check punishment status when tasks change
  useEffect(() => {
    if (tasks) {
      // User is punished if they completed 0 tasks this week and have open active tasks
      setIsPunished(
        tasks.completedThisWeek === 0 && tasks.openActiveTasks.length > 0
      );
    }
  }, [tasks]);

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
      const shouldAddToActive = tasks && tasks.activeTasks.length < 3;

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

  const deleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadTasks();
      }
    } catch {
      setError("Failed to delete task");
    }
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

  const clearAllTasks = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL tasks? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/tasks", {
        method: "DELETE",
      });

      if (response.ok) {
        await loadTasks();
        setError(""); // Clear any existing errors
      } else {
        setError("Failed to clear all tasks");
      }
    } catch {
      setError("Failed to clear all tasks");
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
    router.push("/");
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to auth page
  }

  // Add loading state for tasks data
  if (!tasks) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Better Do It</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isPunished && (
                  <span
                    className="text-4xl"
                    title="You're marked for punishment! Complete a task this week to remove this."
                  >
                    🏓
                  </span>
                )}
                {session.user.image && (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={session.user.image}
                    alt={session.user.name || "User avatar"}
                  />
                )}
                <span className="text-gray-700">
                  Welcome, {session.user.name || session.user.email}!
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError("")}
                  className="text-red-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* My Tasks Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  My Tasks
                </h2>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    {tasks && (
                      <span>
                        {tasks.completedThisWeek} completed this week
                        {tasks.needsTopOff && (
                          <span className="ml-2 text-orange-600 font-medium">
                            • Top off needed!
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {tasks && tasks.tasks.length > 0 && (
                    <button
                      onClick={clearAllTasks}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                      title="Delete all tasks (open and completed)"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Add Task Form - Moved to top */}
              <form onSubmit={createTask} className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a new task..."
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !newTaskTitle.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    {loading ? "Adding..." : "Add"}
                  </button>
                </div>
              </form>

              {/* Unified Tasks List */}
              <div className="space-y-3">
                {/* Active Tasks Section */}
                {tasks?.activeTasks && tasks.activeTasks.length > 0 && (
                  <>
                    <div className="text-sm font-medium text-indigo-700 mb-2">
                      Active Tasks ({tasks.activeTasks.length}/3)
                    </div>
                    {tasks.activeTasks.map((task) => (
                      <div
                        key={task.id}
                        className="relative flex items-center justify-between p-3 border border-indigo-200 rounded-lg bg-indigo-50"
                      >
                        <div
                          data-task-id={task.id}
                          contentEditable={
                            editingTaskId === task.id && task.isCompleted === 0
                          }
                          suppressContentEditableWarning={true}
                          onClick={() =>
                            task.isCompleted === 0 && handleTaskClick(task.id)
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
                                onClick={() => toggleTaskActive(task.id, true)}
                                className="flex items-center justify-center w-10 h-10 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                                aria-label={`Archive task: ${task.title}`}
                                title={`Archive task: ${task.title}`}
                              >
                                <Archive className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => toggleTask(task.id)}
                                className="flex items-center justify-center w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200"
                                aria-label={`Complete task: ${task.title}`}
                                title={`Complete task: ${task.title}`}
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="flex items-center justify-center w-10 h-10 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                aria-label={`Delete task: ${task.title}`}
                                title={`Delete task: ${task.title}`}
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => toggleTask(task.id)}
                                className="flex items-center justify-center w-10 h-10 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors duration-200"
                                aria-label={`Mark task as incomplete: ${task.title}`}
                                title={`Mark task as incomplete: ${task.title}`}
                              >
                                <RotateCcw className="w-5 h-5" />
                              </button>
                              <span className="text-green-600 text-lg">✓</span>
                              <span className="text-sm text-gray-500">
                                {new Date(
                                  task.completedAt!
                                ).toLocaleDateString()}
                              </span>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="flex items-center justify-center w-10 h-10 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                aria-label={`Delete task: ${task.title}`}
                                title={`Delete task: ${task.title}`}
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Visual Separator */}
                {tasks?.activeTasks &&
                  tasks.activeTasks.length > 0 &&
                  tasks?.masterTasks &&
                  tasks.masterTasks.length > 0 && (
                    <div className="border-t border-gray-300 my-4"></div>
                  )}

                {/* Master Tasks Section */}
                {tasks?.masterTasks && tasks.masterTasks.length > 0 && (
                  <>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Master List ({tasks.masterTasks.length} tasks)
                    </div>
                    {tasks.masterTasks.map((task) => (
                      <div
                        key={task.id}
                        className="relative flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div
                          data-task-id={task.id}
                          contentEditable={
                            editingTaskId === task.id && task.isCompleted === 0
                          }
                          suppressContentEditableWarning={true}
                          onClick={() =>
                            task.isCompleted === 0 && handleTaskClick(task.id)
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
                          {tasks.activeTasks.length < 3 && (
                            <button
                              onClick={() => toggleTaskActive(task.id, false)}
                              className="flex items-center justify-center w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200"
                              aria-label={`Activate task: ${task.title}`}
                              title={`Activate task: ${task.title}`}
                            >
                              <ArrowUpCircle className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="flex items-center justify-center w-10 h-10 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            aria-label={`Delete task: ${task.title}`}
                            title={`Delete task: ${task.title}`}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Empty State */}
                {(!tasks ||
                  (tasks.activeTasks.length === 0 &&
                    tasks.masterTasks.length === 0)) && (
                  <p className="text-gray-500 text-center py-4">
                    No tasks yet. Add your first task above!
                  </p>
                )}
              </div>
            </div>

            {/* Partner Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Partner
              </h2>

              {partner ? (
                <div>
                  {/* Current Partner Info */}
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

                  {/* Partner's Weekly Info - Moved above tasks */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Partner&apos;s Week:</span>{" "}
                      {partnerTasks?.completedThisWeek || 0} completed this week
                    </div>
                  </div>

                  {/* Partner's Active Tasks Only */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">
                      Partner&apos;s Active Tasks
                    </h3>
                    <div className="space-y-2">
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
    </div>
  );
}
