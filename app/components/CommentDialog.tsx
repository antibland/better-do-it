"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { CommentWithAuthor } from "@/types/comment";
import { ConfirmDialog } from "./ConfirmDialog";
import { twMerge } from "tailwind-merge";

interface CommentDialogProps {
  taskId: string;
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
  isTaskOwner: boolean;
  onRefresh: () => void;
}

export function CommentDialog({
  taskId,
  taskTitle,
  isOpen,
  onClose,
  isTaskOwner,
  onRefresh,
}: CommentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchComments();
    }
  }, [isOpen, taskId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
      setEditMode(false);
      setEditContent("");
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (e: MouseEvent) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;

      if (!isInDialog) {
        onClose();
      }
    };

    dialog.addEventListener("click", handleBackdropClick);
    return () => dialog.removeEventListener("click", handleBackdropClick);
  }, [onClose]);

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/comments?taskId=${taskId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }
      const data = await response.json();
      setComments(data.comments || []);

      if (!isTaskOwner && data.comments.length > 0) {
        setEditContent(data.comments[0].content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark comment as read");
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onRefresh();

      if (comments.length === 1) {
        setTimeout(() => onClose(), 300);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as read");
    }
  };

  const handleSave = async () => {
    const trimmedContent = editContent.trim();
    if (!trimmedContent || trimmedContent.length > 500) return;

    setSaving(true);
    setError(null);

    try {
      const existingComment = comments[0];

      if (existingComment) {
        const response = await fetch(`/api/comments/${existingComment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmedContent }),
        });

        if (!response.ok) {
          throw new Error("Failed to update comment");
        }
      } else {
        const response = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, content: trimmedContent }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create comment");
        }
      }

      await fetchComments();
      setEditMode(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save comment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!commentToDelete) return;

    try {
      const response = await fetch(`/api/comments/${commentToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      setComments([]);
      setEditContent("");
      setDeleteConfirmOpen(false);
      setCommentToDelete(null);
      onRefresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment");
      setDeleteConfirmOpen(false);
    }
  };

  const renderTaskOwnerView = () => (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
      {comments.map((comment) => (
        <motion.div
          key={comment.id}
          initial={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 bg-muted rounded-lg space-y-2"
        >
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
              {comment.authorName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-foreground">
                {comment.authorName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
          <p className="text-foreground whitespace-pre-wrap">
            {comment.content}
          </p>
          <button
            onClick={() => handleMarkAsRead(comment.id)}
            className="w-full mt-2 px-3 py-2 text-sm bg-primary hover:bg-primary/90 text-white rounded-md transition-colors"
          >
            Mark as Read
          </button>
        </motion.div>
      ))}
    </div>
  );

  const renderAuthorView = () => {
    const hasComment = comments.length > 0;
    const isCreating = !hasComment;

    if (editMode || isCreating) {
      return (
        <div className="space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Write an encouraging comment..."
            className="w-full min-h-[120px] p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none dark:text-white"
            maxLength={500}
            autoFocus
          />
            <div className="flex items-center justify-between text-sm">
              <span
                className={twMerge(
                  editContent.length > 450 ? "text-red-600" : "text-muted-foreground"
                )}
              >
              {editContent.length}/500 characters
            </span>
          </div>
          <div className="flex justify-end space-x-2">
            {!isCreating && (
              <button
                onClick={() => {
                  setEditMode(false);
                  setEditContent(comments[0].content);
                }}
                disabled={saving}
                className="px-4 py-2 text-muted-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={
                saving || !editContent.trim() || editContent.length > 500
              }
              className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted text-white rounded-md transition-colors"
            >
              {saving ? "Saving..." : isCreating ? "Submit" : "Save"}
            </button>
          </div>
        </div>
      );
    }

    // View mode
    return (
      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-foreground whitespace-pre-wrap">
            {comments[0].content}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {formatDistanceToNow(new Date(comments[0].createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => {
              setCommentToDelete(comments[0].id);
              setDeleteConfirmOpen(true);
            }}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => setEditMode(true)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors"
          >
            Edit
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <dialog
            ref={dialogRef}
            className="backdrop:bg-gray-500/20 backdrop:backdrop-blur-sm p-0 rounded-lg shadow-xl border border-border bg-card max-w-lg w-full fixed top-1/2 inset-x-4 mx-auto transform -translate-y-1/2"
            onCancel={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="p-6"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-card-foreground mb-1">
                  {isTaskOwner ? "Comments on:" : "Your comment on:"}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {taskTitle}
                </p>
              </div>

              {loading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading...
                </div>
              ) : error ? (
                <div className="py-4 text-center text-red-600">{error}</div>
              ) : isTaskOwner ? (
                comments.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No comments yet
                  </div>
                ) : (
                  renderTaskOwnerView()
                )
              ) : (
                renderAuthorView()
              )}
            </motion.div>
          </dialog>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setCommentToDelete(null);
        }}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </>
  );
}
