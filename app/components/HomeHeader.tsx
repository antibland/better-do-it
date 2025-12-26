"use client";

import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useSession, signOut } from "@/lib/auth-client";

interface HomeHeaderProps {
  onSignOut: () => void;
}

export function HomeHeader({ onSignOut }: HomeHeaderProps) {
  const { data: session, isPending } = useSession();

  return (
    <header className="bg-card">
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
              <Skeleton width={80} height={38} />
            ) : session ? (
              <button
                onClick={onSignOut}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
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
  );
}
