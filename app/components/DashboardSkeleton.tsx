import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* Logo/Title */}
            <div className="flex items-center">
              <Skeleton width={180} height={32} className="sm:w-[200px]" />
            </div>

            {/* User info and sign out button */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* User avatar and name */}
              <div className="flex items-center space-x-2">
                <Skeleton width={32} height={32} circle />
                <Skeleton width={100} height={16} className="hidden sm:block" />
                <Skeleton width={80} height={16} className="sm:hidden" />
              </div>
              {/* Sign out button */}
              <Skeleton width={80} height={32} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* My Tasks Section */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              {/* Section header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-2 sm:space-y-0">
                <Skeleton width={100} height={24} />
                <div className="flex items-center space-x-4">
                  <Skeleton width={140} height={16} />
                  <Skeleton width={60} height={16} />
                </div>
              </div>

              {/* Add Task Form */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Skeleton height={40} className="flex-1" />
                  <Skeleton width={80} height={40} />
                </div>
              </div>

              {/* Task Items */}
              <div className="space-y-3">
                {/* Active Tasks Section */}
                <div className="mb-4">
                  <Skeleton width={120} height={16} className="mb-2" />
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={`active-${i}`}
                      className="flex items-center space-x-2 mb-3"
                    >
                      <div className="flex-1 flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <Skeleton width="60%" height={20} />
                        <div className="flex items-center space-x-2">
                          <Skeleton width={40} height={40} circle />
                          <Skeleton width={40} height={40} circle />
                        </div>
                      </div>
                      <Skeleton width={60} height={40} />
                    </div>
                  ))}
                </div>

                {/* Visual Separator */}
                <div className="border-t border-gray-300 my-4"></div>

                {/* Master Tasks Section */}
                <div>
                  <Skeleton width={140} height={16} className="mb-2" />
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={`master-${i}`}
                      className="flex items-center space-x-2 mb-3"
                    >
                      <div className="flex-1 flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <Skeleton width="70%" height={20} />
                        <div className="flex items-center space-x-2">
                          <Skeleton width={40} height={40} circle />
                        </div>
                      </div>
                      <Skeleton width={60} height={40} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Partner Section */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              {/* Section header */}
              <Skeleton width={100} height={24} className="mb-6" />

              <div className="space-y-4">
                {/* Partner info card */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Skeleton width="80%" height={20} className="mb-2" />
                  <Skeleton width="60%" height={16} className="mb-2" />
                  <Skeleton width={60} height={16} />
                </div>

                {/* Partner's weekly info */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Skeleton width="70%" height={16} />
                </div>

                {/* Partner's tasks */}
                <div>
                  <Skeleton width={160} height={20} className="mb-3" />
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={`partner-${i}`}
                        className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg"
                      >
                        <Skeleton width={20} height={20} circle />
                        <Skeleton width="80%" height={16} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
