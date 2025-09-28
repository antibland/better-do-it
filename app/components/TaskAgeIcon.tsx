import { Flame, Clock, Skull } from "lucide-react";
import { getTaskAge, TaskAgeInfo } from "@/lib/task-age";

interface TaskAgeIconProps {
  addedToActiveAt: string | null;
  createdAt?: string;
  className?: string;
}

export function TaskAgeIcon({
  addedToActiveAt,
  createdAt,
  className = "",
}: TaskAgeIconProps) {
  const dateToUse = addedToActiveAt || createdAt || null;
  const ageInfo: TaskAgeInfo = getTaskAge(dateToUse);

  if (!dateToUse) {
    return null;
  }

  const iconProps = {
    className: `w-4 h-4 ${ageInfo.color} ${className}`,
    "aria-label": `Task is ${ageInfo.daysOld} days old`,
    title: `Task is ${ageInfo.daysOld} days old`,
  };

  switch (ageInfo.category) {
    case "fresh":
      return <Flame {...iconProps} />;
    case "aging":
      return <Clock {...iconProps} />;
    case "stale":
      return <Skull {...iconProps} />;
    default:
      return null;
  }
}
