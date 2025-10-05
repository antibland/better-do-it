export type TaskAgeCategory = "fresh" | "aging" | "stale";

export interface TaskAgeInfo {
  daysOld: number;
  category: TaskAgeCategory;
  iconName: string;
  color: string;
}

export function getTaskAge(addedToActiveAt: string | null): TaskAgeInfo {
  if (!addedToActiveAt) {
    return {
      daysOld: 0,
      category: "fresh",
      iconName: "flame",
      color: "text-fresh", // Uses theme color defined in globals.css
    };
  }

  const addedDate = new Date(addedToActiveAt);
  const now = new Date();
  const diffTime = now.getTime() - addedDate.getTime();
  const daysOld = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (daysOld <= 7) {
    return {
      daysOld,
      category: "fresh",
      iconName: "flame",
      color: "text-fresh", // Uses theme color defined in globals.css
    };
  } else if (daysOld <= 15) {
    return {
      daysOld,
      category: "aging",
      iconName: "clock",
      color: "text-aging", // Uses theme color defined in globals.css
    };
  } else {
    return {
      daysOld,
      category: "stale",
      iconName: "skull",
      color: "text-stale", // Uses theme color defined in globals.css
    };
  }
}
