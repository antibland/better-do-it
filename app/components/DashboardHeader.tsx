import { useSession } from "@/lib/auth-client";
import Image from "next/image";

interface DashboardHeaderProps {
  onSignOut: () => void;
}

export function DashboardHeader({ onSignOut }: DashboardHeaderProps) {
  const { data: session } = useSession();
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold text-gray-900">Better Do It</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {session?.user.image && (
                <Image
                  className="h-8 w-8 rounded-full"
                  src={session.user.image}
                  alt={session.user.name || "User avatar"}
                  width={32}
                  height={32}
                />
              )}
            </div>
            <button
              onClick={onSignOut}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
