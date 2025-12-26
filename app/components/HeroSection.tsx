"use client";

import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useSession } from "@/lib/auth-client";

export function HeroSection() {
  const { data: session, isPending } = useSession();

  return (
    <div className="text-center">
      <h1 className="text-4xl font-extrabold text-card-foreground sm:text-5xl md:text-6xl">
        <span className="block">Better Do It</span>
        <span className="block text-primary">Together</span>
      </h1>
      <p className="mt-3 max-w-md mx-auto text-base text-muted-foreground sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
        Encouraging accountability by sharing progress among friends.
      </p>

      <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
        {isPending ? (
          <div className="rounded-md shadow w-full">
            <Skeleton
              height={54}
              className="rounded-md md:h-[56px]"
              containerClassName="w-full"
            />
          </div>
        ) : !session ? (
          <div className="rounded-md shadow">
            <Link
              href="/auth"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 md:py-4 md:text-lg md:px-10"
            >
              Get Started
            </Link>
          </div>
        ) : (
          <div className="rounded-md shadow">
            <Link
              href="/dashboard"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 md:py-4 md:text-lg md:px-10"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
