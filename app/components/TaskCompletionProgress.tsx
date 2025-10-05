"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { RotateCcw } from "lucide-react";

interface TaskCompletionProgressProps {
  taskId: string;
  taskTitle: string;
  onUndo: (taskId: string) => void;
  onComplete: (taskId: string) => void;
}

export function TaskCompletionProgress({
  taskId,
  taskTitle,
  onUndo,
  onComplete,
}: TaskCompletionProgressProps) {
  const [progress, setProgress] = useState(100);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(
    function startProgressAnimation() {
      // Start the progress bar animation
      const startTime = Date.now();
      const duration = 4000; // 4 seconds
      let animationId: number;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.max(0, 100 - (elapsed / duration) * 100);

        setProgress(newProgress);

        if (newProgress > 0 && isAnimating) {
          animationId = requestAnimationFrame(animate);
        } else if (newProgress <= 0 && isAnimating) {
          // Animation complete - mark as completed
          setIsAnimating(false);
          onComplete(taskId);
        }
      };

      animationId = requestAnimationFrame(animate);

      // Cleanup function to cancel animation if component unmounts or isAnimating becomes false
      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
    },
    [taskId, onComplete, isAnimating]
  );

  const handleProgressClick = () => {
    // User clicked the progress bar - undo the completion
    setIsAnimating(false);
    onUndo(taskId);
  };

  return (
    <motion.div
      initial={{ opacity: 0.7 }}
      animate={{ opacity: isAnimating ? 0.7 : 1 }}
      className="flex items-stretch space-x-2"
    >
      <div className="flex-1 flex items-center justify-between p-3 border border-primary/30 rounded-lg bg-primary/10 relative overflow-hidden">
        {/* Task title with reduced opacity */}
        <div className="min-w-0 flex-1 text-gray-500 line-through px-2 py-1 rounded">
          {taskTitle}
        </div>

        {/* Progress bar overlay */}
        {isAnimating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-full h-full bg-green-100 flex items-center justify-center cursor-pointer"
              onClick={handleProgressClick}
              title="Click to undo completion"
            >
              <div className="flex items-center w-full px-4">
                <div className="flex-1 bg-green-200 rounded-full h-2 relative overflow-hidden mr-4">
                  <motion.div
                    className="h-full bg-green-500 rounded-full"
                    initial={{ width: "100%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1, ease: "linear" }}
                  />
                </div>
                <button
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors duration-200 flex items-center space-x-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProgressClick();
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Click to undo</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons - hidden during animation */}
        {!isAnimating && (
          <div className="flex items-center space-x-2 ml-4 relative z-10">
            <div className="flex items-center space-x-3">
              <span className="text-green-600 text-lg">✓</span>
              <span className="text-sm text-gray-500">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
