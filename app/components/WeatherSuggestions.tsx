"use client";

import {
  useWeatherSuggestions,
  WeatherSuggestion,
} from "@/lib/hooks/useWeatherSuggestions";
import { TasksResponse } from "@/types";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import toast from "react-hot-toast";

interface WeatherSuggestionsProps {
  tasks: TasksResponse | null;
  onTaskActivated?: () => void;
}

type WeatherType = "hot" | "rain" | "cold" | "moderate";

const WEATHER_VIDEOS: Record<WeatherType, string> = {
  hot: "/videos/hot-weather.mp4",
  rain: "/videos/rain-weather.mp4",
  cold: "/videos/cold-snow-weather.mp4",
  moderate: "/videos/hot-weather.mp4",
} as const;

const CONTAINER_CLASSES = "w-full h-64 md:h-80 rounded-lg mb-0";

const taskButtonStyles = `
  .task-button .underline-svg {
    transform: translateY(4px);
    transition: transform 0.2s ease-out;
    transform-origin: bottom center;
  }
  .task-button:hover .underline-svg {
    transform: translateY(4px) scaleY(1.6);
  }
  .task-button .underline-svg path {
    transition: fill 0.2s ease-out;
  }
  .task-button:hover .underline-svg path {
    fill: var(--primary);
  }
`;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function MessageContent({
  message,
  onClick,
}: {
  message: string;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string>("");

  useEffect(() => {
    if (!contentRef.current || !message) return;
    if (message !== lastMessageRef.current) {
      lastMessageRef.current = message;
      contentRef.current.innerHTML = message;
    }
  }, [message]);

  return (
    <div
      ref={contentRef}
      className="text-white text-balance text-center text-xl md:text-2xl  font-medium leading-relaxed"
      onClick={onClick}
    />
  );
}

function StatusMessage({
  message,
  variant = "info",
}: {
  message: string;
  variant?: "info" | "error" | "warning";
}) {
  const variantClasses = {
    info: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
    error: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    warning:
      "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
  };

  return (
    <div
      className={`${CONTAINER_CLASSES} ${variantClasses[variant]} flex items-center justify-center p-4`}
    >
      <div className={variant === "info" ? "" : "text-sm"}>{message}</div>
    </div>
  );
}

export function WeatherSuggestions({
  tasks,
  onTaskActivated,
}: WeatherSuggestionsProps) {
  const { data, loading, error, shouldShow, apiError } =
    useWeatherSuggestions();
  const [activatingTaskId, setActivatingTaskId] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const lastRenderedKeyRef = useRef<string>("");

  const isDebugMode = process.env.NEXT_PUBLIC_WEATHER_ALWAYS_ON === "1";

  const handleTaskClick = useCallback(
    async (taskIdOrTitle: string, isNewTask: boolean) => {
      if (activatingTaskId) return;

      setActivatingTaskId(taskIdOrTitle);

      try {
        if (isNewTask) {
          if (!tasks) {
            toast.error("Unable to verify task status");
            return;
          }

          const existingTask =
            tasks.openActiveTasks.find(
              (t) => t.title.toLowerCase() === taskIdOrTitle.toLowerCase()
            ) ||
            tasks.masterTasks.find(
              (t) => t.title.toLowerCase() === taskIdOrTitle.toLowerCase()
            );

          if (existingTask) {
            const isAlreadyActive = tasks.openActiveTasks.some(
              (t) => t.id === existingTask.id
            );
            if (isAlreadyActive) {
              toast.success("Task is already active");
              return;
            }

            const activeCount = tasks.openActiveTasks.length || 0;
            if (activeCount >= 3) {
              toast.error(
                "Active task limit reached. Complete or remove a task to add this one."
              );
              return;
            }

            const sourceIndex =
              tasks.masterTasks.findIndex((t) => t.id === existingTask.id) ?? 0;
            const response = await fetch("/api/tasks/reorder", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sourceDroppableId: "master-tasks",
                destinationDroppableId: "active-tasks",
                sourceIndex,
                destinationIndex: activeCount,
                draggableId: existingTask.id,
              }),
            });

            if (response.ok) {
              toast.success("Task moved to active list");
              onTaskActivated?.();
            } else {
              const errorData = await response.json();
              toast.error(errorData.error || "Failed to activate task");
            }
          } else {
            const activeCount = tasks.openActiveTasks.length || 0;
            if (activeCount >= 3) {
              toast.error(
                "Active task limit reached. Complete or remove a task to add this one."
              );
              return;
            }

            const response = await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: taskIdOrTitle,
                isActive: true,
              }),
            });

            if (response.ok) {
              toast.success("Task created and added to active list");
              onTaskActivated?.();
            } else {
              const errorData = await response.json();
              toast.error(errorData.error || "Failed to create task");
            }
          }
        } else {
          const taskExists =
            tasks?.masterTasks.some((t) => t.id === taskIdOrTitle) ||
            tasks?.openActiveTasks.some((t) => t.id === taskIdOrTitle);
          if (!taskExists) {
            toast.error("Task not found");
            return;
          }

          const isAlreadyActive = tasks?.openActiveTasks.some(
            (t) => t.id === taskIdOrTitle
          );
          if (isAlreadyActive) {
            toast.success("Task is already active");
            return;
          }

          const activeCount = tasks?.openActiveTasks.length || 0;
          if (activeCount >= 3) {
            toast.error(
              "Active task limit reached. Complete or remove a task to add this one."
            );
            return;
          }

          const sourceIndex =
            tasks?.masterTasks.findIndex((t) => t.id === taskIdOrTitle) ?? 0;
          const response = await fetch("/api/tasks/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sourceDroppableId: "master-tasks",
              destinationDroppableId: "active-tasks",
              sourceIndex,
              destinationIndex: activeCount,
              draggableId: taskIdOrTitle,
            }),
          });

          if (response.ok) {
            toast.success("Task moved to active list");
            onTaskActivated?.();
          } else {
            const errorData = await response.json();
            toast.error(errorData.error || "Failed to activate task");
          }
        }
      } catch (error) {
        toast.error("Failed to activate task");
      } finally {
        setActivatingTaskId(null);
      }
    },
    [activatingTaskId, tasks, onTaskActivated]
  );

  const renderedMessage = useMemo(() => {
    if (!data) {
      return "";
    }

    const isNewTask = data.isNewTask || false;
    const validSuggestedTasks = isNewTask
      ? data.suggestedTasks
      : data.suggestedTasks.filter((suggestedTask) => {
          if (!tasks) return false;
          return (
            tasks.masterTasks.some((t) => t.id === suggestedTask.id) ||
            tasks.openActiveTasks.some((t) => t.id === suggestedTask.id)
          );
        });

    if (validSuggestedTasks.length === 0) {
      return data.message;
    }

    const activeCount = tasks?.openActiveTasks.length || 0;
    const isAtLimit = activeCount >= 3;

    const taskKey = validSuggestedTasks
      .map((t) => `${t.id || "new"}-${t.cleanedTitle}`)
      .sort()
      .join("|");
    const stableKey = `${data.message}|${taskKey}|${isNewTask}`;

    const message = validSuggestedTasks.reduce((msg, task) => {
      if (isNewTask) {
        if (!tasks) {
          return msg;
        }
        const existingTask =
          tasks.openActiveTasks.find(
            (t) => t.title.toLowerCase() === task.title.toLowerCase()
          ) ||
          tasks.masterTasks.find(
            (t) => t.title.toLowerCase() === task.title.toLowerCase()
          );
        const isActive = existingTask
          ? tasks.openActiveTasks.some((t) => t.id === existingTask.id)
          : false;
        const isMasterTask = existingTask
          ? tasks.masterTasks.some((t) => t.id === existingTask.id)
          : false;
        const shouldUnderline = !isActive && (!isAtLimit || !isMasterTask);
        const escapedTitle = escapeRegex(task.cleanedTitle);

        if (shouldUnderline) {
          const svgUnderline = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1213 73" preserveAspectRatio="none" class="absolute bottom-0 left-0 pointer-events-none underline-svg" style="z-index: 0; width: 100%; height: 8px;"><path d="M1212.41 5.51c3.05 12.87-22.36 11.93-30.26 15.68-94.32 20.51-269.09 32.42-365.48 37.51-77.91 3.82-155.66 9.93-233.67 11.67-57.49 2.56-115.05-.19-172.57 1.58-121.28.91-243.17 1.88-363.69-13.33-12.51-2.64-25.8-2.92-37.77-7.45-30.66-21.42 26.02-21.53 38.52-19.26 359.95 29.05 364.68 27.36 638.24 17.85 121-3.78 241.22-19.21 426.76-41.46 4.72-.65 9.18 3.56 8.45 8.36a941.74 941.74 0 0 0 54.29-9.21c9.33-2.33 18.7-4.56 27.95-7.19a7.59 7.59 0 0 1 9.23 5.24Z" fill="currentColor"></path></svg>`;
          const buttonHtml = `<button class="relative inline-block font-semibold cursor-pointer task-button" data-task-title="${task.title}" data-is-new-task="true" style="line-height: inherit;"><span class="relative z-10 inline-block">${task.cleanedTitle}</span>${svgUnderline}</button>`;

          if (msg.includes(`{${task.cleanedTitle}}`)) {
            const curlyPattern = new RegExp(`\\{${escapedTitle}\\}`, "gi");
            return msg.replace(curlyPattern, buttonHtml);
          }

          const directPattern = new RegExp(`\\b${escapedTitle}\\b`, "gi");
          if (directPattern.test(msg)) {
            directPattern.lastIndex = 0;
            return msg.replace(directPattern, buttonHtml);
          }

          const flexiblePattern = new RegExp(escapedTitle, "gi");
          if (flexiblePattern.test(msg)) {
            flexiblePattern.lastIndex = 0;
            return msg.replace(flexiblePattern, buttonHtml);
          }
        }
      } else {
        if (!tasks) return msg;
        const isActive = tasks.openActiveTasks.some((t) => t.id === task.id);
        const isMasterTask = tasks.masterTasks.some((t) => t.id === task.id);
        const shouldUnderline = !isActive && (!isAtLimit || !isMasterTask);

        const escapedTitle = escapeRegex(task.cleanedTitle);

        if (shouldUnderline) {
          const svgUnderline = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1213 73" preserveAspectRatio="none" class="absolute bottom-0 left-0 pointer-events-none underline-svg" style="z-index: 0; width: 100%; height: 8px;"><path d="M1212.41 5.51c3.05 12.87-22.36 11.93-30.26 15.68-94.32 20.51-269.09 32.42-365.48 37.51-77.91 3.82-155.66 9.93-233.67 11.67-57.49 2.56-115.05-.19-172.57 1.58-121.28.91-243.17 1.88-363.69-13.33-12.51-2.64-25.8-2.92-37.77-7.45-30.66-21.42 26.02-21.53 38.52-19.26 359.95 29.05 364.68 27.36 638.24 17.85 121-3.78 241.22-19.21 426.76-41.46 4.72-.65 9.18 3.56 8.45 8.36a941.74 941.74 0 0 0 54.29-9.21c9.33-2.33 18.7-4.56 27.95-7.19a7.59 7.59 0 0 1 9.23 5.24Z" fill="currentColor"></path></svg>`;
          const buttonHtml = `<button class="relative inline-block font-semibold cursor-pointer task-button" data-task-id="${task.id}" data-is-new-task="false" style="line-height: inherit;"><span class="relative z-10 inline-block">${task.cleanedTitle}</span>${svgUnderline}</button>`;

          if (msg.includes(`{${task.cleanedTitle}}`)) {
            const curlyPattern = new RegExp(`\\{${escapedTitle}\\}`, "gi");
            return msg.replace(curlyPattern, buttonHtml);
          }

          const directPattern = new RegExp(`\\b${escapedTitle}\\b`, "gi");
          if (directPattern.test(msg)) {
            directPattern.lastIndex = 0;
            return msg.replace(directPattern, buttonHtml);
          }

          const flexiblePattern = new RegExp(escapedTitle, "gi");
          if (flexiblePattern.test(msg)) {
            flexiblePattern.lastIndex = 0;
            return msg.replace(flexiblePattern, buttonHtml);
          }
        }
      }

      return msg;
    }, data.message);

    if (lastRenderedKeyRef.current !== stableKey) {
      lastRenderedKeyRef.current = stableKey;
    }

    return message;
  }, [
    data?.message,
    data?.isNewTask,
    data?.suggestedTasks
      ?.map((t) => `${t.id || "new"}-${t.cleanedTitle}`)
      .sort()
      .join("|"),
    tasks?.openActiveTasks.length,
    tasks?.masterTasks.length,
    tasks?.masterTasks.map((t) => t.id).join("|"),
    tasks?.openActiveTasks.map((t) => t.id).join("|"),
  ]);

  const videoPath = useMemo(() => {
    if (!data) return WEATHER_VIDEOS.rain;
    return WEATHER_VIDEOS[data.weatherType] || WEATHER_VIDEOS.rain;
  }, [data]);

  const handleMessageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      let element = e.target as HTMLElement;
      while (element && element !== e.currentTarget) {
        const isNewTask = element.dataset.isNewTask === "true";
        if (element.dataset.taskId) {
          e.preventDefault();
          e.stopPropagation();
          handleTaskClick(element.dataset.taskId, false);
          return;
        } else if (element.dataset.taskTitle && isNewTask) {
          e.preventDefault();
          e.stopPropagation();
          handleTaskClick(element.dataset.taskTitle, true);
          return;
        }
        element = element.parentElement as HTMLElement;
      }
    },
    [handleTaskClick]
  );

  if (loading) {
    return <StatusMessage message="Loading weather suggestions..." />;
  }

  if (error) {
    return <StatusMessage message={`Error: ${error}`} variant="error" />;
  }

  if (apiError && isDebugMode) {
    return (
      <StatusMessage message={`Weather API: ${apiError}`} variant="warning" />
    );
  }

  if (!shouldShow || !data) {
    return null;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: taskButtonStyles }} />
      <div
        className={`relative ${CONTAINER_CLASSES} overflow-hidden shadow-lg`}
      >
        {!videoError && (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => {
              setVideoError(true);
            }}
          >
            <source src={videoPath} type="video/mp4" />
          </video>
        )}

        {videoError && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-primary/50" />
        )}

        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 h-full flex items-center justify-center p-6 md:p-8">
          <div className="max-w-3xl w-full">
            <MessageContent
              message={renderedMessage}
              onClick={handleMessageClick}
            />
          </div>
        </div>

        {activatingTaskId && (
          <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center">
            <div className="text-white text-sm">Activating task...</div>
          </div>
        )}
      </div>
    </>
  );
}
