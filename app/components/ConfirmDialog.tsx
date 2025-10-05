"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "danger" | "primary";
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "primary",
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(
    function handleDialogOpenClose() {
      const dialog = dialogRef.current;
      if (!dialog) return;

      if (isOpen) {
        dialog.showModal();
        setTimeout(() => {
          confirmButtonRef.current?.focus();
        }, 100);
      } else {
        dialog.close();
      }
    },
    [isOpen]
  );

  useEffect(
    function handleEscapeKeyAndBackdropClick() {
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
          onCancel();
        }
      };

      dialog.addEventListener("click", handleBackdropClick);

      return () => {
        dialog.removeEventListener("click", handleBackdropClick);
      };
    },
    [onCancel]
  );

  const confirmButtonClasses = {
    danger:
      "bg-red-600 hover:bg-red-700 focus:ring-red-500 dark:focus:ring-offset-gray-800",
    primary:
      "bg-primary hover:bg-primary/90 focus:ring-primary dark:focus:ring-offset-gray-800",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <dialog
          ref={dialogRef}
          className="backdrop:bg-gray-500/20 backdrop:backdrop-blur-sm p-0 rounded-lg shadow-xl border border-border bg-card max-w-md fixed top-1/2 inset-x-4 mx-auto transform -translate-y-1/2"
          onCancel={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="p-6"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                {title}
              </h3>
              <p className="text-muted-foreground">{message}</p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-muted-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                {cancelText}
              </button>
              <button
                ref={confirmButtonRef}
                onClick={onConfirm}
                className={`px-4 py-2 text-white rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmButtonClasses[confirmVariant]}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </dialog>
      )}
    </AnimatePresence>
  );
}
