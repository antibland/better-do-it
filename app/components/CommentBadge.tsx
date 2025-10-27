"use client";

import { MessageSquare } from "lucide-react";

interface CommentBadgeProps {
  commentCount: number;
  onClick: () => void;
}

export function CommentBadge({ commentCount, onClick }: CommentBadgeProps) {
  // Don't render if no comments
  if (commentCount === 0) {
    return null;
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevent task click events
        onClick();
      }}
      className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-all duration-200"
      aria-label={`${commentCount} unread ${commentCount === 1 ? "comment" : "comments"}`}
      title={`${commentCount} unread ${commentCount === 1 ? "comment" : "comments"}`}
    >
      <MessageSquare className="w-4 h-4" />
      <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-blue-600 rounded-full">
        {commentCount}
      </span>
    </button>
  );
}
