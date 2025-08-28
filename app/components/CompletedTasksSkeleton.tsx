import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export function CompletedTasksSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* Back button and title */}
            <div className="flex items-center space-x-4">
              <Skeleton width={140} height={24} />
              <Skeleton width={180} height={32} />
            </div>

            {/* User info */}
            <div className="flex items-center space-x-2">
              <Skeleton width={32} height={32} circle />
              <Skeleton width={120} height={16} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            {/* Section header */}
            <div className="flex items-center justify-between mb-6">
              <Skeleton width={160} height={24} />
            </div>

            {/* Completed Tasks List */}
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
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
          </div>
        </div>
      </main>
    </div>
  );
}
