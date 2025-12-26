"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { HomeHeader } from "@/app/components/HomeHeader";
import { HeroSection } from "@/app/components/HeroSection";
import { FeaturesSection } from "@/app/components/FeaturesSection";

export default function Home() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-secondary/40 dark:from-background dark:via-background dark:to-secondary/40">
      <HomeHeader onSignOut={handleSignOut} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <HeroSection />
        <FeaturesSection />
      </main>
    </div>
  );
}
