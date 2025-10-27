"use client";

import { MessageSquare } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface CommentButtonProps {
  taskId: string;
  hasComment: boolean;
  onClick: () => void;
}

export function CommentButton({ hasComment, onClick }: CommentButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevent task click events
        onClick();
      }}
      className={twMerge(
        "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
        hasComment
          ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      )}
      aria-label={hasComment ? "View or edit your comment" : "Add a comment"}
      title={hasComment ? "View or edit your comment" : "Add a comment"}
    >
      {hasComment ? (
        <MessageSquare className="w-4 h-4 fill-current" />
      ) : (
        <MessageSquare className="w-4 h-4" />
      )}
    </button>
  );
}
