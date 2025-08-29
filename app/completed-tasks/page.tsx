"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { CompletedTasksSkeleton } from "@/app/components/CompletedTasksSkeleton";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { Task, CompletedTasksResponse } from "@/types";

export default function CompletedTasks() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // State for completed tasks
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    function loadCompletedTasksData() {
      if (session) {
        loadCompletedTasks();
      }
    },
    [session]
  );

  const loadCompletedTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tasks/completed");
      if (response.ok) {
        const data: CompletedTasksResponse = await response.json();
        setCompletedTasks(data.tasks);
      } else {
        setError("Failed to load completed tasks");
      }
    } catch {
      setError("Failed to load completed tasks");
    } finally {
      setLoading(false);
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
        // Remove the task from the local state
        setCompletedTasks((prev) =>
          prev.filter((task) => task.id !== taskToDelete.id)
        );
      } else {
        setError("Failed to delete task");
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

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  if (isPending) {
    return <CompletedTasksSkeleton />;
  }

  if (!session) {
    return null; // Will redirect to auth page
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader onSignOut={handleSignOut} />

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
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Completed Tasks ({completedTasks.length})
              </h2>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex-1">
                      <Skeleton width="70%" height={20} className="mb-2" />
                      <Skeleton width="40%" height={16} />
                    </div>
                    <Skeleton width={60} height={40} className="ml-4" />
                  </div>
                ))}
              </div>
            )}

            {/* Completed Tasks List */}
            {!loading && (
              <div className="space-y-3">
                {completedTasks.length > 0 ? (
                  completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="text-gray-900 font-medium">
                          {task.title}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Completed on{" "}
                          {new Date(task.completedAt!).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTask(task.id, task.title)}
                        className="flex items-center justify-center px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-lg transition-colors duration-200 ml-4"
                        aria-label={`Delete completed task: ${task.title}`}
                        title={`Delete completed task: ${task.title}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No completed tasks yet. Complete some tasks to see them
                      here!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Back to Dashboard Link - positioned inside the main content box */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <Link
                href="/dashboard"
                className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>

      <ConfirmDialog
        isOpen={!!taskToDelete}
        onConfirm={confirmDeleteTask}
        onCancel={cancelDeleteTask}
        title="Delete Completed Task"
        message={`Are you sure you want to delete "${taskToDelete?.title}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
}
