"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";

export default function Home() {
  const { data: session, isPending } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/40 dark:from-background dark:via-background dark:to-secondary/40">
      {/* Header */}
      <header className="bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link
                href="/"
                className="text-3xl font-bold text-card-foreground hover:text-primary transition-colors duration-200"
              >
                Better Do It
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {isPending ? (
                <div className="animate-pulse bg-muted h-8 w-16 rounded"></div>
              ) : session ? (
                <Link
                  href="/dashboard"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/auth"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-card-foreground sm:text-5xl md:text-6xl">
            <span className="block">Better Do It</span>
            <span className="block text-primary">Together</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-muted-foreground sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Encouraging accountability by sharing progress among friends.
          </p>

          {!isPending && !session && (
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <Link
                  href="/auth"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 md:py-4 md:text-lg md:px-10"
                >
                  Get Started
                </Link>
              </div>
            </div>
          )}

          {session && (
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 md:py-4 md:text-lg md:px-10"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-16">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="pt-6">
              <div className="flow-root bg-card rounded-lg px-6 pb-8 shadow-lg">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-secondary rounded-md shadow-lg">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-card-foreground tracking-tight">
                    Shared Todo Lists
                  </h3>
                  <p className="mt-5 text-base text-muted-foreground">
                    Create and share todo lists with your partner. See updates
                    in real-time as you both work toward your goals.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <div className="flow-root bg-card rounded-lg px-6 pb-8 shadow-lg">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-secondary rounded-md shadow-lg">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-card-foreground tracking-tight">
                    Partner Collaboration
                  </h3>
                  <p className="mt-5 text-base text-muted-foreground">
                    Work together seamlessly. Assign tasks, add comments, and
                    celebrate completions together.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <div className="flow-root bg-card rounded-lg px-6 pb-8 shadow-lg">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-secondary rounded-md shadow-lg">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-card-foreground tracking-tight">
                    Progress Tracking
                  </h3>
                  <p className="mt-5 text-base text-muted-foreground">
                    Track your progress together with visual charts and
                    completion statistics. Stay motivated as a team.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
