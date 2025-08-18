export async function GET() {
  // Return the exact structure the frontend expects
  const testResponse = {
    tasks: [
      {
        id: "test-1",
        userId: "test-user",
        title: "Test Task 1",
        isCompleted: 0,
        isActive: 1,
        createdAt: new Date().toISOString(),
        completedAt: null,
        addedToActiveAt: new Date().toISOString(),
      }
    ],
    activeTasks: [
      {
        id: "test-1",
        userId: "test-user",
        title: "Test Task 1",
        isCompleted: 0,
        isActive: 1,
        createdAt: new Date().toISOString(),
        completedAt: null,
        addedToActiveAt: new Date().toISOString(),
      }
    ],
    masterTasks: [],
    openActiveTasks: [
      {
        id: "test-1",
        userId: "test-user",
        title: "Test Task 1",
        isCompleted: 0,
        isActive: 1,
        createdAt: new Date().toISOString(),
        completedAt: null,
        addedToActiveAt: new Date().toISOString(),
      }
    ],
    completedThisWeek: 0,
    needsTopOff: false,
  };

  return Response.json(testResponse);
}
