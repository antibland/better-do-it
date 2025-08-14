"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth");
    }
  }, [session, isPending, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to auth page
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Better Do It</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {session.user.image && (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={session.user.image}
                    alt={session.user.name || "User avatar"}
                  />
                )}
                <span className="text-gray-700">
                  Welcome, {session.user.name || session.user.email}!
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                🎉 Authentication Success!
              </h2>
              <p className="text-gray-600 mb-6">
                You've successfully signed in to Better Do It. This is where
                we'll build the collaborative todo app features.
              </p>

              <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
                <h3 className="text-lg font-semibold mb-3">Your Profile</h3>
                <div className="space-y-2 text-left">
                  <p>
                    <strong>Email:</strong> {session.user.email}
                  </p>
                  <p>
                    <strong>Name:</strong> {session.user.name || "Not provided"}
                  </p>
                  <p>
                    <strong>Role:</strong>{" "}
                    {(session.user as any).role || "user"}
                  </p>
                  <p>
                    <strong>User ID:</strong> {session.user.id}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-3">Coming Next</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div className="bg-white rounded-lg shadow p-4">
                    <h4 className="font-medium text-indigo-600">
                      📝 Todo Management
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Create, edit, and manage your todos
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h4 className="font-medium text-indigo-600">
                      👥 Partner Collaboration
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Share and collaborate on todos with your partner
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h4 className="font-medium text-indigo-600">
                      📊 Progress Tracking
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Track completion and progress together
                    </p>
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
